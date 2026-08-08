/**
 * Formata data para exibicao, em pt-BR.
 *
 * Cuidado com o caso "YYYY-MM-DD" (colunas DATE do Postgres, como match_date):
 * `new Date('2026-08-05')` e interpretado como meia-noite UTC e, formatado num
 * fuso negativo como o do Brasil, volta um dia — a partida do dia 5 aparecia
 * como dia 4. Por isso a string de data pura e montada como data local.
 *
 * Timestamps completos (created_at, updated_at) seguem o caminho normal, que
 * ja carrega o fuso correto.
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(value: string): Date {
    if (DATE_ONLY.test(value)) {
        const [y, m, d] = value.split('-').map(Number);
        return new Date(y, m - 1, d); // local, sem passar por UTC
    }
    return new Date(value);
}

/** dd/mm/aa — usada nas listas. */
export function formatShortDate(value?: string | null, fallback = '—'): string {
    if (!value) return fallback;
    const d = toDate(value);
    if (Number.isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
