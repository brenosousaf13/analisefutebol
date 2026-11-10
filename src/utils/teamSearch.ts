import type { TeamOption } from '../types/teamOption';

/** Minúsculas, sem acento nem pontuação: "Atlético-MG" vira "atletico mg". */
export function normalizeTeamText(text: string): string {
    return text
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

/** A API guarda os nomes das seleções em inglês; quem digita "Brasil" quer "Brazil". */
const COUNTRY_ALIASES: Record<string, string> = {
    brasil: 'brazil', alemanha: 'germany', franca: 'france', espanha: 'spain', inglaterra: 'england',
    italia: 'italy', holanda: 'netherlands', 'paises baixos': 'netherlands', belgica: 'belgium',
    croacia: 'croatia', suica: 'switzerland', dinamarca: 'denmark', japao: 'japan',
    'coreia do sul': 'south korea', 'estados unidos': 'usa', eua: 'usa', uruguai: 'uruguay',
    paraguai: 'paraguay', equador: 'ecuador', marrocos: 'morocco', egito: 'egypt',
    camaroes: 'cameroon', 'arabia saudita': 'saudi arabia', ira: 'iran', polonia: 'poland',
    suecia: 'sweden', noruega: 'norway', escocia: 'scotland', 'pais de gales': 'wales',
    irlanda: 'ireland', turquia: 'turkey', grecia: 'greece', servia: 'serbia', ucrania: 'ukraine',
    'republica tcheca': 'czech republic', hungria: 'hungary', romenia: 'romania',
    'africa do sul': 'south africa', argelia: 'algeria', 'costa do marfim': 'ivory coast',
    peru: 'peru', chile: 'chile', colombia: 'colombia', mexico: 'mexico',
};

/** Termos extras a pesquisar quando o texto digitado é exatamente o nome de um país em português. */
export function teamSearchAliases(normalizedTerm: string): string[] {
    const alias = COUNTRY_ALIASES[normalizedTerm];
    return alias && alias !== normalizedTerm ? [alias] : [];
}

/** O nome do time contém todo o termo (ambos já normalizados). */
export function teamNameMatches(team: TeamOption, normalizedTerm: string): boolean {
    return normalizeTeamText(team.name).includes(normalizedTerm);
}

/** Categorias de base, times femininos e reservas: valem menos que o time principal. */
const SECONDARY_TEAM = /\b(u\d{2}|w|women|ii|iii|b|reserves?|youth)$/;

/** Países que o público do Zona 14 mais procura: ganham no empate. */
const PRIORITY_COUNTRIES = ['Brazil', 'Argentina', 'England', 'Spain', 'Italy', 'Germany', 'France', 'Portugal'];

/**
 * Começa com o termo → palavra começa com o termo → o resto. No empate: time principal antes
 * de base/feminino, depois país prioritário, depois nome mais curto.
 */
export function rankTeams(teams: TeamOption[], normalizedTerm: string): TeamOption[] {
    const priority = (team: TeamOption) => {
        const index = PRIORITY_COUNTRIES.indexOf(team.country);
        return index === -1 ? PRIORITY_COUNTRIES.length : index;
    };
    const score = (team: TeamOption) => {
        const name = normalizeTeamText(team.name);
        if (name.startsWith(normalizedTerm)) return 0;
        if (name.split(' ').some(word => word.startsWith(normalizedTerm))) return 1;
        return 2;
    };
    const secondary = (team: TeamOption) => (SECONDARY_TEAM.test(normalizeTeamText(team.name)) ? 1 : 0);
    return [...teams].sort((a, b) =>
        score(a) - score(b)
        || secondary(a) - secondary(b)
        || priority(a) - priority(b)
        || a.name.length - b.name.length
        || a.name.localeCompare(b.name, 'pt-BR'));
}
