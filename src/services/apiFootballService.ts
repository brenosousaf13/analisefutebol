import axios from 'axios';
import type { ApiFootballResponse, ApiTeam, ApiPlayer, ApiFixture, ApiLineup, ApiCountry, ApiLeague, ApiSquadPlayer } from '../types/api-football';

const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;
const BASE_URL = 'https://v3.football.api-sports.io';

const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'x-rapidapi-key': API_KEY,
        'x-rapidapi-host': 'v3.football.api-sports.io'
    }
});

export const apiFootballService = {
    /**
     * Search for players by name
     * Note: Requires at least 3 characters
     */
    async searchPlayers(name: string, league?: number, season?: number): Promise<ApiPlayer[]> {
        try {
            const params: any = { search: name };
            if (league) params.league = league;
            if (season) params.season = season;

            const response = await apiClient.get<ApiFootballResponse<ApiPlayer>>('/players', {
                params
            });
            return response.data.response;
        } catch (error) {
            console.error('Error searching players:', error);
            throw error;
        }
    },

    /**
     * Get fixtures (matches) for a specific date
     * Date format: YYYY-MM-DD
     */
    async getFixturesByDate(date: string): Promise<ApiFixture[]> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiFixture>>('/fixtures', {
                params: { date }
            });
            return response.data.response;
        } catch (error) {
            console.error('Error fetching fixtures:', error);
            throw error;
        }
    },

    /**
     * Get fixture by ID
     */
    async getFixtureById(id: number): Promise<ApiFixture | null> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiFixture>>('/fixtures', {
                params: { id }
            });
            return response.data.response[0] || null;
        } catch (error) {
            console.error('Error fetching fixture:', error);
            throw error;
        }
    },

    /**
     * Get lineups for a fixture
     */
    async getLineups(fixtureId: number): Promise<ApiLineup[]> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiLineup>>('/fixtures/lineups', {
                params: { fixture: fixtureId }
            });
            return response.data.response;
        } catch (error) {
            console.error('Error fetching lineups:', error);
            throw error;
        }
    },

    /**
     * Get list of countries
     */
    async getCountries(): Promise<ApiCountry[]> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiCountry>>('/countries');
            return response.data.response;
        } catch (error) {
            console.error('Error fetching countries:', error);
            throw error;
        }
    },

    /**
     * Get leagues for a country
     */
    async getLeagues(country: string): Promise<ApiLeague[]> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiLeague>>('/leagues', {
                params: { country, current: 'true' } // Fetch only current seasons for now
            });
            return response.data.response;
        } catch (error) {
            console.error('Error fetching leagues:', error);
            throw error;
        }
    },

    /**
     * Get teams for a league and season
     */
    async getTeams(leagueId: number, season: number): Promise<ApiTeam[]> {
        try {
            const response = await apiClient.get<ApiFootballResponse<ApiTeam>>('/teams', {
                params: { league: leagueId, season: season }
            });
            return response.data.response;
        } catch (error) {
            console.error('Error fetching teams:', error);
            throw error;
        }
    },

    /**
     * Get full squad for a team
     */
    async getSquad(teamId: number): Promise<ApiSquadPlayer[]> {
        console.log(`[API] Getting squad for team ${teamId} (Strategy: Squad Endpoint -> Seasons 2026-2023)`);

        // 1. Try /players/squads Endpoint
        try {
            const response = await apiClient.get<ApiFootballResponse<{ players: ApiSquadPlayer[] }>>('/players/squads', {
                params: { team: teamId }
            });

            if (response.data.response && response.data.response.length > 0) {
                console.log(`[API] /players/squads success: ${response.data.response[0].players.length} players found.`);
                return response.data.response[0].players;
            }
            console.warn(`[API] /players/squads returned empty for team ${teamId}.`);
        } catch (error) {
            console.warn(`[API] /players/squads failed for team ${teamId}.`, error);
        }

        // 2. Fallback: Try Seasons 2026 down to 2023
        const seasons = [2026, 2025, 2024, 2023];

        for (const season of seasons) {
            try {
                console.log(`[API] Fallback: Trying season ${season} for team ${teamId}...`);
                const players = await this.getPlayersByTeam(teamId, season);

                if (players.length > 0) {
                    console.log(`[API] Success: Found ${players.length} players in season ${season}.`);

                    // Map ApiPlayer to ApiSquadPlayer
                    return players.map(p => ({
                        id: p.player.id,
                        name: p.player.name,
                        age: p.player.age,
                        number: p.statistics[0]?.games.number || null,
                        position: p.statistics[0]?.games.position || 'Unknown',
                        photo: p.player.photo
                    }));
                }
                console.warn(`[API] Season ${season} returned 0 players.`);
            } catch (err) {
                console.warn(`[API] Error fetching season ${season}:`, err);
            }
        }

        console.error(`[API] All fallback strategies failed for team ${teamId}. Returning empty squad.`);
        return [];
    },

    /**
     * Get ALL players by team and season (iterating through pages)
     */
    async getPlayersByTeam(teamId: number, season: number): Promise<ApiPlayer[]> {
        const players: ApiPlayer[] = [];
        let page = 1;
        let totalPages = 1;

        try {
            do {
                console.log(`[API] Fetching players team ${teamId}, season ${season}, page ${page}...`);
                const response = await apiClient.get<ApiFootballResponse<ApiPlayer>>('/players', {
                    params: {
                        team: teamId,
                        season: season,
                        page: page
                    }
                });

                if (response.data.response) {
                    players.push(...response.data.response);
                }

                // Safety check for paging (sometimes API returns weird paging)
                if (response.data.paging && response.data.paging.total) {
                    totalPages = response.data.paging.total;
                } else {
                    totalPages = 1;
                }

                page++;

            } while (page <= totalPages);

            console.log(`[API] Total players fetched for season ${season}: ${players.length}`);
            return players;

        } catch (error) {
            console.error(`[API] Error in getPlayersByTeam (Team: ${teamId}, Season: ${season}):`, error);
            // Return whatever we have so far
            if (players.length > 0) return players;
            return [];
        }
    },

    /**
     * Search teams by country and name
     */
    async searchTeams(country: string, search: string): Promise<ApiTeam[]> {
        console.log(`[API] Searching teams - Search: ${search} (Country filter applied client-side: ${country})`);
        try {
            // API Limitation: Cannot use 'country' and 'search' together.
            // We search by name and filter by country in the UI.
            const response = await apiClient.get<ApiFootballResponse<ApiTeam>>('/teams', {
                params: {
                    search
                }
            });
            console.log('[API] Search Response:', response.data);

            return response.data.response;
        } catch (error) {
            console.error('[API] Error searching teams:', error);
            throw error;
        }
    }
};
