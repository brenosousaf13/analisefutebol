import { useEffect, useState } from 'react';
import { apiFootballService } from '../services/apiFootballService';
import type { TeamOption } from '../types/teamOption';
import { normalizeTeamText, teamNameMatches } from '../utils/teamSearch';

const DEBOUNCE_MS = 250;
export const MIN_TEAM_SEARCH_CHARS = 3;

interface Outcome {
    term: string;
    teams: TeamOption[];
    error: boolean;
}

/**
 * Resultados de times enquanto o usuário digita. Espera 250 ms de pausa e só pesquisa com 3+
 * letras; termos já vistos (ou contidos em outro já pesquisado) respondem sem consulta.
 * Enquanto a resposta nova não chega, a lista da busca anterior continua na tela, já filtrada
 * pelo que foi digitado depois — por isso o resultado parece imediato.
 */
export function useTeamSearch(query: string) {
    const term = normalizeTeamText(query);
    const [outcome, setOutcome] = useState<Outcome | null>(null);

    useEffect(() => {
        if (term.length < MIN_TEAM_SEARCH_CHARS) return;
        let cancelled = false;
        const timer = window.setTimeout(() => {
            apiFootballService.searchTeamOptions(term)
                .then(teams => { if (!cancelled) setOutcome({ term, teams, error: false }); })
                .catch(() => { if (!cancelled) setOutcome({ term, teams: [], error: true }); });
        }, DEBOUNCE_MS);
        return () => { cancelled = true; window.clearTimeout(timer); };
    }, [term]);

    const tooShort = term.length < MIN_TEAM_SEARCH_CHARS;
    if (tooShort || outcome === null) return { tooShort, loading: !tooShort, teams: [] as TeamOption[], error: false };
    if (outcome.term === term) return { tooShort, loading: false, teams: outcome.teams, error: outcome.error };
    // Resultado de um termo mais curto ainda serve (filtrado); de qualquer outro, não.
    const usable = !outcome.error && term.startsWith(outcome.term);
    return {
        tooShort,
        loading: true,
        teams: usable ? outcome.teams.filter(team => teamNameMatches(team, term)) : [],
        error: false,
    };
}
