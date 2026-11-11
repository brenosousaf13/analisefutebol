import { apiFootballService } from './apiFootballService';
import { normalizeTeamText } from '../utils/teamSearch';
import type { ApiCoach, ApiLineup } from '../types/api-football';

interface TeamReference { name: string; logo?: string; id?: number }
interface CoachRequest {
    fixtureId?: number | null;
    date?: string;
    home: TeamReference;
    away: TeamReference;
}

/** Os escudos da API conservam o id da equipe, inclusive nas analises antigas. */
export function teamIdFromLogo(logo?: string): number | undefined {
    const match = logo?.match(/\/football\/teams\/(\d+)\.png(?:[?#]|$)/);
    return match ? Number(match[1]) : undefined;
}

/** Seleciona o tecnico que dirigia esta equipe na data da partida. */
export function coachAtDate(coaches: ApiCoach[], teamId: number, date?: string): string | undefined {
    const day = date?.slice(0, 10);
    const candidates = coaches.flatMap(coach => (coach.career ?? [])
        .filter(job => job.team.id === teamId && (day
            ? job.start <= day && (!job.end || job.end >= day)
            : !job.end))
        .map(job => ({ name: coach.name.trim(), start: job.start })));
    return candidates.sort((a, b) => b.start.localeCompare(a.start)).find(c => c.name)?.name;
}

export async function loadAnalysisCoaches(input: CoachRequest): Promise<{ home?: string; away?: string }> {
    const home = { ...input.home, id: input.home.id ?? teamIdFromLogo(input.home.logo) };
    const away = { ...input.away, id: input.away.id ?? teamIdFromLogo(input.away.logo) };
    let lineups: ApiLineup[] = [];
    if (input.fixtureId) {
        lineups = await apiFootballService.getLineups(input.fixtureId).catch(() => []);
        if (!home.id || !away.id) {
            const fixtures = await apiFootballService.getFixturesByIds([input.fixtureId]).catch(() => new Map());
            const fixture = fixtures.get(input.fixtureId);
            home.id ??= fixture?.teams.home.id;
            away.id ??= fixture?.teams.away.id;
        }
    }
    const resolveCoach = async (team: TeamReference) => {
        // Nunca associar pela ordem: a API pode devolver apenas uma das equipes.
        const lineup = lineups.find(l => team.id
            ? l.team.id === team.id
            : normalizeTeamText(l.team.name) === normalizeTeamText(team.name));
        if (lineup?.coach?.name?.trim()) return lineup.coach.name.trim();
        const id = team.id ?? lineup?.team.id;
        if (!id) return undefined;
        const coaches = await apiFootballService.getTeamCoaches(id).catch(() => []);
        return coachAtDate(coaches, id, input.date);
    };
    const [homeCoach, awayCoach] = await Promise.all([resolveCoach(home), resolveCoach(away)]);
    return { home: homeCoach, away: awayCoach };
}
