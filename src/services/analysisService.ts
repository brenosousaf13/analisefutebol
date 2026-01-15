import { supabase } from '../lib/supabase';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';

// Mock User ID (since we don't have auth yet)
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

export type AnalysisStatus = 'rascunho' | 'em_andamento' | 'finalizada';
export type AnalysisType = 'partida' | 'treino' | 'adversario' | 'modelo_tatico';

export interface AnalysisData {
    id?: string;
    matchId?: number;

    // New metadata fields
    titulo?: string;
    descricao?: string;
    tipo?: AnalysisType;
    status?: AnalysisStatus;

    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    homeScore?: number;
    awayScore?: number;
    gameNotes: string;

    // Detailed Notes
    notasCasa: string;
    notasCasaUpdatedAt?: string;
    notasVisitante: string;
    notasVisitanteUpdatedAt?: string;

    // Legacy/Phase notes
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
    titulo: string;
    descricao?: string;
    tipo: AnalysisType;
    status: AnalysisStatus;
    home_team_name: string;
    away_team_name: string;
    home_team_logo: string;
    away_team_logo: string;
    home_score: number;
    away_score: number;
    created_at: string;
    updated_at: string;
    thumbnail_url?: string;
}

export interface AnalysisFilters {
    status?: AnalysisStatus | 'todas';
    search?: string;
    orderBy?: 'created_at' | 'updated_at' | 'titulo';
    orderDirection?: 'asc' | 'desc';
}

