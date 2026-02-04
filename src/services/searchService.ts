import { supabase } from '../lib/supabase';
import type {
    SearchType,
    PlayerDossier,
    TeamDossier,
    CoachDossier,
    SearchResult,
    PlayerDossierEntry,
    TeamDossierEntry,
    CoachDossierEntry,
    MatchResult
} from '../types/search';


// =====================================================
// BUSCA PRINCIPAL (dispatcher)
// =====================================================

export async function searchAnalyses(
    searchType: SearchType,
    searchTerm: string,
    userId: string
): Promise<SearchResult[]> {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return [];

    switch (searchType) {
        case 'player':
            return searchByPlayer(term, userId);
        case 'team':
            return searchByTeam(term, userId);
        case 'coach':
            return searchByCoach(term, userId);
        case 'match':
            return searchByMatch(term, userId);
        case 'tag':
            // Tag search is handled via standard analysis search (getMyAnalyses logic)
            // But we need to return MatchResult[]
            return searchByMatch(term, userId);
        case 'all':
        default:
            return searchAll(term, userId);
    }
}

// =====================================================
// BUSCA POR JOGADOR → Retorna Dossiê
// =====================================================

async function searchByPlayer(term: string, userId: string): Promise<PlayerDossier[]> {
    // Buscar todos os jogadores que correspondem ao termo
    // Agrupados por nome (normalizado)
    const { data: players, error } = await supabase
        .from('analysis_players')
        .select(`
      id,
      name,
      player_id,
      number,
      team,
      note,
      analysis_id,
      analyses!inner (
        id,
        user_id,
        titulo,
        home_team_name,
        away_team_name,
        match_date,
        created_at
      )
    `)
        .eq('analyses.user_id', userId)
        .ilike('name', `%${term}%`)
        .order('created_at', { ascending: false, foreignTable: 'analyses' });

    if (error || !players) {
        console.error('Error searching players:', error);
        return [];
    }

    // Agrupar por nome do jogador (case-insensitive)
    const playerMap = new Map<string, PlayerDossier>();

    players.forEach((p: any) => {
        const normalizeName = (name: string) => name.toLowerCase().trim();
        const normalizedName = normalizeName(p.name);

        let dossier = playerMap.get(normalizedName);

        if (!dossier) {
            dossier = {
                type: 'player',
                player_name: p.name,
                player_id: p.player_id,
                total_appearances: 0,
                entries: []
            };
            playerMap.set(normalizedName, dossier);
        }

        // Verifica se já existe uma entrada para esta análise neste dossiê
        const existingEntryIndex = dossier.entries.findIndex(e => e.analysis_id === p.analysis_id);

        if (existingEntryIndex === -1) {
            const analysis = p.analyses;
            // Determinar o nome do time que ele jogou
            const teamName = p.team === 'home'
                ? analysis.home_team_name
                : analysis.away_team_name;

            const entry: PlayerDossierEntry = {
                analysis_id: p.analysis_id,
                match_title: analysis.titulo || `${analysis.home_team_name} vs ${analysis.away_team_name}`,
                match_date: analysis.match_date,
                team_played_for: p.team,
                team_name: teamName,
                jersey_number: p.number,
                note: p.note,
                created_at: analysis.created_at
            };

            dossier.entries.push(entry);
            dossier.total_appearances++;
        } else {
            // Se já existe, talvez concatenar a nota se for diferente?
            // O usuário pediu "apenas de uma", mas se tiver notas diferentes perdemos info.
            // Vou concatenar se a nota nova for válida e diferente.
            if (p.note && p.note.trim() !== '') {
                const currentEntry = dossier.entries[existingEntryIndex];
                if (!currentEntry.note) {
                    currentEntry.note = p.note;
                } else if (!currentEntry.note.includes(p.note)) {
                    // Adiciona nova linha se nota diferente
                    currentEntry.note += `\n- ${p.note}`;
                }
            }
        }
    });

    return Array.from(playerMap.values());
}

// =====================================================
// BUSCA POR TIME → Retorna Dossiê
// =====================================================

