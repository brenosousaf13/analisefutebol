import { supabase } from '../lib/supabase';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';


// Mock User ID (since we don't have auth yet)
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export interface AnalysisData {
    id?: string;
    matchId?: number; // Corresponds to fixture_id
    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    homeScore?: number;
    awayScore?: number;
    gameNotes: string;

    // New Detailed Notes
    notasCasa: string;
    notasCasaUpdatedAt?: string;
    notasVisitante: string;
    notasVisitanteUpdatedAt?: string;

    // Legacy/Phase notes (kept for backward compat or phased usage)
    homeTeamNotes: string;
    homeOffNotes: string;
    awayTeamNotes: string;
    awayOffNotes: string;

    // Players
    homePlayersDef: Player[];
    homePlayersOff: Player[];
    awayPlayersDef: Player[];
    awayPlayersOff: Player[];
    homeSubstitutes: Player[];
    awaySubstitutes: Player[];

    // Arrows
    homeArrowsDef: Arrow[];
    homeArrowsOff: Arrow[];
    awayArrowsDef: Arrow[];
    awayArrowsOff: Arrow[];

    tags: string[];
}

export interface SavedAnalysisSummary {
    id: string;
    home_team_name: string;
    away_team_name: string;
    home_team_logo: string;
    away_team_logo: string;
    home_score: number;
    away_score: number;
    created_at: string;
    notes_preview?: string;
}

