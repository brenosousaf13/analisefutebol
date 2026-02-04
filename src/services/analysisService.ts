import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import type { Rectangle } from '../types/Rectangle';

export type AnalysisStatus = 'rascunho' | 'em_andamento' | 'finalizada';
export type AnalysisType = 'partida' | 'treino' | 'adversario' | 'modelo_tatico' | 'analise_completa';

export interface AnalysisData {
    id?: string;
    matchId?: number | null;
    matchDate?: string;
    matchTime?: string;
    shareToken?: string;
    homeCoach?: string;
    awayCoach?: string;

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
    // Detailed Notes (Legacy/Specific)
    notasCasa: string;
    notasCasaUpdatedAt?: string;
    notasVisitante: string;
    notasVisitanteUpdatedAt?: string;

    // Phase Notes (New Layout - Team Specific)
    homeDefensiveNotes: string;
    homeOffensiveNotes: string;
    homeBenchNotes: string;
    awayDefensiveNotes: string;
    awayOffensiveNotes: string;
    awayBenchNotes: string;

    // Deprecated Global Notes (Keeping for type safety during migration)
    defensiveNotes?: string;
    offensiveNotes?: string;

    // Colors
    homeTeamColor: string;
    awayTeamColor: string;

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

    // Rectangles
    homeRectanglesDef: Rectangle[];
    homeRectanglesOff: Rectangle[];
    awayRectanglesDef: Rectangle[];
    awayRectanglesOff: Rectangle[];

    // Ball Positions
    homeBallDef?: { x: number, y: number };
    homeBallOff?: { x: number, y: number };
    awayBallDef?: { x: number, y: number };
    awayBallOff?: { x: number, y: number };

    // Events (stored as JSONB)
    events?: any[];

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
    home_team_color?: string;
    away_team_color?: string;
    home_score: number;
    away_score: number;
    created_at: string;
    updated_at: string;
    thumbnail_url?: string;
}

export interface AnalysisFilters {
    status?: AnalysisStatus | 'todas';
    search?: string;
    fixtureId?: number;
    orderBy?: 'created_at' | 'updated_at' | 'titulo';
    orderDirection?: 'asc' | 'desc';
    searchType?: 'all' | 'team' | 'match' | 'player' | 'coach';
}

