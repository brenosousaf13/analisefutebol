// TheSportsDB service — COPA 2026 feature (easy to remove after tournament)
import type {
  TsdbEvent,
  TsdbLineupPlayer,
  TsdbTimeline,
  TsdbStanding,
  TsdbTeam,
  TsdbPlayer,
  TsdbEventStats,
  TsdbLivescore,
  TsdbTv,
  TsdbHighlight,
  TsdbEquipment,
  TsdbHonour,
  TsdbFormerTeam,
} from '../types/thesportsdb';

const KEY = import.meta.env.VITE_THESPORTSDB_KEY ?? '6452773356';
const V1 = `https://www.thesportsdb.com/api/v1/json/${KEY}`;

const WC_LEAGUE = '4429';
const WC_SEASON = '2026';

// ── Cache helpers ──────────────────────────────────────────────
function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw) as { data: T; ts: number; ttl: number };
    if (Date.now() - ts > ttl) return null;
    return data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now(), ttl: ttlMs }));
  } catch { /* storage full */ }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${V1}/${path}`);
  if (!res.ok) throw new Error(`TSDB ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

const MIN = 60_000;
const HOUR = 60 * MIN;

// ── Service ───────────────────────────────────────────────────
export const theSportsDbService = {

  /** All Copa 2026 fixtures — cached 1 h */
  async getAllFixtures(): Promise<TsdbEvent[]> {
    const ck = `tsdb_wc_fixtures_2026`;
    const cached = getCache<TsdbEvent[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ events: TsdbEvent[] | null }>(
        `eventsseason.php?id=${WC_LEAGUE}&s=${WC_SEASON}`
      );
      const data = json.events ?? [];
      setCache(ck, data, HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getAllFixtures', e);
      return [];
    }
  },

  /** Live Copa 2026 matches — cached 2 min */
  async getLiveFixtures(): Promise<TsdbEvent[]> {
    const ck = `tsdb_wc_live`;
    const cached = getCache<TsdbEvent[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ livescore: TsdbEvent[] | null }>(
        `livescore.php?s=Soccer`
      );
      const all = json.livescore ?? [];
      const wc = all.filter(e => e.idLeague === WC_LEAGUE);
      setCache(ck, wc, 2 * MIN);
      return wc;
    } catch (e) {
      console.error('[TSDB] getLiveFixtures', e);
      return [];
    }
  },

  /** Lineup for a match — cached 6 h (populated only post-kickoff) */
  async getLineup(eventId: string): Promise<TsdbLineupPlayer[]> {
    const ck = `tsdb_lineup_${eventId}`;
    const cached = getCache<TsdbLineupPlayer[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ lineup: TsdbLineupPlayer[] | null }>(
        `lookuplineup.php?id=${eventId}`
      );
      const data = json.lineup ?? [];
      if (data.length > 0) setCache(ck, data, 6 * HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getLineup', e);
      return [];
    }
  },

  /** Match timeline — cached 5 min during live, 1 h after */
  async getTimeline(eventId: string, isLive = false): Promise<TsdbTimeline[]> {
    const ck = `tsdb_timeline_${eventId}`;
    const cached = getCache<TsdbTimeline[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ timeline: TsdbTimeline[] | null }>(
        `lookuptimeline.php?id=${eventId}`
      );
      const data = json.timeline ?? [];
      setCache(ck, data, isLive ? 5 * MIN : HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getTimeline', e);
      return [];
    }
  },

  /** Match statistics as array — cached 5 min live, 1 h after */
  async getEventStats(eventId: string, isLive = false): Promise<TsdbEventStats> {
    const ck = `tsdb_stats_${eventId}`;
    const cached = getCache<TsdbEventStats>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ eventstats: TsdbEventStats | null }>(
        `lookupeventstats.php?id=${eventId}`
      );
      const data = json.eventstats ?? [];
      if (data.length > 0) setCache(ck, data, isLive ? 5 * MIN : HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getEventStats', e);
      return [];
    }
  },

  /** Group standings — cached 30 min */
  async getStandings(): Promise<TsdbStanding[]> {
    const ck = `tsdb_wc_standings_2026`;
    const cached = getCache<TsdbStanding[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ table: TsdbStanding[] | null }>(
        `lookuptable.php?l=${WC_LEAGUE}&s=${WC_SEASON}`
      );
      const data = json.table ?? [];
      setCache(ck, data, 30 * MIN);
      return data;
    } catch (e) {
      console.error('[TSDB] getStandings', e);
      return [];
    }
  },

  /** Past fixtures for any league — for demo or history (no cache) */
  async getLeaguePastFixtures(leagueId: string): Promise<TsdbEvent[]> {
    const ck = `tsdb_past_${leagueId}`;
    const cached = getCache<TsdbEvent[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ events: TsdbEvent[] | null }>(
        `eventspastleague.php?id=${leagueId}`
      );
      const data = json.events ?? [];
      setCache(ck, data, 30 * MIN);
      return data;
    } catch (e) {
      console.error('[TSDB] getLeaguePastFixtures', e);
      return [];
    }
  },

  /** Event by ID — for demo lookups */
  async getEventById(eventId: string): Promise<TsdbEvent | null> {
    try {
      const json = await get<{ events: TsdbEvent[] | null }>(
        `lookupevent.php?id=${eventId}`
      );
      return json.events?.[0] ?? null;
    } catch (e) {
      console.error('[TSDB] getEventById', e);
      return null;
    }
  },

  /** Team details — cached 24 h */
  async getTeam(teamId: string): Promise<TsdbTeam | null> {
    const ck = `tsdb_team_${teamId}`;
    const cached = getCache<TsdbTeam>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ teams: TsdbTeam[] | null }>(
        `lookupteam.php?id=${teamId}`
      );
      const data = json.teams?.[0] ?? null;
      if (data) setCache(ck, data, 24 * HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getTeam', e);
      return null;
    }
  },

  /** Search players by name */
  async searchPlayers(name: string): Promise<TsdbPlayer[]> {
    if (name.length < 3) return [];
    try {
      const json = await get<{ player: TsdbPlayer[] | null }>(
        `searchplayers.php?p=${encodeURIComponent(name)}`
      );
      return json.player ?? [];
    } catch (e) {
      console.error('[TSDB] searchPlayers', e);
      return [];
    }
  },

  /** V2 livescores — cached 2 min */
  async getLivescoresV2(): Promise<TsdbLivescore[]> {
    const ck = `tsdb_v2_live`;
    const cached = getCache<TsdbLivescore[]>(ck);
    if (cached) return cached;
    try {
      const res = await fetch('https://www.thesportsdb.com/api/v2/json/livescore/soccer', {
        headers: { 'X-API-KEY': KEY },
      });
      if (!res.ok) throw new Error(`TSDB V2 ${res.status}`);
      const json = await res.json() as { events?: TsdbLivescore[] | null };
      const all = json.events ?? [];
      const wc = all.filter(e => e.idLeague === WC_LEAGUE);
      setCache(ck, wc, 2 * MIN);
      return wc;
    } catch (e) {
      console.error('[TSDB] getLivescoresV2', e);
      return [];
    }
  },

  /** TV listings for a match — filtered for Brazil, cached 2 h */
  async getTvListings(eventId: string): Promise<TsdbTv[]> {
    const ck = `tsdb_tv_${eventId}`;
    const cached = getCache<TsdbTv[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ tvstation: TsdbTv[] | null }>(`lookuptv.php?id=${eventId}`);
      const all = json.tvstation ?? [];
      const brazil = all.filter(t =>
        t.strCountry?.toLowerCase().includes('brazil') ||
        t.strCountry?.toLowerCase().includes('brasil')
      );
      const data = brazil.length > 0 ? brazil : all;
      setCache(ck, data, 2 * HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getTvListings', e);
      return [];
    }
  },

  /** Copa highlights for a date — cached 1 h */
  async getCopaHighlights(date: string): Promise<TsdbHighlight[]> {
    const ck = `tsdb_highlights_${date}`;
    const cached = getCache<TsdbHighlight[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ highlights: TsdbHighlight[] | null }>(
        `eventshighlights.php?d=${date}&l=${WC_LEAGUE}`
      );
      const data = json.highlights ?? [];
      setCache(ck, data, HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getCopaHighlights', e);
      return [];
    }
  },

  /** Full squad for a team — cached 24 h */
  async getTeamSquad(teamId: string): Promise<TsdbPlayer[]> {
    const ck = `tsdb_squad_${teamId}`;
    const cached = getCache<TsdbPlayer[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ player: TsdbPlayer[] | null }>(`lookup_all_players.php?id=${teamId}`);
      const data = json.player ?? [];
      setCache(ck, data, 24 * HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getTeamSquad', e);
      return [];
    }
  },

  /** Kit/equipment for a team — cached 24 h */
  async getTeamEquipment(teamId: string): Promise<TsdbEquipment[]> {
    const ck = `tsdb_equipment_${teamId}`;
    const cached = getCache<TsdbEquipment[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ equipment: TsdbEquipment[] | null }>(`lookupequipment.php?id=${teamId}`);
      const data = json.equipment ?? [];
      setCache(ck, data, 24 * HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getTeamEquipment', e);
      return [];
    }
  },

  /** Next events for a team — cached 30 min */
  async getTeamNextEvents(teamId: string): Promise<TsdbEvent[]> {
    const ck = `tsdb_team_next_${teamId}`;
    const cached = getCache<TsdbEvent[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ events: TsdbEvent[] | null }>(`eventsnext.php?id=${teamId}`);
      const data = json.events ?? [];
      setCache(ck, data, 30 * MIN);
      return data;
    } catch (e) {
      console.error('[TSDB] getTeamNextEvents', e);
      return [];
    }
  },

  /** Full player details by ID — cached 24 h */
  async getPlayerDetails(playerId: string): Promise<TsdbPlayer | null> {
    const ck = `tsdb_player_${playerId}`;
    const cached = getCache<TsdbPlayer>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ players: TsdbPlayer[] | null }>(`lookupplayer.php?id=${playerId}`);
      const data = json.players?.[0] ?? null;
      if (data) setCache(ck, data, 24 * HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getPlayerDetails', e);
      return null;
    }
  },

  /** Player honours / titles — cached 24 h */
  async getPlayerHonours(playerId: string): Promise<TsdbHonour[]> {
    const ck = `tsdb_honours_${playerId}`;
    const cached = getCache<TsdbHonour[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ honours: TsdbHonour[] | null }>(`lookuphonours.php?id=${playerId}`);
      const data = json.honours ?? [];
      setCache(ck, data, 24 * HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getPlayerHonours', e);
      return [];
    }
  },

  /** Player former teams — cached 24 h */
  async getPlayerFormerTeams(playerId: string): Promise<TsdbFormerTeam[]> {
    const ck = `tsdb_former_${playerId}`;
    const cached = getCache<TsdbFormerTeam[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ formerteams: TsdbFormerTeam[] | null }>(`lookupformerteams.php?id=${playerId}`);
      const data = json.formerteams ?? [];
      setCache(ck, data, 24 * HOUR);
      return data;
    } catch (e) {
      console.error('[TSDB] getPlayerFormerTeams', e);
      return [];
    }
  },

  /** Last results for a team — cached 30 min */
  async getTeamLastEvents(teamId: string): Promise<TsdbEvent[]> {
    const ck = `tsdb_team_last_${teamId}`;
    const cached = getCache<TsdbEvent[]>(ck);
    if (cached) return cached;
    try {
      const json = await get<{ results: TsdbEvent[] | null }>(`eventslast.php?id=${teamId}`);
      const data = json.results ?? [];
      setCache(ck, data, 30 * MIN);
      return data;
    } catch (e) {
      console.error('[TSDB] getTeamLastEvents', e);
      return [];
    }
  },

  clearCopaCache(): void {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('tsdb_'))
        .forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
  },
};
