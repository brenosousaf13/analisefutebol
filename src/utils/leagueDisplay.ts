import type { ApiFixture } from '../types/api-football';
import { TRACKED_LEAGUES } from '../data/trackedLeagues.ts';

/**
 * Nome em português e ordem das competições vêm de TRACKED_LEAGUES. (A API chama o Brasileirão
 * de "Serie A", igual à Itália; aqui ele vira "Brasileirão Série A".) Competições fora da lista
 * mantêm o nome da API e vão depois das acompanhadas.
 */
const LEAGUE_NAMES = new Map<number, string>(TRACKED_LEAGUES.map(league => [league.id, league.name]));
const LEAGUE_ORDER = TRACKED_LEAGUES.map(league => league.id);

const COUNTRIES: Record<string, string> = {
    Brazil: 'Brasil', England: 'Inglaterra', Spain: 'Espanha', Italy: 'Itália', Germany: 'Alemanha',
    France: 'França', Portugal: 'Portugal', Netherlands: 'Países Baixos', Belgium: 'Bélgica', Turkey: 'Turquia',
    Argentina: 'Argentina', 'Saudi-Arabia': 'Arábia Saudita', USA: 'EUA', Mexico: 'México', Russia: 'Rússia',
    Ukraine: 'Ucrânia', Colombia: 'Colômbia', Chile: 'Chile', Uruguay: 'Uruguai', Ecuador: 'Equador',
    Paraguay: 'Paraguai', Peru: 'Peru', Austria: 'Áustria', World: 'Internacional',
};

const KNOCKOUT_ROUNDS: Record<string, string> = {
    'Round of 32': '16 avos de final',
    'Round of 16': 'Oitavas de final',
    'Quarter-finals': 'Quartas de final',
    'Semi-finals': 'Semifinais',
    Final: 'Final',
    '3rd Place Final': 'Disputa do 3º lugar',
    'Preliminary Round': 'Fase preliminar',
    'Play-offs': 'Playoffs',
};

const PHASES: Record<string, string> = {
    'Regular Season': '',
    'League Stage': 'Fase de liga',
    'Group Stage': 'Fase de grupos',
    'Relegation Group': 'Grupo do rebaixamento',
};

export function leagueDisplayName(league: { id?: number; name: string }): string {
    return (league.id !== undefined && LEAGUE_NAMES.get(league.id)) || league.name;
}

export function leagueOrder(leagueId: number | undefined): number {
    const index = leagueId === undefined ? -1 : LEAGUE_ORDER.indexOf(leagueId);
    return index === -1 ? LEAGUE_ORDER.length : index;
}

export function countryLabel(country?: string): string {
    if (!country) return '';
    return COUNTRIES[country] ?? country.replace(/-/g, ' ');
}

/** "Regular Season - 34" → "Rodada 34"; fases de mata-mata também são traduzidas. */
export function roundLabel(round?: string): string | undefined {
    const text = round?.trim();
    if (!text) return undefined;
    if (KNOCKOUT_ROUNDS[text]) return KNOCKOUT_ROUNDS[text];
    // Fases iniciais das copas nacionais: "1/128-finals" → "1/128 de final".
    const fraction = /^1\/(\d+)-finals$/.exec(text);
    if (fraction) return `1/${fraction[1]} de final`;
    const numbered = /^(.+?)\s+-\s+(\d+)$/.exec(text);
    if (numbered) {
        const phase = numbered[1] in PHASES ? PHASES[numbered[1]] : numbered[1];
        return phase ? `${phase} · Rodada ${numbered[2]}` : `Rodada ${numbered[2]}`;
    }
    return text;
}

export interface LeagueGroup {
    leagueId: number;
    league: ApiFixture['league'];
    name: string;
    /** "Brasil · Rodada 34" */
    subtitle: string;
    fixtures: ApiFixture[];
}

/** Separa as partidas por campeonato. Dentro de cada um, por horário. */
export function groupFixturesByLeague(fixtures: ApiFixture[]): LeagueGroup[] {
    const byLeague = new Map<number, ApiFixture[]>();
    for (const fixture of fixtures) {
        const id = fixture.league?.id;
        if (id === undefined) continue;
        const list = byLeague.get(id);
        if (list) list.push(fixture); else byLeague.set(id, [fixture]);
    }

    const groups: LeagueGroup[] = [];
    for (const [leagueId, list] of byLeague) {
        const sorted = [...list].sort((a, b) => (a.fixture?.timestamp ?? 0) - (b.fixture?.timestamp ?? 0));
        const league = sorted[0].league;
        const rounds = new Set(sorted.map(f => roundLabel(f.league?.round) ?? ''));
        // Só mostra a rodada quando todos os jogos do grupo são da mesma.
        const round = rounds.size === 1 ? [...rounds][0] : '';
        const subtitle = [countryLabel(league.country), round].filter(Boolean).join(' · ');
        groups.push({ leagueId, league, name: leagueDisplayName(league), subtitle, fixtures: sorted });
    }

    return groups.sort((a, b) =>
        leagueOrder(a.leagueId) - leagueOrder(b.leagueId)
        || (a.fixtures[0].fixture?.timestamp ?? 0) - (b.fixtures[0].fixture?.timestamp ?? 0)
        || a.name.localeCompare(b.name, 'pt-BR'));
}

/** Minúsculas e sem acento: "Atlético" casa com "atletico". */
export function normalizeSearch(text: string): string {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Busca instantânea por time (e, se pedido, por campeonato). Texto vazio casa com tudo. */
export function matchesSearch(fixture: ApiFixture, query: string, includeLeague = false): boolean {
    const needle = normalizeSearch(query);
    if (!needle) return true;
    const haystacks = [fixture.teams?.home?.name, fixture.teams?.away?.name];
    if (includeLeague && fixture.league) {
        haystacks.push(fixture.league.name, leagueDisplayName(fixture.league), countryLabel(fixture.league.country));
    }
    return haystacks.some(text => !!text && normalizeSearch(text).includes(needle));
}