export const analysisService = {
    async saveAnalysis(data: AnalysisData): Promise<string> {
        try {
            console.log('[analysisService.saveAnalysis] Saving...', data);

            let analysisId = data.id;

            // Generate titulo if not provided
            const titulo = data.titulo || `${data.homeTeam} vs ${data.awayTeam}`;

            const analysisPayload = {
                user_id: MOCK_USER_ID,
                fixture_id: data.matchId,
                titulo,
                descricao: data.descricao,
                tipo: data.tipo || 'partida',
                status: data.status || 'em_andamento',
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
            };

            if (analysisId) {
                const { error } = await supabase
                    .from('analyses')
                    .update(analysisPayload)
                    .eq('id', analysisId);
                if (error) throw error;
            } else {
                const { data: inserted, error } = await supabase
                    .from('analyses')
                    .insert(analysisPayload)
                    .select()
                    .single();
                if (error) throw error;
                analysisId = inserted.id;
            }

            if (!analysisId) throw new Error("Failed to get analysis ID");

            // Delete & Re-insert relations
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

    async getMyAnalyses(filters?: AnalysisFilters): Promise<SavedAnalysisSummary[]> {
        let query = supabase
            .from('analyses')
            .select(`
                id, titulo, descricao, tipo, status,
                home_team_name, away_team_name, home_team_logo, away_team_logo,
                home_score, away_score, created_at, updated_at, thumbnail_url
            `);

        // Apply status filter
        if (filters?.status && filters.status !== 'todas') {
            query = query.eq('status', filters.status);
        }

        // Apply search filter
        if (filters?.search) {
            query = query.or(`titulo.ilike.%${filters.search}%,home_team_name.ilike.%${filters.search}%,away_team_name.ilike.%${filters.search}%`);
        }

        // Apply ordering
        const orderBy = filters?.orderBy || 'created_at';
        const orderDirection = filters?.orderDirection || 'desc';
        query = query.order(orderBy, { ascending: orderDirection === 'asc' });

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(item => ({
            id: item.id,
            titulo: item.titulo || `${item.home_team_name} vs ${item.away_team_name}`,
            descricao: item.descricao,
            tipo: item.tipo || 'partida',
            status: item.status || 'rascunho',
            home_team_name: item.home_team_name,
            away_team_name: item.away_team_name,
            home_team_logo: item.home_team_logo,
            away_team_logo: item.away_team_logo,
            home_score: item.home_score,
            away_score: item.away_score,
            created_at: item.created_at,
            updated_at: item.updated_at,
            thumbnail_url: item.thumbnail_url
        }));
    },

    async getAnalysis(id: string): Promise<AnalysisData | null> {
        const { data: analysis, error } = await supabase
            .from('analyses')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !analysis) return null;

        // Update ultimo_acesso
        await supabase
            .from('analyses')
            .update({ ultimo_acesso: new Date().toISOString() })
            .eq('id', id);

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
                } else homeSubstitutes.push(playerObj);
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
            titulo: analysis.titulo,
            descricao: analysis.descricao,
            tipo: analysis.tipo,
            status: analysis.status,
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
    },

    async duplicateAnalysis(id: string): Promise<string> {
        const original = await this.getAnalysis(id);
        if (!original) throw new Error('Analysis not found');

        const duplicated = {
            ...original,
            id: undefined,
            titulo: `${original.titulo || 'Análise'} (Cópia)`,
            status: 'rascunho' as AnalysisStatus
        };

        return await this.saveAnalysis(duplicated);
    },

    async updateStatus(id: string, status: AnalysisStatus): Promise<void> {
        const { error } = await supabase
            .from('analyses')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },

    async createBlankAnalysis(tipo: AnalysisType = 'partida'): Promise<string> {
        // Generate default players for 4-3-3 formation
        const generateDefaultPlayers = (isHome: boolean): Player[] => {
            const baseId = isHome ? 1000 : 2000;
            const positions = [
                { id: baseId + 1, number: 1, name: 'Goleiro', position: { x: 50, y: 92 } },
                { id: baseId + 2, number: 2, name: 'Lateral D', position: { x: 85, y: 75 } },
                { id: baseId + 3, number: 3, name: 'Zagueiro', position: { x: 60, y: 78 } },
                { id: baseId + 4, number: 4, name: 'Zagueiro', position: { x: 40, y: 78 } },
                { id: baseId + 5, number: 5, name: 'Lateral E', position: { x: 15, y: 75 } },
                { id: baseId + 6, number: 6, name: 'Volante', position: { x: 50, y: 60 } },
                { id: baseId + 7, number: 8, name: 'Meia', position: { x: 70, y: 50 } },
                { id: baseId + 8, number: 10, name: 'Meia', position: { x: 30, y: 50 } },
                { id: baseId + 9, number: 7, name: 'Ponta D', position: { x: 80, y: 25 } },
                { id: baseId + 10, number: 9, name: 'Centroavante', position: { x: 50, y: 18 } },
                { id: baseId + 11, number: 11, name: 'Ponta E', position: { x: 20, y: 25 } },
            ];
            return positions;
        };

        const generateDefaultSubstitutes = (isHome: boolean): Player[] => {
            const baseId = isHome ? 1100 : 2100;
            return [
                { id: baseId + 1, number: 12, name: 'Goleiro Res', position: { x: 0, y: 0 } },
                { id: baseId + 2, number: 13, name: 'Reserva', position: { x: 0, y: 0 } },
                { id: baseId + 3, number: 14, name: 'Reserva', position: { x: 0, y: 0 } },
                { id: baseId + 4, number: 15, name: 'Reserva', position: { x: 0, y: 0 } },
                { id: baseId + 5, number: 16, name: 'Reserva', position: { x: 0, y: 0 } },
            ];
        };

        const homePlayers = generateDefaultPlayers(true);
        const awayPlayers = generateDefaultPlayers(false);
        const homeSubs = generateDefaultSubstitutes(true);
        const awaySubs = generateDefaultSubstitutes(false);

        const blankData: AnalysisData = {
            titulo: 'Nova Análise',
            tipo,
            status: 'rascunho',
            homeTeam: 'Time Casa',
            awayTeam: 'Time Visitante',
            gameNotes: '',
            notasCasa: '',
            notasVisitante: '',
            homeTeamNotes: '',
            homeOffNotes: '',
            awayTeamNotes: '',
            awayOffNotes: '',
            homePlayersDef: homePlayers,
            homePlayersOff: homePlayers.map(p => ({ ...p })), // Clone for offensive phase
            awayPlayersDef: awayPlayers,
            awayPlayersOff: awayPlayers.map(p => ({ ...p })), // Clone for offensive phase
            homeSubstitutes: homeSubs,
            awaySubstitutes: awaySubs,
            homeArrowsDef: [],
            homeArrowsOff: [],
            awayArrowsDef: [],
            awayArrowsOff: [],
            tags: []
        };

        return await this.saveAnalysis(blankData);
    }
};
