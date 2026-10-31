import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import type { Rectangle } from '../types/Rectangle';
import { sharedAnalysisFromPayload, type SharedAnalysisPayload } from './sharedAnalysisData';
import { normalizeAnalysisPlayers } from '../utils/uniquePlayers.ts';
import { buildAnalysisSavePayload } from './analysisSavePayload';

export type AnalysisStatus = 'rascunho' | 'em_andamento' | 'finalizada';
export type AnalysisType = 'partida' | 'treino' | 'adversario' | 'modelo_tatico' | 'analise_completa';

// New Board Interface
export interface AnalysisBoard {
    id: string;
    title: string;
    order: number;
    // Each board contains its own state
    homePlayersDef: Player[];
    homePlayersOff: Player[];
    awayPlayersDef: Player[];
    awayPlayersOff: Player[];
    homeSubstitutes: Player[];
    awaySubstitutes: Player[];
    homeArrowsDef: Arrow[];
    homeArrowsOff: Arrow[];
    awayArrowsDef: Arrow[];
    awayArrowsOff: Arrow[];
    homeRectanglesDef: Rectangle[];
    homeRectanglesOff: Rectangle[];
    awayRectanglesDef: Rectangle[];
    awayRectanglesOff: Rectangle[];
    homeBallDef?: { x: number, y: number };
    homeBallOff?: { x: number, y: number };
    awayBallDef?: { x: number, y: number };
    awayBallOff?: { x: number, y: number };
}

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
    competition?: string;

    homeTeam: string;
    awayTeam: string;
    homeTeamLogo?: string;
    awayTeamLogo?: string;
    homeScore?: number;
    awayScore?: number;

    // Notes
    notasCasa: string;
    notasCasaUpdatedAt?: string;
    notasVisitante: string;
    notasVisitanteUpdatedAt?: string;

    homeDefensiveNotes: string;
    homeOffensiveNotes: string;
    homeBenchNotes: string;
    awayDefensiveNotes: string;
    awayOffensiveNotes: string;
    awayBenchNotes: string;

    /**
     * Anotacao unica do time, com formatacao (HTML sanitizado).
     * Substitui a dupla ofensiva/defensiva nas analises NOVAS — os campos
     * acima seguem intactos para as antigas, que serao migradas depois.
     * Migration: 20260801_field_texts_and_rich_notes.sql
     */
    homeNoteHtml?: string;
    awayNoteHtml?: string;

    defensiveNotes?: string;
    offensiveNotes?: string;

    homeTeamColor: string;
    awayTeamColor: string;
    homeTeamBgColor?: string;
    awayTeamBgColor?: string;

    // Events
    events?: any[];
    tags: string[];

    // Boards Support - If boards are present, they override the root level items for display inside tabs
    // Root level items (below) are kept for backward compatibility (acting as Default Board)
    boards?: AnalysisBoard[];

    // Players (Default Board / Legacy)
    homePlayersDef: Player[];
    homePlayersOff: Player[];
    awayPlayersDef: Player[];
    awayPlayersOff: Player[];
    homeSubstitutes: Player[];
    awaySubstitutes: Player[];

    // Arrows (Default Board / Legacy)
    homeArrowsDef: Arrow[];
    homeArrowsOff: Arrow[];
    awayArrowsDef: Arrow[];
    awayArrowsOff: Arrow[];

    // Rectangles (Default Board / Legacy)
    homeRectanglesDef: Rectangle[];
    homeRectanglesOff: Rectangle[];
    awayRectanglesDef: Rectangle[];
    awayRectanglesOff: Rectangle[];

    // Ball Positions (Default Board / Legacy)
    homeBallDef?: { x: number, y: number };
    homeBallOff?: { x: number, y: number };
    awayBallDef?: { x: number, y: number };
    awayBallOff?: { x: number, y: number };
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
    home_team_bg_color?: string;
    away_team_bg_color?: string;
    home_score: number;
    away_score: number;
    created_at: string;
    updated_at: string;
    thumbnail_url?: string;
    /** Id do jogo na API-Football, quando a analise nasceu de uma partida real. */
    fixtureId?: number;
    /** Indefinido enquanto a migration 20260731_add_competition.sql nao rodar. */
    competition?: string;
}