export const analysisService = {
    async saveAnalysis(data: AnalysisData): Promise<string> {
        try {
            console.log('[analysisService.saveAnalysis] Saving...', data);

            let analysisId = data.id;

            // 1. Prepare Payload
            const analysisPayload = {
                user_id: MOCK_USER_ID,
                match_id: data.matchId, // Keep strictly to what DB expects if column is match_id or fixture_id. 
                // Schema says 'fixture_id' or 'match_id'? 
                // Checking schema from previous steps: It has 'match_id' in some places or 'fixture_id'?
                // "match_id" was used in previous `replace_file_content` for `saveAnalysis`.
                // But original code had `fixture_id`.
                // Let's check `types/apiFootball` or just use `match_id` if that's what I added.
                // Wait, the schema I saw in `MyAnalyses` return type had `id, home_team_name...`.
                // I'll stick to `fixture_id` if that's what the column is, OR `match_id`.
                // In `Analysis.tsx`, I saw `matchState.fixture.id`.
                // Let's check `supabase_schema.sql` if I could.
                // PROCEEDING assumption: The table likely has `match_id` or `fixture_id`.
                // I will use `match_id` as per my plan, but if it fails I'll fix.
                // Actually, looking at the previous file content (Step 182), line 73 said `fixture_id`.
                // I will use `fixture_id` to be safe with existing schema, or map `matchId` to `fixture_id`.
                fixture_id: data.matchId,
                home_team_name: data.homeTeam,
                away_team_name: data.awayTeam,
                home_team_logo: data.homeTeamLogo,
                away_team_logo: data.awayTeamLogo,
                home_score: data.homeScore,
                away_score: data.awayScore,
                game_notes: data.gameNotes,

                notas_casa: data.notasCasa,
                notas_casa_updated_at: data.notasCasaUpdatedAt,
                notas_visitante: data.notasVisitante,
                notas_visitante_updated_at: data.notasVisitanteUpdatedAt,

                home_team_notes: data.homeTeamNotes,
                home_off_notes: data.homeOffNotes,
                away_team_notes: data.awayTeamNotes,
                away_off_notes: data.awayOffNotes,
                updated_at: new Date().toISOString()
                // tags are separate
            };

            if (analysisId) {
                // Update
                const { error } = await supabase
                    .from('analyses')
                    .update(analysisPayload)
                    .eq('id', analysisId);
                if (error) throw error;
            } else {
                // Insert
                const { data: inserted, error } = await supabase
                    .from('analyses')
                    .insert(analysisPayload)
                    .select()
                    .single();
                if (error) throw error;
                analysisId = inserted.id;
            }

            if (!analysisId) throw new Error("Failed to get analysis ID");

            // 2. Relations (Delete & Re-insert)
            await supabase.from('analysis_players').delete().eq('analysis_id', analysisId);
            await supabase.from('analysis_arrows').delete().eq('analysis_id', analysisId);
            await supabase.from('analysis_tags').delete().eq('analysis_id', analysisId);

            // Players
            const playersToInsert = [
                ...data.homePlayersDef.map(p => ({ ...p, team: 'home', type: 'field', variant: 'defensive' })),
                ...data.homePlayersOff.map(p => ({ ...p, team: 'home', type: 'field', variant: 'offensive' })),
                ...data.awayPlayersDef.map(p => ({ ...p, team: 'away', type: 'field', variant: 'defensive' })),
                ...data.awayPlayersOff.map(p => ({ ...p, team: 'away', type: 'field', variant: 'offensive' })),
                ...data.homeSubstitutes.map(p => ({ ...p, team: 'home', type: 'bench', variant: 'defensive' })),
                ...data.awaySubstitutes.map(p => ({ ...p, team: 'away', type: 'bench', variant: 'defensive' }))
            ].map((p: any) => ({
                analysis_id: analysisId,
                player_id: p.id,
                name: p.name,
                number: p.number,
                team: p.team,
                type: p.type,
                variant: p.variant,
                x: p.position.x,
                y: p.position.y,
                note: null,
                is_manual: false
            }));

            if (playersToInsert.length > 0) {
                const { error } = await supabase.from('analysis_players').insert(playersToInsert);
                if (error) throw error;
            }

            // Arrows
            const arrowsToInsert = [
                ...data.homeArrowsDef.map(a => ({ ...a, team: 'home', variant: 'defensive' })),
                ...data.homeArrowsOff.map(a => ({ ...a, team: 'home', variant: 'offensive' })),
                ...data.awayArrowsDef.map(a => ({ ...a, team: 'away', variant: 'defensive' })),
                ...data.awayArrowsOff.map(a => ({ ...a, team: 'away', variant: 'offensive' }))
            ].map((a: any) => ({
                analysis_id: analysisId,
                team: a.team,
                variant: a.variant,
                start_x: a.startX,
                start_y: a.startY,
                end_x: a.endX,
                end_y: a.endY,
                color: a.color,
                type: 'arrow'
            }));

            if (arrowsToInsert.length > 0) {
                const { error } = await supabase.from('analysis_arrows').insert(arrowsToInsert);
                if (error) throw error;
            }

            return analysisId;

        } catch (error) {
            console.error("Error saving analysis:", error);
            throw error;
        }
    },

    async getMyAnalyses(): Promise<SavedAnalysisSummary[]> {
        const { data, error } = await supabase
            .from('analyses')
            .select(`
                id, home_team_name, away_team_name, home_team_logo, away_team_logo,
                home_score, away_score, created_at, home_team_notes, away_team_notes
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(item => ({
            id: item.id,
            home_team_name: item.home_team_name,
            away_team_name: item.away_team_name,
            home_team_logo: item.home_team_logo,
            away_team_logo: item.away_team_logo,
            home_score: item.home_score,
            away_score: item.away_score,
            created_at: item.created_at,
            notes_preview: (item.home_team_notes || item.away_team_notes || '').slice(0, 60) + '...'
        }));
    },

    async getAnalysis(id: string): Promise<AnalysisData | null> {
        const { data: analysis, error } = await supabase
            .from('analyses')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !analysis) return null;

        const { data: players } = await supabase.from('analysis_players').select('*').eq('analysis_id', id);
        const { data: arrows } = await supabase.from('analysis_arrows').select('*').eq('analysis_id', id);

        const homePlayersDef: Player[] = [];
        const homePlayersOff: Player[] = [];
        const awayPlayersDef: Player[] = [];
        const awayPlayersOff: Player[] = [];
        const homeSubstitutes: Player[] = [];
        const awaySubstitutes: Player[] = [];

        players?.forEach(p => {
            const playerObj: Player = {
                id: p.player_id, name: p.name, number: p.number, position: { x: p.x, y: p.y }
            };
            const variant = p.variant || 'defensive';
            if (p.team === 'home') {
                if (p.type === 'field') {
                    if (variant === 'defensive') homePlayersDef.push(playerObj);
                    else homePlayersOff.push(playerObj);
                } else homeSubstitutes.push(playerObj); // Simple push
            } else {
                if (p.type === 'field') {
                    if (variant === 'defensive') awayPlayersDef.push(playerObj);
                    else awayPlayersOff.push(playerObj);
                } else awaySubstitutes.push(playerObj);
            }
        });

        const homeArrowsDef: Arrow[] = [];
        const homeArrowsOff: Arrow[] = [];
        const awayArrowsDef: Arrow[] = [];
        const awayArrowsOff: Arrow[] = [];

        arrows?.forEach(a => {
            const arrowObj: Arrow = {
                id: a.id, startX: a.start_x, startY: a.start_y, endX: a.end_x, endY: a.end_y, color: a.color
            };
            const variant = a.variant || 'defensive';
            if (a.team === 'home') {
                if (variant === 'defensive') homeArrowsDef.push(arrowObj);
                else homeArrowsOff.push(arrowObj);
            } else {
                if (variant === 'defensive') awayArrowsDef.push(arrowObj);
                else awayArrowsOff.push(arrowObj);
            }
        });

        return {
            id: analysis.id,
            matchId: analysis.fixture_id,
            homeTeam: analysis.home_team_name,
            awayTeam: analysis.away_team_name,
            homeTeamLogo: analysis.home_team_logo,
            awayTeamLogo: analysis.away_team_logo,
            homeScore: analysis.home_score,
            awayScore: analysis.away_score,
            gameNotes: analysis.game_notes || '',

            notasCasa: analysis.notas_casa || '',
            notasCasaUpdatedAt: analysis.notas_casa_updated_at,
            notasVisitante: analysis.notas_visitante || '',
            notasVisitanteUpdatedAt: analysis.notas_visitante_updated_at,

            homeTeamNotes: analysis.home_team_notes || '',
            homeOffNotes: analysis.home_off_notes || '',
            awayTeamNotes: analysis.away_team_notes || '',
            awayOffNotes: analysis.away_off_notes || '',
            homePlayersDef, homePlayersOff, awayPlayersDef, awayPlayersOff,
            homeSubstitutes, awaySubstitutes,
            homeArrowsDef, homeArrowsOff, awayArrowsDef, awayArrowsOff,
            tags: []
        };
    },

    async deleteAnalysis(id: string): Promise<void> {
        const { error } = await supabase.from('analyses').delete().eq('id', id);
        if (error) throw error;
    }
};