export const analysisService = {
    async saveAnalysis(data: AnalysisData): Promise<string> {
        try {


            let analysisId = data.id;

            // Generate titulo if not provided
            const titulo = data.titulo || `${data.homeTeam} vs ${data.awayTeam}`;

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error("Usuário não autenticado");

            const analysisPayload = {
                user_id: user.id,
                fixture_id: data.matchId || null,
                match_date: data.matchDate,
                match_time: data.matchTime,
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

                // Old notes
                notas_casa: data.notasCasa,
                notas_casa_updated_at: data.notasCasaUpdatedAt,
                notas_visitante: data.notasVisitante,
                notas_visitante_updated_at: data.notasVisitanteUpdatedAt,

                // New Team Specific Fields
                home_defensive_notes: data.homeDefensiveNotes,
                home_offensive_notes: data.homeOffensiveNotes,
                home_bench_notes: data.homeBenchNotes,

                away_defensive_notes: data.awayDefensiveNotes,
                away_offensive_notes: data.awayOffensiveNotes,
                away_bench_notes: data.awayBenchNotes,

                // Legacy global fields
                defensive_notes: data.defensiveNotes || '',
                offensive_notes: data.offensiveNotes || '',

                home_coach: data.homeCoach,
                away_coach: data.awayCoach,

                // Ball Positions
                home_ball_def: data.homeBallDef,
                home_ball_off: data.homeBallOff,
                away_ball_def: data.awayBallDef,
                away_ball_off: data.awayBallOff,

                events: data.events || [],
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
            await supabase.from('analysis_rectangles').delete().eq('analysis_id', analysisId);

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
                note: p.note || null,
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

            // Rectangles
            const rectanglesToInsert = [
                ...data.homeRectanglesDef.map(r => ({ ...r, team: 'home', variant: 'defensive' })),
                ...data.homeRectanglesOff.map(r => ({ ...r, team: 'home', variant: 'offensive' })),
                ...data.awayRectanglesDef.map(r => ({ ...r, team: 'away', variant: 'defensive' })),
                ...data.awayRectanglesOff.map(r => ({ ...r, team: 'away', variant: 'offensive' }))
            ].map((r: any) => ({
                analysis_id: analysisId,
                team: r.team,
                variant: r.variant,
                start_x: r.startX,
                start_y: r.startY,
                end_x: r.endX,
                end_y: r.endY,
                color: r.color,
                opacity: r.opacity
            }));

            if (rectanglesToInsert.length > 0) {
                const { error } = await supabase.from('analysis_rectangles').insert(rectanglesToInsert);
                if (error) throw error;
            }

            return analysisId;

        } catch (error) {

            throw error;
        }
    },

    async getMyAnalyses(filters?: AnalysisFilters): Promise<SavedAnalysisSummary[]> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuário não autenticado");

        let query = supabase
            .from('analyses')
            .select(`
                id, titulo, descricao, tipo, status,
                home_team_name, away_team_name, home_team_logo, away_team_logo,
                home_team_color, away_team_color,
                home_score, away_score, created_at, updated_at, thumbnail_url
            `)
            .eq('user_id', user.id); // STRICT FILTER: Only show my own analyses

        if (filters?.status && filters.status !== 'todas') {
            query = query.eq('status', filters.status);
        }

        if (filters?.fixtureId) {
            query = query.eq('fixture_id', filters.fixtureId);
        }

        if (filters?.search && filters.search.trim() !== '') {
            const searchTerm = filters.search.trim();
            const searchType = filters.searchType || 'all';

            switch (searchType) {
                case 'team':
                    query = query.or(`home_team_name.ilike.%${searchTerm}%,away_team_name.ilike.%${searchTerm}%`);
                    break;
                case 'match':
                    query = query.or(`titulo.ilike.%${searchTerm}%,home_team_name.ilike.%${searchTerm}%,away_team_name.ilike.%${searchTerm}%`);
                    break;
                case 'coach':
                    query = query.or(`home_coach.ilike.%${searchTerm}%,away_coach.ilike.%${searchTerm}%`);
                    break;
                case 'player':
                    // Player search requires a subquery or separate lookup
                    const { data: players } = await supabase
                        .from('analysis_players')
                        .select('analysis_id')
                        .ilike('name', `%${searchTerm}%`);

                    if (players && players.length > 0) {
                        const ids = players.map(p => p.analysis_id);
                        query = query.in('id', ids);
                    } else {
                        return [];
                    }
                    break;
                case 'all':
                default:
                    query = query.or(`titulo.ilike.%${searchTerm}%,home_team_name.ilike.%${searchTerm}%,away_team_name.ilike.%${searchTerm}%,home_coach.ilike.%${searchTerm}%,away_coach.ilike.%${searchTerm}%`);
                    break;
            }
        }

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
            home_team_color: item.home_team_color,
            away_team_color: item.away_team_color,
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

        await supabase
            .from('analyses')
            .update({ ultimo_acesso: new Date().toISOString() })
            .eq('id', id);

        const { data: players } = await supabase.from('analysis_players').select('*').eq('analysis_id', id);
        const { data: arrows } = await supabase.from('analysis_arrows').select('*').eq('analysis_id', id);
        const { data: rectangles } = await supabase.from('analysis_rectangles').select('*').eq('analysis_id', id);

        const homePlayersDef: Player[] = [];
        const homePlayersOff: Player[] = [];
        const awayPlayersDef: Player[] = [];
        const awayPlayersOff: Player[] = [];
        const homeSubstitutes: Player[] = [];
        const awaySubstitutes: Player[] = [];

        players?.forEach(p => {
            const playerObj: Player = {
                id: p.player_id, name: p.name, number: p.number, position: { x: p.x, y: p.y }, note: p.note
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

        const homeRectanglesDef: Rectangle[] = [];
        const homeRectanglesOff: Rectangle[] = [];
        const awayRectanglesDef: Rectangle[] = [];
        const awayRectanglesOff: Rectangle[] = [];

        rectangles?.forEach(r => {
            const rectObj: Rectangle = {
                id: r.id, startX: r.start_x, startY: r.start_y, endX: r.end_x, endY: r.end_y, color: r.color, opacity: r.opacity
            };
            const variant = r.variant || 'defensive';
            if (r.team === 'home') {
                if (variant === 'defensive') homeRectanglesDef.push(rectObj);
                else homeRectanglesOff.push(rectObj);
            } else {
                if (variant === 'defensive') awayRectanglesDef.push(rectObj);
                else awayRectanglesOff.push(rectObj);
            }
        });

        return {
            id: analysis.id,
            matchId: analysis.fixture_id,
            matchDate: analysis.match_date,
            matchTime: analysis.match_time,
            shareToken: analysis.share_token,
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

            notasCasa: analysis.notas_casa || '',
            notasCasaUpdatedAt: analysis.notas_casa_updated_at,
            notasVisitante: analysis.notas_visitante || '',
            notasVisitanteUpdatedAt: analysis.notas_visitante_updated_at,

            homeDefensiveNotes: analysis.home_defensive_notes || '',
            homeOffensiveNotes: analysis.home_offensive_notes || '',
            homeBenchNotes: analysis.home_bench_notes || '',
            awayDefensiveNotes: analysis.away_defensive_notes || '',
            awayOffensiveNotes: analysis.away_offensive_notes || '',
            awayBenchNotes: analysis.away_bench_notes || '',

            defensiveNotes: analysis.defensive_notes || '',
            offensiveNotes: analysis.offensive_notes || '',
            homeTeamColor: analysis.home_team_color || '#EF4444',
            awayTeamColor: analysis.away_team_color || '#3B82F6',

            homePlayersDef, homePlayersOff, awayPlayersDef, awayPlayersOff,
            homeSubstitutes, awaySubstitutes,
            homeArrowsDef, homeArrowsOff, awayArrowsDef, awayArrowsOff,
            homeRectanglesDef, homeRectanglesOff, awayRectanglesDef, awayRectanglesOff,
            events: analysis.events || [],
            homeCoach: analysis.home_coach,
            awayCoach: analysis.away_coach,
            tags: [],

            // Ball Positions
            homeBallDef: analysis.home_ball_def,
            homeBallOff: analysis.home_ball_off,
            awayBallDef: analysis.away_ball_def,
            awayBallOff: analysis.away_ball_off
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

    generateDefaultPlayers(isHome: boolean): Player[] {
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
    },

    generateDefaultSubstitutes(isHome: boolean): Player[] {
        const baseId = isHome ? 1100 : 2100;
        const subs: Player[] = [];
        for (let i = 0; i < 11; i++) {
            subs.push({
                id: baseId + i + 1,
                number: 12 + i,
                name: `Reserva ${12 + i}`,
                position: { x: 0, y: 0 }
            });
        }
        return subs;
    },

    generateFullModePlayers(isHome: boolean): Player[] {
        const baseId = isHome ? 1000 : 2000;

        // 4-3-3 Formation Coordinates (Home on Left, Away on Right)
        const homePositions = [
            { id: 1, name: 'Goleiro', number: 1, x: 5, y: 50 },
            { id: 2, name: 'Lateral D', number: 2, x: 20, y: 15 },
            { id: 3, name: 'Zagueiro', number: 3, x: 15, y: 35 },
            { id: 4, name: 'Zagueiro', number: 4, x: 15, y: 65 },
            { id: 5, name: 'Lateral E', number: 5, x: 20, y: 85 },
            { id: 6, name: 'Volante', number: 6, x: 30, y: 50 },
            { id: 7, name: 'Ponta D', number: 7, x: 45, y: 20 },
            { id: 8, name: 'Meia', number: 8, x: 40, y: 35 },
            { id: 9, name: 'Centroavante', number: 9, x: 45, y: 50 },
            { id: 10, name: 'Meia', number: 10, x: 40, y: 65 },
            { id: 11, name: 'Ponta E', number: 11, x: 45, y: 80 }
        ];

        const players: Player[] = homePositions.map(pos => {
            const x = isHome ? pos.x : 100 - pos.x;
            // Mirror Y for Away team if we assume they face left?
            // If Home Lat D(2) is at y=15 (Top), Away Lat D(2) at x=80, should differ?
            // If Away Lat D is Right Back, and they face left:
            // their Left is Top (y=0 to 50), Right is Bottom (y=50 to 100).
            // So Away Lat D should be at y=85.
            // Home Lat D is at y=15 (Top).
            // So we DO Mirror Y (100-y) for symmetric positions?
            // Let's mirror Y as well to ensure "Right Back" is always on the "Right side relative to facing".
            // Home (Face Right): Right is Bottom (y>50)? No, coordinates usually: Top=0.
            // If I stand at 0, facing 100. Left hand is Top (y<50). Right hand is Bottom (y>50).
            // So Left Back (5) should be Top (y=15). Right Back (2) should be Bottom (y=85).
            // My `homePositions` above has Lat D(2) at y=15 (Top). So that corresponds to LEFT Back in simulation terms?
            // In TV view: Top is "Far side", Bottom is "Near side".
            // Usually Left Back is Top (if attacking Right).
            // Let's assume user wants Lat D at Top.
            // Then Away Lat D should be at Top (y=15) too if they want same formation?
            // Or mirrored? Usually mirrored diagonally?
            // Let's keep Y same for simplicity, logic: "Lat D is Top".
            // If user wants mirror, they can move. "Like the image".
            // Image: Red 2 is Top. Blue 2 is Bottom.
            // Image: Red 5 is Bottom. Blue 5 is Top.
            // So they ARE mirrored.
            // So if !isHome, y = 100 - y.

            const y = isHome ? pos.y : 100 - pos.y;

            return {
                id: baseId + pos.id,
                number: pos.number,
                name: pos.name,
                position: { x, y }
            };
        });

        return players;
    },

    async createBlankAnalysis(tipo: AnalysisType = 'partida', initialData?: Partial<AnalysisData>): Promise<string> {
        let homePlayers: Player[];
        let awayPlayers: Player[];

        if (tipo === 'analise_completa') {
            homePlayers = this.generateFullModePlayers(true);
            awayPlayers = this.generateFullModePlayers(false);
        } else {
            homePlayers = this.generateDefaultPlayers(true);
            awayPlayers = this.generateDefaultPlayers(false);
        }

        const homeSubs = this.generateDefaultSubstitutes(true);
        const awaySubs = this.generateDefaultSubstitutes(false);


        const blankData: AnalysisData = {
            titulo: 'Nova Análise',
            tipo,
            status: 'rascunho',
            homeTeam: 'Time Casa',
            awayTeam: 'Time Visitante',
            notasCasa: '',
            notasVisitante: '',

            homeDefensiveNotes: '',
            homeOffensiveNotes: '',
            homeBenchNotes: '',
            awayDefensiveNotes: '',
            awayOffensiveNotes: '',
            awayBenchNotes: '',

            homeCoach: '',
            awayCoach: '',

            defensiveNotes: '',
            offensiveNotes: '',
            homeTeamColor: '#EF4444',
            awayTeamColor: '#3B82F6',

            homePlayersDef: homePlayers,
            homePlayersOff: homePlayers.map(p => ({ ...p })),
            awayPlayersDef: awayPlayers,
            awayPlayersOff: awayPlayers.map(p => ({ ...p })),
            homeSubstitutes: homeSubs,
            awaySubstitutes: awaySubs,
            homeArrowsDef: [],
            homeArrowsOff: [],
            awayArrowsDef: [],
            awayArrowsOff: [],
            homeRectanglesDef: [],
            homeRectanglesOff: [],
            awayRectanglesDef: [],
            awayRectanglesOff: [],
            tags: [],
            ...initialData
        };

        return await this.saveAnalysis(blankData);
    },

    async generateShareLink(id: string): Promise<string> {
        const { data, error } = await supabase
            .from('analyses')
            .update({ share_token: uuidv4() }) // Ensure uuidv4 is imported or use SQL extension
            .eq('id', id)
            .select('share_token')
            .single();

        if (error) throw error;
        return data.share_token;
    },

    async getSharedAnalysis(token: string): Promise<AnalysisData | null> {
        const { data: analysis, error } = await supabase
            .from('analyses')
            .select('*')
            .eq('share_token', token)
            .single();

        if (error || !analysis) return null;

        // Fetch related data (public policies allow this if token matches)
        const id = analysis.id;
        const { data: players } = await supabase.from('analysis_players').select('*').eq('analysis_id', id);
        const { data: arrows } = await supabase.from('analysis_arrows').select('*').eq('analysis_id', id);
        const { data: rectangles } = await supabase.from('analysis_rectangles').select('*').eq('analysis_id', id);

        // Same mapping logic as getAnalysis...
        // Reuse mapping logic by extracting a private helper function? 
        // For now, I'll duplicate the mapping to avoid refactoring risk, 
        // or I can call a shared mapper if I create one.
        // Let's duplicate carefully to ensure safety.

        const homePlayersDef: Player[] = [];
        const homePlayersOff: Player[] = [];
        const awayPlayersDef: Player[] = [];
        const awayPlayersOff: Player[] = [];
        const homeSubstitutes: Player[] = [];
        const awaySubstitutes: Player[] = [];

        players?.forEach(p => {
            const playerObj: Player = {
                id: p.player_id, name: p.name, number: p.number, position: { x: p.x, y: p.y }, note: p.note
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

        const homeRectanglesDef: Rectangle[] = [];
        const homeRectanglesOff: Rectangle[] = [];
        const awayRectanglesDef: Rectangle[] = [];
        const awayRectanglesOff: Rectangle[] = [];

        rectangles?.forEach(r => {
            const rectObj: Rectangle = {
                id: r.id, startX: r.start_x, startY: r.start_y, endX: r.end_x, endY: r.end_y, color: r.color, opacity: r.opacity
            };
            const variant = r.variant || 'defensive';
            if (r.team === 'home') {
                if (variant === 'defensive') homeRectanglesDef.push(rectObj);
                else homeRectanglesOff.push(rectObj);
            } else {
                if (variant === 'defensive') awayRectanglesDef.push(rectObj);
                else awayRectanglesOff.push(rectObj);
            }
        });

        return {
            id: analysis.id,
            matchId: analysis.fixture_id,
            matchDate: analysis.match_date,
            matchTime: analysis.match_time,
            shareToken: analysis.share_token,
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

            notasCasa: analysis.notas_casa || '',
            notasCasaUpdatedAt: analysis.notas_casa_updated_at,
            notasVisitante: analysis.notas_visitante || '',
            notasVisitanteUpdatedAt: analysis.notas_visitante_updated_at,

            homeDefensiveNotes: analysis.home_defensive_notes || '',
            homeOffensiveNotes: analysis.home_offensive_notes || '',
            homeBenchNotes: analysis.home_bench_notes || '',
            awayDefensiveNotes: analysis.away_defensive_notes || '',
            awayOffensiveNotes: analysis.away_offensive_notes || '',
            awayBenchNotes: analysis.away_bench_notes || '',

            defensiveNotes: analysis.defensive_notes || '',
            offensiveNotes: analysis.offensive_notes || '',
            homeTeamColor: analysis.home_team_color || '#EF4444',
            awayTeamColor: analysis.away_team_color || '#3B82F6',

            homePlayersDef, homePlayersOff, awayPlayersDef, awayPlayersOff,
            homeSubstitutes, awaySubstitutes,
            homeArrowsDef, homeArrowsOff, awayArrowsDef, awayArrowsOff,
            homeRectanglesDef, homeRectanglesOff, awayRectanglesDef, awayRectanglesOff,
            events: analysis.events || [],
            homeCoach: analysis.home_coach,
            awayCoach: analysis.away_coach,
            tags: []
        };
    }
};
