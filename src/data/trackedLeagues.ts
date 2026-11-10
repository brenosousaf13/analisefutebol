// Competições acompanhadas na tela inicial — vieram da planilha "ligas zona 14.xlsx" (Lucas, 11/2026).
// Os IDs são os da API-Football (que separa, por exemplo, as Eliminatórias da Copa em uma
// competição por confederação). A ORDEM daqui é a ordem em que os campeonatos aparecem na tela.
//
// Depois, a tela de configuração vai deixar o usuário adicionar e remover competições; este
// arquivo é o ponto único a trocar (o resto do app lê daqui).

export interface TrackedLeague {
    /** ID da competição na API-Football. */
    id: number;
    /** Nome em português, usado na tela e gravado como "campeonato" da análise. */
    name: string;
    /** Rótulo do grupo no seletor de competição. */
    group: string;
}

export const TRACKED_LEAGUES: readonly TrackedLeague[] = [
    { id: 71, name: 'Brasileirão Série A', group: 'Brasil' },
    { id: 72, name: 'Brasileirão Série B', group: 'Brasil' },
    { id: 73, name: 'Copa do Brasil', group: 'Brasil' },

    { id: 13, name: 'Copa Libertadores', group: 'CONMEBOL' },
    { id: 11, name: 'Copa Sul-Americana', group: 'CONMEBOL' },
    { id: 541, name: 'Recopa Sul-Americana', group: 'CONMEBOL' },

    { id: 2, name: 'UEFA Champions League', group: 'UEFA' },
    { id: 3, name: 'UEFA Europa League', group: 'UEFA' },
    { id: 848, name: 'UEFA Conference League', group: 'UEFA' },
    { id: 531, name: 'Supercopa da UEFA', group: 'UEFA' },

    { id: 15, name: 'Copa do Mundo de Clubes', group: 'FIFA' },

    { id: 39, name: 'Premier League', group: 'Inglaterra' },
    { id: 45, name: 'FA Cup', group: 'Inglaterra' },
    { id: 48, name: 'EFL Cup', group: 'Inglaterra' },

    { id: 140, name: 'La Liga', group: 'Espanha' },
    { id: 143, name: 'Copa del Rey', group: 'Espanha' },

    { id: 135, name: 'Serie A', group: 'Itália' },
    { id: 137, name: 'Coppa Italia', group: 'Itália' },

    { id: 78, name: 'Bundesliga', group: 'Alemanha' },
    { id: 81, name: 'DFB-Pokal', group: 'Alemanha' },

    { id: 61, name: 'Ligue 1', group: 'França' },
    { id: 66, name: 'Coupe de France', group: 'França' },

    { id: 128, name: 'Primera División (Liga Profesional)', group: 'Argentina' },
    { id: 130, name: 'Copa Argentina', group: 'Argentina' },

    { id: 1, name: 'Copa do Mundo', group: 'Seleções' },
    { id: 34, name: 'Eliminatórias da Copa — América do Sul', group: 'Seleções' },
    { id: 32, name: 'Eliminatórias da Copa — Europa', group: 'Seleções' },
    { id: 29, name: 'Eliminatórias da Copa — África', group: 'Seleções' },
    { id: 30, name: 'Eliminatórias da Copa — Ásia', group: 'Seleções' },
    { id: 31, name: 'Eliminatórias da Copa — CONCACAF', group: 'Seleções' },
    { id: 33, name: 'Eliminatórias da Copa — Oceania', group: 'Seleções' },
    { id: 37, name: 'Eliminatórias da Copa — Repescagem intercontinental', group: 'Seleções' },
    { id: 10, name: 'Amistosos internacionais de seleções', group: 'Seleções' },
    { id: 4, name: 'Eurocopa', group: 'Seleções' },
    { id: 5, name: 'Liga das Nações da UEFA', group: 'Seleções' },
    { id: 9, name: 'Copa América', group: 'Seleções' },
    { id: 22, name: 'Copa Ouro da CONCACAF', group: 'Seleções' },
    { id: 6, name: 'Copa Africana de Nações', group: 'Seleções' },
    { id: 7, name: 'Copa da Ásia', group: 'Seleções' },
    { id: 806, name: 'Copa das Nações da Oceania', group: 'Seleções' },
    { id: 913, name: 'Finalíssima (CONMEBOL x UEFA)', group: 'Seleções' },
];

export const TRACKED_LEAGUE_IDS: ReadonlySet<number> = new Set(TRACKED_LEAGUES.map(league => league.id));
