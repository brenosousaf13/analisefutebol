import { analysisService } from './analysisService';
import { apiFootballService } from './apiFootballService';
import { lineupToPlayers, substitutesToPlayers } from '../utils/lineupToPlayers';
import type { ApiFixture } from '../types/api-football';
import type { Player } from '../types/Player';

export interface FixtureAnalysisResult {
    analysisId: string;
    /**
     * false quando a API ainda nao publicou a escalacao (o normal para jogos que
     * so acontecem daqui a dias) — nesse caso a analise nasce com o time padrao.
     */
    usedRealLineups: boolean;
}

function normalizeHex(color?: string): string | undefined {
    if (!color) return undefined;
    const hex = color.startsWith('#') ? color : `#${color}`;
    return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : undefined;
}

/**
 * Cria uma analise ja preenchida com a escalacao real do jogo.
 *
 * Se a escalacao ainda nao estiver disponivel, cria mesmo assim com o time padrao
 * e sinaliza via `usedRealLineups` para a interface avisar o usuario.
 */
export async function createAnalysisFromFixture(fixture: ApiFixture): Promise<FixtureAnalysisResult> {
    const fixtureId = fixture.fixture.id;
    const homeId = fixture.teams.home.id;
    const awayId = fixture.teams.away.id;

    let homeStarters: Player[] = [];
    let awayStarters: Player[] = [];
    let homeSubs: Player[] = [];
    let awaySubs: Player[] = [];
    let homeCoach = '';
    let awayCoach = '';
    let homeColor: string | undefined;
    let awayColor: string | undefined;

    try {
        const lineups = await apiFootballService.getLineups(fixtureId);
        const home = lineups.find(l => l.team?.id === homeId);
        const away = lineups.find(l => l.team?.id === awayId);

        if (home) {
            homeStarters = lineupToPlayers(home);
            homeSubs = substitutesToPlayers(home);
            homeCoach = home.coach?.name ?? '';
            homeColor = normalizeHex(home.team?.colors?.player?.primary);
        }
        if (away) {
            awayStarters = lineupToPlayers(away);
            awaySubs = substitutesToPlayers(away);
            awayCoach = away.coach?.name ?? '';
            awayColor = normalizeHex(away.team?.colors?.player?.primary);
        }
    } catch {
        // Falha de rede ou quota estourada: segue com o time padrao.
    }

    const usedRealLineups = homeStarters.length > 0 && awayStarters.length > 0;

    const kickoff = fixture.fixture.date ? new Date(fixture.fixture.date) : null;

    // Só sobrescreve jogadores quando a escalacao real veio completa; caso contrario
    // deixa o createBlankAnalysis gerar o time padrao.
    const lineupFields = usedRealLineups
        ? {
            homePlayersDef: homeStarters,
            homePlayersOff: homeStarters.map(p => ({ ...p })),
            awayPlayersDef: awayStarters,
            awayPlayersOff: awayStarters.map(p => ({ ...p })),
            homeSubstitutes: homeSubs,
            awaySubstitutes: awaySubs,
        }
        : {};

    const analysisId = await analysisService.createBlankAnalysis('analise_completa', {
        titulo: `${fixture.teams.home.name} vs ${fixture.teams.away.name}`,
        matchId: fixtureId,
        matchDate: kickoff ? kickoff.toISOString().slice(0, 10) : undefined,
        matchTime: kickoff
            ? kickoff.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : undefined,
        competition: fixture.league?.name,
        homeTeam: fixture.teams.home.name,
        awayTeam: fixture.teams.away.name,
        homeTeamLogo: fixture.teams.home.logo,
        awayTeamLogo: fixture.teams.away.logo,
        homeCoach,
        awayCoach,
        ...(homeColor ? { homeTeamColor: homeColor } : {}),
        ...(awayColor ? { awayTeamColor: awayColor } : {}),
        ...lineupFields,
    });

    return { analysisId, usedRealLineups };
}
