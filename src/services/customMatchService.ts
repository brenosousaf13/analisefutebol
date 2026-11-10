import { analysisService } from './analysisService';
import { apiFootballService } from './apiFootballService';
import { squadToBench } from '../utils/squadToBench';
import type { TeamOption } from '../types/teamOption';

export interface CustomMatchInput {
    home: TeamOption;
    away: TeamOption;
    /** Nome da competição (da lista acompanhada ou digitado). */
    competition: string;
    /** AAAA-MM-DD */
    date: string;
    /** HH:MM, opcional. */
    time?: string;
}

export interface CustomMatchResult {
    analysisId: string;
    /** Times cujo elenco a API não devolveu — a análise nasce com reservas vazios para eles. */
    missingSquads: string[];
}

/**
 * Cria uma análise a partir de dois times escolhidos à mão: o campo começa VAZIO
 * (nenhum titular) e o elenco completo de cada time fica na lista de reservas,
 * de onde o usuário escolhe os titulares.
 */
export async function createAnalysisFromTeams(input: CustomMatchInput): Promise<CustomMatchResult> {
    const { home, away } = input;
    // Uma falha em um elenco não derruba a criação: o usuário ainda consegue montar o time à mão.
    const [homeSquad, awaySquad] = await Promise.all([
        apiFootballService.getSquad(home.id).catch(() => []),
        apiFootballService.getSquad(away.id).catch(() => []),
    ]);

    const analysisId = await analysisService.createBlankAnalysis('analise_completa', {
        titulo: `${home.name} vs ${away.name}`,
        matchId: null,
        matchDate: input.date,
        matchTime: input.time || undefined,
        competition: input.competition,
        homeTeam: home.name,
        awayTeam: away.name,
        homeTeamLogo: home.logo,
        awayTeamLogo: away.logo,
        homeScore: 0,
        awayScore: 0,
        homePlayersDef: [],
        homePlayersOff: [],
        awayPlayersDef: [],
        awayPlayersOff: [],
        homeSubstitutes: squadToBench(homeSquad, true),
        awaySubstitutes: squadToBench(awaySquad, false),
    });

    return {
        analysisId,
        missingSquads: [
            ...(homeSquad.length === 0 ? [home.name] : []),
            ...(awaySquad.length === 0 ? [away.name] : []),
        ],
    };
}
