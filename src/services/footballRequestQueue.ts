interface ApiResponse {
    data?: unknown;
    headers?: Record<string, unknown>;
    status?: number;
}

interface Budget {
    limit: number;
    remaining: number;
    resetAt: number;
    dayResetAt: number;
}

interface StorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}

export class FootballApiError extends Error {
    readonly retryAt?: number;
    readonly dailyLimit: boolean;
    constructor(message: string, retryAt?: number, dailyLimit = false) {
        super(message);
        this.retryAt = retryAt;
        this.dailyLimit = dailyLimit;
    }
}

/**
 * O plano da API não libera a consulta (ex.: datas antigas no plano gratuito).
 * Quando a API informa o intervalo liberado, ele vem em `from`/`to` (AAAA-MM-DD).
 */
export class FootballPlanError extends FootballApiError {
    readonly from?: string;
    readonly to?: string;
    constructor(message: string, from?: string, to?: string) {
        super(message);
        this.from = from;
        this.to = to;
    }
}

const dayMonth = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Traduz o erro `plan` da API ("...try from 2026-11-09 to 2026-11-11."). */
export function planErrorFromApi(text: string): FootballPlanError {
    const range = /(\d{4}-\d{2}-\d{2})\D+(\d{4}-\d{2}-\d{2})/.exec(text);
    if (range) return planWindowError(range[1], range[2]);
    return new FootballPlanError('O plano atual da API-Football não permite esta consulta.');
}

/** Erro para uma data fora do intervalo que o plano libera. */
export function planWindowError(from: string, to: string): FootballPlanError {
    return new FootballPlanError(
        `O plano atual da API-Football só permite consultar partidas de ${dayMonth(from)} a ${dayMonth(to)}.`,
        from, to,
    );
}

const DAILY_LIMIT_MESSAGE = 'O limite diário de consultas da API de futebol foi atingido. A agenda volta quando a cota renovar, às 21h (Brasília).';

const WINDOW_MS = 61000;
const BUDGET_KEY = 'zona14_football_request_budget_v1';

/** Serializa as chamadas e respeita os limites informados pela API, inclusive entre abas. */
export function createFootballRequestQueue(options: {
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
    storage?: StorageLike;
} = {}) {
    const now = options.now ?? (() => Date.now());
    const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
    const getStorage = (): StorageLike | undefined => {
        if (options.storage) return options.storage;
        try { return typeof localStorage === 'undefined' ? undefined : localStorage; } catch { return undefined; }
    };
    let budget: Budget = { limit: 10, remaining: 10, resetAt: now() + WINDOW_MS, dayResetAt: 0 };
    let tail: Promise<unknown> = Promise.resolve();

    const save = () => {
        try { getStorage()?.setItem(BUDGET_KEY, JSON.stringify(budget)); } catch { /* storage indisponível */ }
    };
    const read = () => {
        try {
            const saved = JSON.parse(getStorage()?.getItem(BUDGET_KEY) ?? 'null') as Budget | null;
            if (saved && Number.isFinite(saved.limit) && saved.limit > 0
                && Number.isFinite(saved.remaining) && saved.remaining >= 0
                && saved.resetAt > now() && saved.resetAt <= now() + 3 * WINDOW_MS) {
                budget = saved;
            } else if (saved?.dayResetAt && saved.dayResetAt > now()) {
                budget.dayResetAt = saved.dayResetAt;
            } else if (getStorage()) {
                budget.dayResetAt = 0;
            }
        } catch { /* cache inválido */ }
        if (now() >= budget.resetAt) {
            budget.remaining = budget.limit;
            budget.resetAt = now() + WINDOW_MS;
        }
    };
    const numberHeader = (response: ApiResponse, key: string): number | undefined => {
        const raw = response.headers?.[key];
        if (raw === undefined || raw === null || raw === '') return undefined;
        const value = Number(raw);
        return Number.isFinite(value) && value >= 0 ? value : undefined;
    };
    const observe = (response: ApiResponse) => {
        const limit = numberHeader(response, 'x-ratelimit-limit');
        const remaining = numberHeader(response, 'x-ratelimit-remaining');
        if (limit && limit !== budget.limit) {
            budget.limit = limit;
            budget.remaining = remaining ?? limit;
        } else if (remaining !== undefined) {
            budget.remaining = Math.min(budget.remaining, remaining);
        }
        if (numberHeader(response, 'x-ratelimit-requests-remaining') === 0) {
            budget.dayResetAt = nextUtcMidnight();
        }
        save();
    };
    const cancelled = () => new DOMException('Consulta cancelada', 'AbortError');
    const nextUtcMidnight = () => {
        const midnight = new Date(now());
        midnight.setUTCHours(24, 0, 0, 0);
        return midnight.getTime();
    };

    return {
        run<T extends ApiResponse>(task: () => Promise<T>, isCancelled: () => boolean = () => false): Promise<T> {
            const execute = async () => {
                for (let attempt = 0; ; attempt++) {
                    if (isCancelled()) throw cancelled();
                    read();
                    if (budget.dayResetAt > now()) {
                        throw new FootballApiError(DAILY_LIMIT_MESSAGE, budget.dayResetAt, true);
                    }
                    if (budget.remaining <= 0) {
                        await sleep(Math.max(1, budget.resetAt - now()));
                        continue;
                    }
                    budget.remaining--;
                    save();
                    try {
                        const response = await task();
                        observe(response);
                        const body = response.data as { errors?: Record<string, unknown> } | undefined;
                        if (body?.errors && Object.keys(body.errors).length > 0) {
                            // A API devolve HTTP 200 com errors.requests quando a cota do dia acabou.
                            if (Object.keys(body.errors).some(key => key.toLowerCase() === 'requests')) {
                                budget.dayResetAt = nextUtcMidnight();
                                save();
                                throw new FootballApiError(DAILY_LIMIT_MESSAGE, budget.dayResetAt, true);
                            }
                            if (Object.keys(body.errors).some(key => key.toLowerCase() === 'ratelimit')) {
                                throw { response: { ...response, status: 429 } };
                            }
                            const planKey = Object.keys(body.errors).find(key => key.toLowerCase() === 'plan');
                            if (planKey) throw planErrorFromApi(String(body.errors[planKey]));
                            throw new FootballApiError('Não foi possível consultar os dados da partida.');
                        }
                        return response;
                    } catch (error) {
                        const response = (error as { response?: ApiResponse })?.response;
                        if (response) observe(response);
                        if (response?.status !== 429) throw error;
                        const retryAfter = numberHeader(response, 'retry-after');
                        budget.remaining = 0;
                        budget.resetAt = now() + (retryAfter === undefined ? WINDOW_MS * Math.min(attempt + 1, 3) : Math.max(1000, retryAfter * 1000));
                        save();
                        if (budget.dayResetAt > now() || attempt >= 2) {
                            throw new FootballApiError('Aguardando liberação da consulta.', Math.max(budget.resetAt, budget.dayResetAt));
                        }
                    }
                }
            };
            const result = tail.then(async (): Promise<T> => {
                if (typeof navigator !== 'undefined' && navigator.locks) {
                    return await navigator.locks.request('zona14_football_api', execute);
                }
                return execute();
            });
            tail = result.catch(() => {});
            return result;
        },
    };
}
