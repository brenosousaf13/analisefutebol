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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>('/fixtures', {
            params: {
                live: 'all',
                timezone: TIMEZONE,
            },
        });

        const data = response.data;
        const fixtures = data?.response || [];



        if (data?.errors && Object.keys(data.errors).length > 0) {

        }

        return fixtures;
    } catch (error) {

        return [];
    }
};

export const getMatchLineups = async (fixtureId: number): Promise<Lineup[]> => {
    try {

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>('/fixtures/lineups', {
            params: {
                fixture: fixtureId,
            },
        });

        const data = response.data;


        if (data?.errors && Object.keys(data?.errors || {}).length > 0) {

        }

        const lineups = data?.response || [];


        if (lineups.length > 0) {

        } else {

        }

        return lineups;
    } catch (error) {

        return [];
    }
};

export const getFixturesByDate = async (date: string): Promise<Fixture[]> => {
    try {
        // const url = `/fixtures?date=${date}&timezone=${TIMEZONE}`;


        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>('/fixtures', {
            params: {
                date,
                timezone: TIMEZONE
            }
        });

        const data = response.data;
        const fixtures = data?.response || [];



        if (data?.errors && Object.keys(data?.errors || {}).length > 0) {

        }

        return fixtures;
    } catch (error) {

        return [];
    }
};

export const getCountries = async (): Promise<Country[]> => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.get<any>('/countries');
        return response?.data?.response || [];
    } catch (error) {

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

        return [];
    }
};
