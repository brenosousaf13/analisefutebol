// Datas da agenda como texto "AAAA-MM-DD", sempre no calendário de Brasília.
// Todas as contas usam UTC só como régua de dias: sem horário no meio, o fuso
// do navegador não consegue empurrar a data para o dia anterior ou seguinte.

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const WEEKDAYS_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
    const match = ISO.exec(value);
    if (!match) return false;
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function parts(iso: string): { y: number; m: number; d: number } {
    const match = ISO.exec(iso);
    if (!match) throw new Error(`Data inválida: ${iso}`);
    return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function toIso(y: number, m: number, d: number): string {
    return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

/** Dia de hoje em Brasília, no formato AAAA-MM-DD. */
export function todayInBrasilia(now: number = Date.now()): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(now)); // en-CA já formata como AAAA-MM-DD
}

export function addDays(iso: string, days: number): string {
    const { y, m, d } = parts(iso);
    return toIso(y, m, d + days);
}

/** Soma meses mantendo o dia; 31/08 menos 6 meses vira 28/02 (ou 29), não 03/03. */
export function addMonths(iso: string, months: number): string {
    const { y, m, d } = parts(iso);
    const index = y * 12 + (m - 1) + months;
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return toIso(year, month, Math.min(d, lastDay));
}

/** "Hoje" ou "ter, 03/11" — o texto que fica entre as setas. */
export function formatNavLabel(iso: string, today: string): string {
    if (iso === today) return 'Hoje';
    const { y, m, d } = parts(iso);
    const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return `${weekday}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

/** "terça-feira, 3 de novembro de 2026" */
export function formatLongDate(iso: string): string {
    const { y, m, d } = parts(iso);
    const weekday = WEEKDAYS_LONG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
    return `${weekday}, ${d} de ${MONTHS[m - 1]} de ${y}`;
}

/** "09/11" — para mensagens curtas. */
export function formatDayMonth(iso: string): string {
    const { m, d } = parts(iso);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}

export function monthTitle(year: number, month: number): string {
    return `${MONTHS[month - 1]} de ${year}`;
}

export function monthOf(iso: string): { year: number; month: number } {
    const { y, m } = parts(iso);
    return { year: y, month: m };
}

/** Soma meses a um mês (1–12), virando o ano quando preciso. */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
    const index = year * 12 + (month - 1) + delta;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function firstDayOfMonth(year: number, month: number): string {
    return toIso(year, month, 1);
}

export function lastDayOfMonth(year: number, month: number): string {
    return toIso(year, month + 1, 0);
}

/**
 * Células de um mês, começando no domingo: `null` completa a primeira semana.
 * Devolve só o necessário (sem linha final vazia).
 */
export function monthCells(year: number, month: number): (string | null)[] {
    const lead = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
    const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= total; day++) cells.push(toIso(year, month, day));
    return cells;
}

export interface AgendaBounds {
    /** Limite das setas: hoje menos 7 dias. */
    arrowMin: string;
    /** Limite do calendário: 6 meses atrás. */
    calendarMin: string;
    /** A agenda não avança além de hoje. */
    max: string;
}

/** Quanto o usuário pode recuar na tela inicial. */
export const AGENDA_DAYS_BACK = 7;
export const AGENDA_MONTHS_BACK = 6;

export function agendaBounds(today: string): AgendaBounds {
    return {
        arrowMin: addDays(today, -AGENDA_DAYS_BACK),
        calendarMin: addMonths(today, -AGENDA_MONTHS_BACK),
        max: today,
    };
}

export function clampDate(iso: string, min: string, max: string): string {
    return iso < min ? min : iso > max ? max : iso;
}
