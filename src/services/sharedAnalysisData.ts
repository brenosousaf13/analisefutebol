import type { AnalysisData, AnalysisBoard } from './analysisService';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import type { Rectangle } from '../types/Rectangle';

type Phase = 'defensive' | 'offensive';
type Team = 'home' | 'away';
type Ball = { x: number; y: number };

interface SharedAnalysisRow {
    id: string;
    fixture_id?: number | null;
    match_date?: string;
    match_time?: string;
    titulo?: string;
    descricao?: string;
    tipo?: AnalysisData['tipo'];
    status?: AnalysisData['status'];
    competition?: string | null;
    home_team_name: string;
    away_team_name: string;
    home_team_logo?: string;
    away_team_logo?: string;
    home_score?: number;
    away_score?: number;
    home_team_color?: string | null;
    away_team_color?: string | null;
    home_team_bg_color?: string | null;
    away_team_bg_color?: string | null;
    home_coach?: string;
    away_coach?: string;
    notas_casa?: string | null;
    notas_visitante?: string | null;
    notas_casa_updated_at?: string;
    notas_visitante_updated_at?: string;
    home_defensive_notes?: string | null;
    home_offensive_notes?: string | null;
    home_bench_notes?: string | null;
    away_defensive_notes?: string | null;
    away_offensive_notes?: string | null;
    away_bench_notes?: string | null;
    home_note_html?: string | null;
    away_note_html?: string | null;
    defensive_notes?: string | null;
    offensive_notes?: string | null;
    home_ball_def?: Ball;
    home_ball_off?: Ball;
    away_ball_def?: Ball;
    away_ball_off?: Ball;
    events?: AnalysisData['events'];
    tags?: string[] | null;
}

interface SharedItem {
    id: string;
    board_id: string | null;
    team: Team | null;
    variant: Phase | null;
}

interface SharedPlayer extends SharedItem {
    player_id: number;
    name: string;
    number: number;
    type: 'field' | 'bench';
    x: number;
    y: number;
    note?: string | null;
    is_manual?: boolean;
}

interface SharedDrawing extends SharedItem {
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
    color: string;
}

interface SharedRectangle extends SharedDrawing {
    opacity: number;
}

export interface SharedAnalysisPayload {
    analysis: SharedAnalysisRow;
    boards: { id: string; title: string; order: number }[];
    players: SharedPlayer[];
    arrows: SharedDrawing[];
    rectangles: SharedRectangle[];
}

/** Convert the token-scoped response; no database requests or ownership data. */
export function sharedAnalysisFromPayload(
    payload: SharedAnalysisPayload | null,
    token: string,
): AnalysisData | null {
    if (!payload) return null;
    const { analysis, boards, players, arrows, rectangles } = payload;

    const processBoard = (boardId: string | null) => {
        const itemGroups = {
            homePlayersDef: [] as Player[], homePlayersOff: [] as Player[],
            awayPlayersDef: [] as Player[], awayPlayersOff: [] as Player[],
            homeSubstitutes: [] as Player[], awaySubstitutes: [] as Player[],
            homeArrowsDef: [] as Arrow[], homeArrowsOff: [] as Arrow[],
            awayArrowsDef: [] as Arrow[], awayArrowsOff: [] as Arrow[],
            homeRectanglesDef: [] as Rectangle[], homeRectanglesOff: [] as Rectangle[],
            awayRectanglesDef: [] as Rectangle[], awayRectanglesOff: [] as Rectangle[],
        };

        for (const p of players.filter(p => (p.board_id ?? null) === boardId)) {
            const team = p.team === 'home' ? 'home' : 'away';
            const player: Player = {
                id: p.player_id, name: p.name, number: p.number,
                position: { x: p.x, y: p.y }, note: p.note ?? undefined,
                isManual: p.is_manual,
            };
            const phase = p.variant === 'offensive' ? 'Off' : 'Def';
            if (p.type === 'bench') {
                itemGroups[`${team}Substitutes`].push(player);
            } else {
                itemGroups[`${team}Players${phase}`].push(player);
            }
        }
        for (const a of arrows.filter(a => (a.board_id ?? null) === boardId)) {
            const team = a.team === 'home' ? 'home' : 'away';
            const phase = a.variant === 'offensive' ? 'Off' : 'Def';
            itemGroups[`${team}Arrows${phase}`].push({
                id: a.id, startX: a.start_x, startY: a.start_y,
                endX: a.end_x, endY: a.end_y, color: a.color,
            });
        }
        for (const r of rectangles.filter(r => (r.board_id ?? null) === boardId)) {
            const team = r.team === 'home' ? 'home' : 'away';
            const phase = r.variant === 'offensive' ? 'Off' : 'Def';
            itemGroups[`${team}Rectangles${phase}`].push({
                id: r.id, startX: r.start_x, startY: r.start_y,
                endX: r.end_x, endY: r.end_y, color: r.color, opacity: r.opacity,
            });
        }
        return {
            ...itemGroups,
            // The active schema still stores balls on the analysis root.
            homeBallDef: analysis.home_ball_def, homeBallOff: analysis.home_ball_off,
            awayBallDef: analysis.away_ball_def, awayBallOff: analysis.away_ball_off,
        };
    };

    const analysisBoards: AnalysisBoard[] = boards.map(b => ({
        id: b.id, title: b.title, order: b.order, ...processBoard(b.id),
    }));

    return {
        id: analysis.id, matchId: analysis.fixture_id,
        matchDate: analysis.match_date, matchTime: analysis.match_time,
        shareToken: token,
        competition: analysis.competition ?? undefined,
        homeNoteHtml: analysis.home_note_html ?? undefined,
        awayNoteHtml: analysis.away_note_html ?? undefined,
        titulo: analysis.titulo, descricao: analysis.descricao,
        tipo: analysis.tipo, status: analysis.status,
        homeTeam: analysis.home_team_name, awayTeam: analysis.away_team_name,
        homeTeamLogo: analysis.home_team_logo, awayTeamLogo: analysis.away_team_logo,
        homeScore: analysis.home_score, awayScore: analysis.away_score,
        notasCasa: analysis.notas_casa || '', notasVisitante: analysis.notas_visitante || '',
        notasCasaUpdatedAt: analysis.notas_casa_updated_at,
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
        ...processBoard(null), boards: analysisBoards,
        events: analysis.events || [],
        homeCoach: analysis.home_coach, awayCoach: analysis.away_coach,
        tags: analysis.tags || [],
    };
}
