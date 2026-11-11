import type { ApiFixture } from '../types/api-football';
import { FRIENDLY_NATIONS, INTERNATIONAL_FRIENDLIES_ID } from '../data/friendlyNations';
import { TRACKED_LEAGUE_IDS } from '../data/trackedLeagues';
import { normalizeTeamText } from './teamSearch';

const norm = (name: string) => normalizeTeamText(name.replace(/&/g, ' and '));

const NATION_NAMES: ReadonlySet<string> = new Set(
    FRIENDLY_NATIONS.flatMap(nation => nation.apiNames.flatMap(name => [norm(name), norm(name.replace('&', 'and'))])),
);

/** Sufixos da API para equipes que não são a seleção principal: U23, U20, feminina, olímpica… */
const NOT_MAIN_TEAM = /(^|\s)(u\s?\d{2}|w|women|olympic|olympics|olimpica|b|ii|xi)$|\bu\s?\d{2}\b/;

/** Seleção principal: o nome não carrega sufixo de categoria de base, feminino ou olímpico. */
export function isMainNationalTeam(name: string | undefined): boolean {
    if (!name) return false;
    return !NOT_MAIN_TEAM.test(norm(name));
}

export function isFriendlyNation(name: string | undefined): boolean {
    return !!name && NATION_NAMES.has(norm(name));
}

/**
 * Regra de cada jogo na tela inicial. A competição precisa estar na lista acompanhada e,
 * nos amistosos internacionais, as DUAS equipes precisam ser seleções principais e pelo menos
 * UMA delas precisa estar em "paises amistosos.txt".
 */
export function isTrackedFixture(fixture: ApiFixture): boolean {
    const leagueId = fixture.league?.id;
    if (!TRACKED_LEAGUE_IDS.has(leagueId)) return false;
    if (leagueId !== INTERNATIONAL_FRIENDLIES_ID) return true;
    const { home, away } = fixture.teams ?? {};
    if (!isMainNationalTeam(home?.name) || !isMainNationalTeam(away?.name)) return false;
    return isFriendlyNation(home?.name) || isFriendlyNation(away?.name);
}