async function searchByTeam(term: string, userId: string): Promise<TeamDossier[]> {
    // Buscar análises onde o time aparece (casa ou visitante)
    const { data: analyses, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .or(`home_team_name.ilike.%${term}%,away_team_name.ilike.%${term}%`)
        .order('match_date', { ascending: false });

    if (error || !analyses) {
        console.error('Error searching teams:', error);
        return [];
    }

    // Agrupar por nome do time
    const teamMap = new Map<string, TeamDossier>();

    analyses.forEach((a: any) => {
        const termLower = term.toLowerCase();
        // Verificar se é o time da casa ou visitante que corresponde
        const isHome = a.home_team_name?.toLowerCase().includes(termLower);
        const isAway = a.away_team_name?.toLowerCase().includes(termLower);

        // Pode ser que ambos correspondam (ex: "Atlético" em "Atlético MG vs Atlético PR")
        if (isHome) {
            addTeamEntry(teamMap, a.home_team_name, a, true);
        }
        if (isAway) {
            addTeamEntry(teamMap, a.away_team_name, a, false);
        }
    });

    return Array.from(teamMap.values());
}

function addTeamEntry(
    map: Map<string, TeamDossier>,
    teamName: string,
    analysis: any,
    wasHome: boolean
) {
    const normalizedName = teamName.toLowerCase().trim();
    const opponent = wasHome ? analysis.away_team_name : analysis.home_team_name;

    const entry: TeamDossierEntry = {
        analysis_id: analysis.id,
        match_title: analysis.titulo || `${analysis.home_team_name} vs ${analysis.away_team_name}`,
        match_date: analysis.match_date,
        opponent: opponent,
        was_home: wasHome,

        defensive_notes: wasHome ? analysis.home_defensive_notes : analysis.away_defensive_notes,
        offensive_notes: wasHome ? analysis.home_offensive_notes : analysis.away_offensive_notes,
        bench_notes: wasHome ? analysis.home_bench_notes : analysis.away_bench_notes,

        // Para notas gerais, usamos as notas_casa/visitante antigas ou novas dependendo de como vc mapeou
        // Assumindo mapeamento do analysisService:
        general_notes: wasHome ? analysis.notas_casa : analysis.notas_visitante,

        created_at: analysis.created_at
    };

    if (map.has(normalizedName)) {
        const existing = map.get(normalizedName)!;
        existing.entries.push(entry);
        existing.total_analyses++;
    } else {
        map.set(normalizedName, {
            type: 'team',
            team_name: teamName,
            total_analyses: 1,
            entries: [entry]
        });
    }
}

// =====================================================
// BUSCA POR TÉCNICO → Retorna Dossiê
// =====================================================

async function searchByCoach(term: string, userId: string): Promise<CoachDossier[]> {
    const { data: analyses, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .or(`home_coach.ilike.%${term}%,away_coach.ilike.%${term}%`)
        .order('match_date', { ascending: false });

    if (error || !analyses) return [];

    const coachMap = new Map<string, CoachDossier>();
    const termLower = term.toLowerCase();

    analyses.forEach((a: any) => {
        const homeCoach = a.home_coach || '';
        const awayCoach = a.away_coach || '';

        const isHomeCoach = homeCoach.toLowerCase().includes(termLower);
        const isAwayCoach = awayCoach.toLowerCase().includes(termLower);

        if (isHomeCoach && homeCoach) {
            addCoachEntry(coachMap, homeCoach, a, true);
        }
        if (isAwayCoach && awayCoach) {
            addCoachEntry(coachMap, awayCoach, a, false);
        }
    });

    return Array.from(coachMap.values());
}

function addCoachEntry(
    map: Map<string, CoachDossier>,
    coachName: string,
    analysis: any,
    wasHomeCoach: boolean
) {
    const normalizedName = coachName.toLowerCase().trim();
    const teamCoached = wasHomeCoach ? analysis.home_team_name : analysis.away_team_name;
    const opponent = wasHomeCoach ? analysis.away_team_name : analysis.home_team_name;

    const entry: CoachDossierEntry = {
        analysis_id: analysis.id,
        match_title: analysis.titulo || `${analysis.home_team_name} vs ${analysis.away_team_name}`,
        match_date: analysis.match_date,
        team_coached: teamCoached,
        opponent: opponent,
        defensive_notes: wasHomeCoach ? analysis.home_defensive_notes : analysis.away_defensive_notes,
        offensive_notes: wasHomeCoach ? analysis.home_offensive_notes : analysis.away_offensive_notes,
        created_at: analysis.created_at
    };

    if (map.has(normalizedName)) {
        const existing = map.get(normalizedName)!;
        existing.entries.push(entry);
        existing.total_matches++;
    } else {
        map.set(normalizedName, {
            type: 'coach',
            coach_name: coachName,
            total_matches: 1,
            entries: [entry]
        });
    }
}

// =====================================================
// BUSCA POR PARTIDA (comportamento atual)
// =====================================================

async function searchByMatch(term: string, userId: string): Promise<MatchResult[]> {
    const { data, error } = await supabase
        .from('analyses')
        .select(`
        id, titulo, descricao, tipo, status,
        home_team_name, away_team_name, home_team_logo, away_team_logo,
        home_team_color, away_team_color,
        home_score, away_score, created_at, updated_at, thumbnail_url, tags
    `)
        .eq('user_id', userId)
        .or(`titulo.ilike.%${term}%,home_team_name.ilike.%${term}%,away_team_name.ilike.%${term}%,tags.cs.{${term}}`)
        .order('created_at', { ascending: false }); // Matches analysisService default order

    if (error || !data) return [];

    return data.map(item => ({
        type: 'match' as const,
        analysis: {
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
        }
    }));
}

// =====================================================
// BUSCA EM TUDO (mostra dossiês quando relevante)
// =====================================================

async function searchAll(term: string, userId: string): Promise<SearchResult[]> {
    // Executar todas as buscas em paralelo
    const [players, teams, coaches, matches] = await Promise.all([
        searchByPlayer(term, userId),
        searchByTeam(term, userId),
        searchByCoach(term, userId),
        searchByMatch(term, userId)
    ]);

    // Combinar resultados, priorizando dossiês com anotações
    const results: SearchResult[] = [];

    // Adicionar dossiês de jogadores que TÊM anotações
    players.forEach(p => {
        const hasNotes = p.entries.some(e => e.note && e.note.trim() !== '');
        if (hasNotes) {
            results.push(p);
        }
    });

    // Adicionar dossiês de times que TÊM anotações
    teams.forEach(t => {
        const hasNotes = t.entries.some(e =>
            e.defensive_notes || e.offensive_notes || e.bench_notes || e.general_notes
        );
        if (hasNotes) {
            results.push(t);
        }
    });

    // Adicionar dossiês de técnicos
    coaches.forEach(c => {
        const hasNotes = c.entries.some(e => e.defensive_notes || e.offensive_notes);
        if (hasNotes) {
            results.push(c);
        }
    });

    // Adicionar partidas (sempre, para manter comportamento atual)
    results.push(...matches);

    return results;
}
