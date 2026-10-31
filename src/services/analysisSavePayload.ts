import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import type { AnalysisData, AnalysisBoard } from './analysisService';
import type { Player } from '../types/Player';
import type { Arrow } from '../types/Arrow';
import type { Rectangle } from '../types/Rectangle';
import { normalizeAnalysisPlayers } from '../utils/uniquePlayers.ts';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Team = 'home' | 'away';
type Phase = 'defensive' | 'offensive';
type Scene = Pick<AnalysisBoard,
    'homePlayersDef' | 'homePlayersOff' | 'awayPlayersDef' | 'awayPlayersOff' |
    'homeSubstitutes' | 'awaySubstitutes' |
    'homeArrowsDef' | 'homeArrowsOff' | 'awayArrowsDef' | 'awayArrowsOff' |
    'homeRectanglesDef' | 'homeRectanglesOff' | 'awayRectanglesDef' | 'awayRectanglesOff'>;

/** Complete snapshot for one authenticated, atomic database call. */
export function buildAnalysisSavePayload(input: AnalysisData) {
    const data = normalizeAnalysisPlayers(input);
    const isNew = !data.id;
    const id = (data.id || uuidv4()).toLowerCase();
    if (!uuidPattern.test(id)) throw new Error('Identificador de análise inválido.');
    const sourceIds = new Set<string>();
    const boards = (data.boards || []).map(board => {
        if (!board.id || sourceIds.has(board.id)) throw new Error('Identificador de cena inválido ou repetido.');
        sourceIds.add(board.id);
        // Existing scenes retain their UUIDs. Local scene IDs map deterministically
        // to the same UUID on every save. Copies get new IDs under their new analysis.
        return {
            id: !isNew && uuidPattern.test(board.id) ? board.id : uuidv5(board.id, id),
            title: board.title, order: board.order,
        };
    });

    const players: {
        board_id: string | null; player_id: number; name: string; number: number;
        team: Team; type: 'field' | 'bench'; variant: Phase;
        x: number; y: number; note: string | null; is_manual: boolean;
    }[] = [];
    const arrows: {
        board_id: string | null; team: Team; variant: Phase;
        start_x: number; start_y: number; end_x: number; end_y: number; color: string | undefined;
    }[] = [];
    const rectangles: (typeof arrows[number] & { opacity: number })[] = [];

    const appendScene = (scene: Scene, boardId: string | null) => {
        const addPlayers = (items: Player[], team: Team, type: 'field' | 'bench', variant: Phase) => {
            players.push(...items.map(p => ({
                board_id: boardId, player_id: p.id, name: p.name, number: p.number,
                team, type, variant, x: p.position.x, y: p.position.y,
                note: p.note || null, is_manual: p.isManual || false,
            })));
        };
        const addArrows = (items: Arrow[], team: Team, variant: Phase) => {
            arrows.push(...items.map(a => ({
                board_id: boardId, team, variant,
                start_x: a.startX, start_y: a.startY, end_x: a.endX, end_y: a.endY, color: a.color,
            })));
        };
        const addRectangles = (items: Rectangle[], team: Team, variant: Phase) => {
            rectangles.push(...items.map(r => ({
                board_id: boardId, team, variant,
                start_x: r.startX, start_y: r.startY, end_x: r.endX, end_y: r.endY,
                color: r.color, opacity: r.opacity,
            })));
        };
        addPlayers(scene.homePlayersDef, 'home', 'field', 'defensive');
        addPlayers(scene.homePlayersOff, 'home', 'field', 'offensive');
        addPlayers(scene.awayPlayersDef, 'away', 'field', 'defensive');
        addPlayers(scene.awayPlayersOff, 'away', 'field', 'offensive');
        addPlayers(scene.homeSubstitutes, 'home', 'bench', 'defensive');
        addPlayers(scene.awaySubstitutes, 'away', 'bench', 'defensive');
        addArrows(scene.homeArrowsDef || [], 'home', 'defensive');
        addArrows(scene.homeArrowsOff || [], 'home', 'offensive');
        addArrows(scene.awayArrowsDef || [], 'away', 'defensive');
        addArrows(scene.awayArrowsOff || [], 'away', 'offensive');
        addRectangles(scene.homeRectanglesDef || [], 'home', 'defensive');
        addRectangles(scene.homeRectanglesOff || [], 'home', 'offensive');
        addRectangles(scene.awayRectanglesDef || [], 'away', 'defensive');
        addRectangles(scene.awayRectanglesOff || [], 'away', 'offensive');
    };
    appendScene(data, null);
    data.boards?.forEach((board, index) => appendScene(board, boards[index].id));

    return {
        id, is_new: isNew,
        analysis: {
            fixture_id: data.matchId,
            match_date: data.matchDate, match_time: data.matchTime,
            titulo: data.titulo ?? (isNew ? `${data.homeTeam} vs ${data.awayTeam}` : undefined),
            descricao: data.descricao,
            tipo: data.tipo ?? (isNew ? 'partida' : undefined),
            status: data.status ?? (isNew ? 'em_andamento' : undefined),
            competition: data.competition,
            home_team_name: data.homeTeam, away_team_name: data.awayTeam,
            home_team_logo: data.homeTeamLogo, away_team_logo: data.awayTeamLogo,
            home_score: data.homeScore, away_score: data.awayScore,
            home_team_color: data.homeTeamColor, away_team_color: data.awayTeamColor,
            home_team_bg_color: data.homeTeamBgColor, away_team_bg_color: data.awayTeamBgColor,
            notas_casa: data.notasCasa, notas_visitante: data.notasVisitante,
            notas_casa_updated_at: data.notasCasaUpdatedAt,
            notas_visitante_updated_at: data.notasVisitanteUpdatedAt,
            home_defensive_notes: data.homeDefensiveNotes, home_offensive_notes: data.homeOffensiveNotes,
            home_bench_notes: data.homeBenchNotes,
            away_defensive_notes: data.awayDefensiveNotes, away_offensive_notes: data.awayOffensiveNotes,
            away_bench_notes: data.awayBenchNotes,
            home_note_html: data.homeNoteHtml, away_note_html: data.awayNoteHtml,
            defensive_notes: data.defensiveNotes, offensive_notes: data.offensiveNotes,
            home_coach: data.homeCoach, away_coach: data.awayCoach,
            home_ball_def: data.homeBallDef, home_ball_off: data.homeBallOff,
            away_ball_def: data.awayBallDef, away_ball_off: data.awayBallOff,
            events: data.events, tags: data.tags,
        },
        boards, players, arrows, rectangles,
    };
}
