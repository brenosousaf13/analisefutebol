export interface ApiFootballResponse<T> {
    get: string;
    parameters: any;
    errors: any[];
    results: number;
    paging: {
        current: number;
        total: number;
    };
    response: T[];
}

export interface ApiCountry {
    name: string;
    code: string | null;
    flag: string | null;
}

export interface ApiLeague {
    league: {
        id: number;
        name: string;
        type: string;
        logo: string;
    };
    country: {
        name: string;
        code: string | null;
        flag: string | null;
    };
    seasons: Array<{
        year: number;
        start: string;
        end: string;
        current: boolean;
    }>;
}

export interface ApiSquadPlayer {
    id: number;
    name: string;
    age: number;
    number: number | null;
    position: string;
    photo: string;
}

export interface ApiTeam {
    team: {
        id: number;
        name: string;
        code: string;
        country: string;
        founded: number;
        national: boolean;
        logo: string;
    };
    venue: {
        id: number;
        name: string;
        address: string;
        city: string;
        capacity: number;
        surface: string;
        image: string;
    };
}

export interface ApiPlayer {
    player: {
        id: number;
        name: string;
        firstname: string;
        lastname: string;
        age: number;
        birth: {
            date: string;
            place: string;
            country: string;
        };
        nationality: string;
        height: string;
        weight: string;
        injured: boolean;
        photo: string;
    };
    statistics: Array<{
        team: {
            id: number;
            name: string;
            logo: string;
        };
        league: {
            id: number;
            name: string;
            country: string;
            logo: string;
            flag: string;
            season: number;
        };
        games: {
            appearences: number;
            lineups: number;
            minutes: number;
            number: number;
            position: string;
            rating: string;
            captain: boolean;
        };
        // Add more stats as needed
    }>;
}

export interface ApiFixture {
    fixture: {
        id: number;
        referee: string;
        timezone: string;
        date: string;
        timestamp: number;
        periods: {
            first: number;
            second: number;
        };
        venue: {
            id: number;
            name: string;
            city: string;
        };
        status: {
            long: string;
            short: string;
            elapsed: number;
        };
    };
    league: {
        id: number;
        name: string;
        country: string;
        logo: string;
        flag: string;
        season: number;
        round: string;
    };
    teams: {
        home: {
            id: number;
            name: string;
            logo: string;
            winner: boolean;
        };
        away: {
            id: number;
            name: string;
            logo: string;
            winner: boolean;
        };
    };
    goals: {
        home: number;
        away: number;
    };
    score: {
        halftime: {
            home: number;
            away: number;
        };
        fulltime: {
            home: number;
            away: number;
        };
        extratime: {
            home: number | null;
            away: number | null;
        };
        penalty: {
            home: number | null;
            away: number | null;
        };
    };
}

export interface ApiLineupPlayer {
    id: number;
    name: string;
    number: number;
    pos: string;
    grid: string | null;
}

export interface ApiLineup {
    team: {
        id: number;
        name: string;
        logo: string;
        colors: {
            player: { primary: string; number: string; border: string; };
            goalkeeper: { primary: string; number: string; border: string; };
        };
    };
    coach: {
        id: number;
        name: string;
        photo: string;
    };
    formation: string;
    startXI: Array<{ player: ApiLineupPlayer }>;
    substitutes: Array<{ player: ApiLineupPlayer }>;
}
