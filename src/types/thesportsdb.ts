// TheSportsDB API types — COPA 2026 feature (easy to remove after tournament)

export interface TsdbEvent {
  idEvent: string;
  strEvent: string;
  strSeason: string;
  idLeague: string;
  strLeague: string;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam: string;
  idAwayTeam: string;
  intRound: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  intHomeScoreExtraTime: string | null;
  intAwayScoreExtraTime: string | null;
  intHomeScorePenalty: string | null;
  intAwayScorePenalty: string | null;
  strTimestamp: string; // "2026-06-11T19:00:00"
  dateEvent: string;    // "2026-06-11"
  strTime: string;      // "19:00:00" (UTC)
  strGroup: string | null;
  strVenue: string | null;
  strCity: string | null;
  strCountry: string | null;
  strStatus: string; // NS, 1H, HT, 2H, ET, P, FT, AET, PEN, PST, CANC
  strPostponed: string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  strLeagueBadge: string | null;
  strThumb: string | null;
  strVideo: string | null; // YouTube highlight URL
  strFilename: string | null;
}

// Real API response: one entry per player
export interface TsdbLineupPlayer {
  idLineup?: string;
  idEvent: string;
  strTeam: string;
  idTeam: string;
  strHome: string;       // "Yes" = home team, "No" = away team
  strFormation?: string; // "4-3-3" — may be present on some endpoints
  strPlayer: string;
  idPlayer: string;
  strPosition: string;   // "GK", "CB", "RB", "DM", "CM", "RW", "CF", etc.
  intSquadNumber: string | null; // jersey number
  strSubstitute: string; // "Yes" = sub, "No" = starting XI
  strCutout?: string | null;
  strThumb?: string | null;
  strRender?: string | null;
}

// Real API response: one entry per event (goal/card/sub)
export interface TsdbTimeline {
  idTimeline: string;
  idEvent: string;
  strTimeline: string;       // "Goal" | "Card" | "subst"
  strTimelineDetail: string | null; // "Normal Goal" | "Yellow Card" | "Red Card" | "Substitution 1" | etc.
  strPlayer: string | null;
  idPlayer: string | null;
  strAssist: string | null;  // assist player name
  idAssist: string | null;
  strHome: string;           // "Yes" = home team event, "No" = away team
  intTime: string | null;    // "67" (match minute as string)
  strPeriod: string | null;
  idTeam: string | null;
  strTeam: string | null;
  strComment: string | null;
  strCutout?: string | null;
  dateEvent: string;
  strSeason: string;
}

// Real API response: array of stat items (NOT individual fields)
export interface TsdbStatItem {
  strStat: string;    // "Ball Possession", "Shots on Goal", "Fouls", etc.
  intHome: string | null; // "42%" or "9"
  intAway: string | null; // "58%" or "3"
}
// The API returns: { eventstats: TsdbStatItem[] }
export type TsdbEventStats = TsdbStatItem[];

export interface TsdbStanding {
  intRank: string;
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
  idLeague: string;
  strSeason: string;
  strForm: string | null;
  strDescription: string | null;
  intPlayed: string;
  intWin: string;
  intLoss: string;
  intDraw: string;
  intGoalsFor: string;
  intGoalsAgainst: string;
  intGoalDifference: string;
  intPoints: string;
}

export interface TsdbTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort: string | null;
  strCountry: string | null;
  strBadge: string | null;
  strLogo: string | null;
  strColour1: string | null;
  strColour2: string | null;
  strColour3: string | null;
  strDescriptionEN: string | null;
}

export interface TsdbPlayer {
  idPlayer: string;
  strPlayer: string;
  strNationality: string | null;
  strPosition: string | null;
  strDescriptionEN: string | null;
  strThumb: string | null;
  strCutout: string | null;
  dateBorn: string | null;
  strTeam: string | null;
  idTeam: string | null;
}

export interface TsdbTv {
  idTVstation: string;
  strChannel: string;
  strCountry: string | null;
  strSport: string | null;
  strLanguage: string | null;
  strLogo: string | null;
  strDate: string | null;
  strTime: string | null;
}

export interface TsdbHighlight {
  idHighlight?: string;
  idEvent?: string | null;
  strFilename: string | null;
  strVideo: string | null;
  strLeague: string | null;
  strSeason: string | null;
  strHomeTeam: string | null;
  strAwayTeam: string | null;
  dateEvent: string | null;
}

export interface TsdbEquipment {
  idEquipment: string;
  idTeam: string;
  strTeam: string | null;
  strSeason: string | null;
  strType: string | null;
  strEquipment: string | null;
  strThumb: string | null;
}

export interface TsdbLivescore {
  idEvent: string;
  idAPIfootball: string | null;
  strLeague: string;
  idLeague: string;
  strHomeTeam: string;
  strAwayTeam: string;
  idHomeTeam: string;
  idAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string;
  strProgress: string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  dateEvent: string;
  strTime: string;
  strVenue: string | null;
}
