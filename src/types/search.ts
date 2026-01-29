// Tipos de busca disponíveis
export type SearchType = 'all' | 'team' | 'match' | 'player' | 'coach';

// Resultado de busca por JOGADOR (Dossiê do Jogador)
export interface PlayerDossier {
    type: 'player';
    player_name: string;
    player_id?: number;
    total_appearances: number; // Em quantas análises ele aparece
    entries: PlayerDossierEntry[];
}

export interface PlayerDossierEntry {
    analysis_id: string;
    match_title: string; // "América MG vs Atlético"
    match_date: string;
    team_played_for: 'home' | 'away';
    team_name: string;
    jersey_number?: number;
    position?: string;
    note: string | null; // A anotação do analista sobre ele
    created_at: string;
}

// Resultado de busca por TIME (Dossiê do Time)
export interface TeamDossier {
    type: 'team';
    team_name: string;
    total_analyses: number;
    entries: TeamDossierEntry[];
}

export interface TeamDossierEntry {
    analysis_id: string;
    match_title: string;
    match_date: string;
    opponent: string;
    was_home: boolean;
    defensive_notes: string | null;
    offensive_notes: string | null;
    bench_notes: string | null;
    general_notes: string | null;
    created_at: string;
}

// Resultado de busca por TÉCNICO (Dossiê do Técnico)
export interface CoachDossier {
    type: 'coach';
    coach_name: string;
    total_matches: number;
    entries: CoachDossierEntry[];
}

export interface CoachDossierEntry {
    analysis_id: string;
    match_title: string;
    match_date: string;
    team_coached: string;
    opponent: string;
    // Notas táticas do time que ele comandava
    defensive_notes: string | null;
    offensive_notes: string | null;
    created_at: string;
}

// Resultado de busca por PARTIDA (comportamento atual)
// Precisamos importar o AnalysisData ou definir um subset dele
import type { SavedAnalysisSummary } from '../services/analysisService';

export interface MatchResult {
    type: 'match';
    analysis: SavedAnalysisSummary;
}

// União de todos os tipos de resultado
export type SearchResult = PlayerDossier | TeamDossier | CoachDossier | MatchResult;
