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
    constructor(message: string, retryAt?: number) { super(message); this.retryAt = retryAt; }
}

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
    let storage = options.storage;
    try { storage ??= typeof localStorage === 'undefined' ? undefined : localStorage; } catch { /* storage bloqueado */ }
    let budget: Budget = { limit: 10, remaining: 10, resetAt: now() + WINDOW_MS, dayResetAt: 0 };
    let tail: Promise<unknown> = Promise.resolve();

    const save = () => {
        try { storage?.setItem(BUDGET_KEY, JSON.stringify(budget)); } catch { /* storage indisponível */ }
    };
    const read = () => {
        try {
            const saved = JSON.parse(storage?.getItem(BUDGET_KEY) ?? 'null') as Budget | null;
            if (saved && Number.isFinite(saved.limit) && saved.limit > 0
                && Number.isFinite(saved.remaining) && saved.remaining >= 0
                && saved.resetAt > now() && saved.resetAt <= now() + 3 * WINDOW_MS) {
                budget = saved;
            } else if (saved?.dayResetAt && saved.dayResetAt > now()) {
                budget.dayResetAt = saved.dayResetAt;
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
            const midnight = new Date(now());
            midnight.setUTCHours(24, 0, 0, 0);
            budget.dayResetAt = midnight.getTime();
        }
        save();
    };
    const cancelled = () => new DOMException('Consulta cancelada', 'AbortError');

    return {
        run<T extends ApiResponse>(task: () => Promise<T>, isCancelled: () => boolean = () => false): Promise<T> {
            const execute = async () => {
                for (let attempt = 0; ; attempt++) {
                    if (isCancelled()) throw cancelled();
                    read();
                    if (budget.dayResetAt > now()) {
                        throw new FootballApiError('Limite diário de consultas atingido.', budget.dayResetAt);
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
                            if (Object.keys(body.errors).some(key => key.toLowerCase() === 'ratelimit')) {
                                throw { response: { ...response, status: 429 } };
                            }
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
