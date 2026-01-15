import axios from 'axios';


const BASE_URL = '/api-football';
const TIMEZONE = 'America/Sao_Paulo';

const api = axios.create({
    baseURL: BASE_URL,
});

export interface Country {
    name: string;
    code: string | null;
    flag: string | null;
}

export interface League {
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
}

export interface Fixture {
    fixture: {
        id: number;
        status: {
            elapsed: number;
            long: string;
            short: string; // "FT", "NS", "1H", etc.
        };
        date: string;
    };
    league: {
        id: number;
        name: string;
        country: string;
        logo: string;
        flag: string | null;
    };
    teams: {
        home: {
            id: number;
            name: string;
            logo: string;
        };
        away: {
            id: number;
            name: string;
            logo: string;
        };
    };
    goals: {
        home: number | null;
        away: number | null;
    };
}

export interface LineupPlayer {
    id: number;
    name: string;
    number: number;
    pos: string; // "G", "D", "M", "F"
    grid: string | null; // "1:1", "2:3", etc., can be null
}

export interface Lineup {
    team: {
        id: number;
        name: string;
        logo: string;
        colors?: {
            player: { primary: string; number: string; border: string; };
            goalkeeper: { primary: string; number: string; border: string; };
        };
    };
    coach: {
        id: number;
        name: string;
    };
    formation: string;
    startXI: { player: LineupPlayer }[];
    substitutes: { player: LineupPlayer }[];
}


export const getLiveFixtures = async (): Promise<Fixture[]> => {
    try {
        console.log(`[API] Fetching LIVE fixtures...`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>('/fixtures', {
            params: {
                live: 'all',
                timezone: TIMEZONE,
            },
        });

        const data = response.data;
        const fixtures = data?.response || [];

        console.log(`[API] LIVE Response count: ${fixtures.length}`);

        if (data?.errors && Object.keys(data.errors).length > 0) {
            console.warn('[API] Errors returned:', data.errors);
        }

        return fixtures;
    } catch (error) {
        console.error('Error fetching live fixtures:', error);
        return [];
    }
};

export const getMatchLineups = async (fixtureId: number): Promise<Lineup[]> => {
    try {
        console.log(`[API Lineups] Fetching lineups for fixture: ${fixtureId}`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>('/fixtures/lineups', {
            params: {
                fixture: fixtureId,
            },
        });

        const data = response.data;
        console.log(`[API Lineups] Response Status: ${response.status}`);

        if (data?.errors && Object.keys(data?.errors || {}).length > 0) {
            console.warn('[API Lineups] Errors returned:', data.errors);
        }

        const lineups = data?.response || [];
        console.log(`[API Lineups] Response count: ${lineups.length}`);

        if (lineups.length > 0) {
            console.log('[API Lineups] First team startXI count:', lineups[0]?.startXI?.length);
        } else {
            console.warn('[API Lineups] Response is empty or undefined.');
        }

        return lineups;
    } catch (error) {
        console.error('[API Lineups] Error fetching lineups:', error);
        return [];
    }
};

export const getFixturesByDate = async (date: string): Promise<Fixture[]> => {
    try {
        const url = `/fixtures?date=${date}&timezone=${TIMEZONE}`;
        console.log(`[API] Fetching fixtures for date: ${date} (URL: ${BASE_URL}${url})`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>('/fixtures', {
            params: {
                date,
                timezone: TIMEZONE
            }
        });

        const data = response.data;
        const fixtures = data?.response || [];

        console.log(`[API] Date Response count: ${fixtures.length}`);

        if (data?.errors && Object.keys(data?.errors || {}).length > 0) {
            console.warn('[API] Errors returned:', data.errors);
        }

        return fixtures;
    } catch (error) {
        console.error('Error fetching fixtures by date:', error);
        return [];
    }
};

export const getCountries = async (): Promise<Country[]> => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>('/countries');
        return response?.data?.response || [];
    } catch (error) {
        console.error('Error fetching countries:', error);
        return [];
    }
};

export const getLeagues = async (country: string): Promise<League[]> => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>('/leagues', {
            params: {
                country: country
            }
        });
        return response?.data?.response || [];
    } catch (error) {
        console.error('Error fetching leagues:', error);
        return [];
    }
};