/**
 * A coluna `competition` foi adicionada pela migration 20260731_add_competition.sql.
 * Enquanto ela nao existir no banco, o app segue funcionando sem o campo: a primeira
 * consulta que falhar marca a coluna como ausente e refaz a chamada sem ela.
 */
let competitionColumn: 'unknown' | 'present' | 'absent' = 'unknown';


function isMissingCompetitionError(error: { message?: string } | null): boolean {
    if (!error) return false;
    const msg = (error.message || '').toLowerCase();
    // PostgREST: "column analyses.competition does not exist" (select)
    //            "Could not find the 'competition' column ... in the schema cache" (insert)
    return msg.includes('competition');
}

/** Linha crua devolvida pelo select de getMyAnalyses. */
interface AnalysisSummaryRow {
    id: string;
    titulo: string | null;
    descricao: string | null;
    tipo: AnalysisType | null;
    status: AnalysisStatus | null;
    home_team_name: string;
    away_team_name: string;
    home_team_logo: string;
    away_team_logo: string;
    home_team_color: string | null;
    away_team_color: string | null;
    home_team_bg_color: string | null;
    away_team_bg_color: string | null;
    home_score: number;
    away_score: number;
    created_at: string;
    updated_at: string;
    thumbnail_url: string | null;
    fixture_id: number | null;
    competition?: string | null;
}

export interface AnalysisFilters {
    status?: AnalysisStatus | 'todas';
    search?: string;
    fixtureId?: number;
    orderBy?: 'created_at' | 'updated_at' | 'titulo';
    orderDirection?: 'asc' | 'desc';
    searchType?: 'all' | 'team' | 'match' | 'player' | 'coach' | 'tag';
}

