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

export interface TsdbLineupPlayer {
  idEvent: string;
  strTeam: string;
  idTeam: string;
  strFormation: string;
  strPlayer: string;
  idPlayer: string;
  strPosition: string;
  intShirtNumber: string | null;
  strEvent: string; // "Starting XI" | "Substitution In" | "Substitution Out"
  strSubstitution: string | null;
}

export interface TsdbTimeline {
  idEvent: string;
  idTimeline: string;
  strTimeline: string;       // "Goal" | "Yellow Card" | "Red Card" | "Substitution" | "Own Goal"
  strTimelineDetail: string | null;
  strPlayer: string | null;
  idPlayer: string | null;
  strTeam: string | null;
  idTeam: string | null;
  intTimelineScore: string | null; // e.g. "1-0"
  strComment: string | null;
}

export interface TsdbStanding {
  intRank: string;
  idTeam: string;
  strTeam: string;
  strBadge: string | null;
  idLeague: string;
  strSeason: string;
  strForm: string | null;
  strDescription: string | null; // "Group A", "Playoffs", etc.
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
  strColour1: string | null; // e.g. "#ADD8E6"
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

export interface TsdbEventStats {
  idEvent: string;
  intHomePossession: string | null;
  intAwayPossession: string | null;
  intHomeShotsTotal: string | null;
  intAwayShotsTotal: string | null;
  intHomeShotsOnGoal: string | null;
  intAwayShotsOnGoal: string | null;
  intHomeCorners: string | null;
  intAwayCorners: string | null;
  intHomeFouls: string | null;
  intAwayFouls: string | null;
  intHomeYellowCards: string | null;
  intAwayYellowCards: string | null;
  intHomeRedCards: string | null;
  intAwayRedCards: string | null;
  intHomeOffsides: string | null;
  intAwayOffsides: string | null;
  intHomeSaves: string | null;
  intAwaySaves: string | null;
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
  strProgress: string | null; // match minute e.g. "45'"
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  dateEvent: string;
  strTime: string;
  strVenue: string | null;
}