export const analysisService = {
    async saveAnalysis(data: AnalysisData): Promise<string> {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('Usuário não autenticado');
        const payload = buildAnalysisSavePayload(data);
        const { data: savedId, error } = await supabase.rpc('save_analysis_v1', { p_payload: payload });
        // Never fall back to the old sequence of independent deletes/inserts.
        if (error) throw error;
        if (savedId !== payload.id) throw new Error('O banco não confirmou o salvamento da análise.');
        return savedId;
    },

    async getMyAnalyses(filters?: AnalysisFilters): Promise<SavedAnalysisSummary[]> {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error("Usuário não autenticado");

        const buildSelect = (withCompetition: boolean) => `
                id, titulo, descricao, tipo, status,
                home_team_name, away_team_name, home_team_logo, away_team_logo,
                home_team_color, away_team_color,
                home_score, away_score, created_at, updated_at, thumbnail_url, fixture_id
                ${withCompetition ? ', competition' : ''}
            `;

        const buildQuery = (withCompetition: boolean) => supabase
            .from('analyses')
            .select(buildSelect(withCompetition))
            .eq('user_id', user.id); // STRICT FILTER: Only show my own analyses

        // A busca por jogador exige um lookup separado antes de montar a query
        // principal, entao roda uma vez so — fora do builder, que pode repetir.
        let playerAnalysisIds: string[] | null = null;
        if (filters?.search?.trim() && (filters.searchType || 'all') === 'player') {
            const { data: players } = await supabase
                .from('analysis_players')
                .select('analysis_id')
                .ilike('name', `%${filters.search.trim()}%`);

            playerAnalysisIds = (players || []).map(p => p.analysis_id);
            if (playerAnalysisIds.length === 0) return [];
        }

        // Montada como funcao para poder ser refeita sem `competition`
        // caso a migration ainda nao tenha rodado.
        const runQuery = (withCompetition: boolean) => {
            let query = buildQuery(withCompetition);

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
                        query = query.in('id', playerAnalysisIds || []);
                        break;
                    case 'tag':
                        query = query.contains('tags', [searchTerm]);
                        break;
                    case 'all':
                    default:
                        query = query.or(`titulo.ilike.%${searchTerm}%,home_team_name.ilike.%${searchTerm}%,away_team_name.ilike.%${searchTerm}%,home_coach.ilike.%${searchTerm}%,away_coach.ilike.%${searchTerm}%`);
                        // Note: querying tags in "OR" with ilike is hard in Supabase/PostgREST without generic text search
                        // but we can try basic text match if needed, or leave tags for explicit search
                        break;
                }
            }

            const orderBy = filters?.orderBy || 'created_at';
            const orderDirection = filters?.orderDirection || 'desc';
            return query.order(orderBy, { ascending: orderDirection === 'asc' });
        };

        let { data, error } = await runQuery(competitionColumn !== 'absent');

        if (error && competitionColumn !== 'absent' && isMissingCompetitionError(error)) {
            // Migration 20260731_add_competition.sql ainda nao rodou neste banco.
            competitionColumn = 'absent';
            ({ data, error } = await runQuery(false));
        } else if (!error && competitionColumn === 'unknown') {
            competitionColumn = 'present';
        }

        if (error) throw error;

        // O select e montado dinamicamente (por causa de `competition`), entao o
        // Supabase nao consegue inferir a forma da linha — declarada aqui.
        const rows = (data || []) as unknown as AnalysisSummaryRow[];

        return rows.map(item => ({
            id: item.id,
            titulo: item.titulo || `${item.home_team_name} vs ${item.away_team_name}`,
            descricao: item.descricao ?? undefined,
            tipo: item.tipo || 'partida',
            status: item.status || 'rascunho',
            home_team_name: item.home_team_name,
            away_team_name: item.away_team_name,
            home_team_logo: item.home_team_logo,
            away_team_logo: item.away_team_logo,
            home_team_color: item.home_team_color ?? undefined,
            away_team_color: item.away_team_color ?? undefined,
            home_team_bg_color: item.home_team_bg_color ?? undefined,
            away_team_bg_color: item.away_team_bg_color ?? undefined,
            home_score: item.home_score,
            away_score: item.away_score,
            created_at: item.created_at,
            updated_at: item.updated_at,
            thumbnail_url: item.thumbnail_url ?? undefined,
            fixtureId: item.fixture_id ?? undefined,
            competition: item.competition ?? undefined
        }));
    },

    async getAnalysis(id: string): Promise<AnalysisData | null> {
        const { data: analysis, error } = await supabase
            .from('analyses')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!analysis) return null;

        await supabase
            .from('analyses')
            .update({ ultimo_acesso: new Date().toISOString() })
            .eq('id', id);

        // Fetch Boards
        const { data: boardsData, error: boardsError } = await supabase
            .from('analysis_boards')
            .select('*')
            .eq('analysis_id', id)
            .order('order', { ascending: true });
        if (boardsError) throw boardsError;

        const { data: players, error: playersError } = await supabase.from('analysis_players').select('*').eq('analysis_id', id);
        if (playersError) throw playersError;
        const { data: arrows, error: arrowsError } = await supabase.from('analysis_arrows').select('*').eq('analysis_id', id);
        if (arrowsError) throw arrowsError;
        const { data: rectangles, error: rectanglesError } = await supabase.from('analysis_rectangles').select('*').eq('analysis_id', id);
        if (rectanglesError) throw rectanglesError;

        // Helper to process items for a specific board (or null for default)
        const processItems = (boardId: string | null) => {
            const homePlayersDef: Player[] = [];
            const homePlayersOff: Player[] = [];
            const awayPlayersDef: Player[] = [];
            const awayPlayersOff: Player[] = [];
            const homeSubstitutes: Player[] = [];
            const awaySubstitutes: Player[] = [];

            players?.filter(p => (p.board_id === boardId) || (boardId === null && !p.board_id)).forEach(p => {
                const playerObj: Player = {
                    id: p.player_id,
                    name: p.name,
                    number: p.number,
                    position: { x: p.x, y: p.y },
                    note: p.note
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

            arrows?.filter(a => (a.board_id === boardId) || (boardId === null && !a.board_id)).forEach(a => {
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

            rectangles?.filter(r => (r.board_id === boardId) || (boardId === null && !r.board_id)).forEach(r => {
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

            // Ball positions are currently stored on Analysis root, not per board in DB schema based on user request (implied "maintain logic").
            // However, typical usage would want ball per board. 
            // The current DB schema wasn't updated to move ball positions to a separate table or add board_id to analyses (impossible).
            // A truly independent board usually needs its own ball. 
            // Since I didn't add a `analysis_balls` table, I will just replicate the root ball positions for now, 
            // OR if I strictly follow "same logic", ball is shared unless I store it in JSON or new table.
            // Let's check `AnalysisBoard` interface I just wrote matches `homeBallDef` etc present.
            // I added `homeBallDef` to `AnalysisBoard`. 
            // But where do I persist it? I missed adding `ball_positions` columns to `analysis_boards` in the schema plan?
            // The user said "maintain same logics". 
            // Use defaults for now from root, as I can't change schema again easily without user interaction.
            // Wait, I can try to use the root values as defaults.

            return {
                homePlayersDef, homePlayersOff, awayPlayersDef, awayPlayersOff,
                homeSubstitutes, awaySubstitutes,
                homeArrowsDef, homeArrowsOff, awayArrowsDef, awayArrowsOff,
                homeRectanglesDef, homeRectanglesOff, awayRectanglesDef, awayRectanglesOff,
                // Inherit from analysis root for now as specific columns missing in boards table
                homeBallDef: analysis.home_ball_def,
                homeBallOff: analysis.home_ball_off,
                awayBallDef: analysis.away_ball_def,
                awayBallOff: analysis.away_ball_off,
            };
        };

        // Process Default Board (Legacy items with null board_id)
        const defaultBoardItems = processItems(null);

        // Process Additional Boards
        const boards: AnalysisBoard[] = (boardsData || []).map(b => {
            const items = processItems(b.id);
            return {
                id: b.id,
                title: b.title,
                order: b.order,
                ...items
            };
        });

        return normalizeAnalysisPlayers({
            id: analysis.id,
            matchId: analysis.fixture_id,
            matchDate: analysis.match_date,
            matchTime: analysis.match_time,
            shareToken: analysis.share_token,
            competition: analysis.competition ?? undefined,
            homeNoteHtml: analysis.home_note_html ?? undefined,
            awayNoteHtml: analysis.away_note_html ?? undefined,
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
            homeTeamBgColor: analysis.home_team_bg_color || '#090909',
            awayTeamBgColor: analysis.away_team_bg_color || '#090909',

            // Default Board Items (Legacy/Root)
            ...defaultBoardItems,

            events: analysis.events || [],
            homeCoach: analysis.home_coach,
            awayCoach: analysis.away_coach,
            tags: analysis.tags || [],

            boards
        });
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
        const { data: current, error: currentError } = await supabase
            .from('analyses')
            .select('share_token')
            .eq('id', id)
            .single();

        if (currentError) throw currentError;
        if (current?.share_token) return current.share_token;

        const newToken = uuidv4();
        const { data, error } = await supabase
            .from('analyses')
            .update({ share_token: newToken })
            .eq('id', id)
            .is('share_token', null)
            .select('share_token')
            .maybeSingle();

        if (error) throw error;
        if (data?.share_token) return data.share_token;

        // Outra aba pode ter criado o link entre a leitura e a atualização.
        const { data: latest, error: latestError } = await supabase
            .from('analyses')
            .select('share_token')
            .eq('id', id)
            .single();

        if (latestError) throw latestError;
        if (latest?.share_token) return latest.share_token;
        throw new Error('Não foi possível criar o link de compartilhamento.');
    },

    async getSharedAnalysis(token: string): Promise<AnalysisData | null> {
        // Reject malformed UUIDs before calling the public token reader.
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
            return null;
        }
        const { data, error } = await supabase.rpc('get_shared_analysis_v1', { p_token: token });
        if (error) throw error;
        return sharedAnalysisFromPayload(data as SharedAnalysisPayload | null, token);
    }
};
