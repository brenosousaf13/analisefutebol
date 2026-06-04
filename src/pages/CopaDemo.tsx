import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { theSportsDbService } from '../services/theSportsDbService';
import { analysisService } from '../services/analysisService';
import { useAuth } from '../contexts/AuthContext';
import type { TsdbEvent, TsdbLineupPlayer } from '../types/thesportsdb';
import type { Player } from '../types/Player';
import CopaFixtureCard from '../components/copa/CopaFixtureCard';

function posToRow(pos: string): number {
  const p = pos.toUpperCase().trim();
  if (p === 'GK' || p.includes('GOALKEEPER')) return 0;
  if (
    ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(p) ||
    ['DEFENDER', 'CENTRE-BACK', 'RIGHT BACK', 'LEFT BACK', 'WING BACK', 'FULLBACK', 'CENTRE BACK'].some(x => p.includes(x))
  ) return 1;
  if (
    ['CF', 'ST', 'RW', 'LW'].includes(p) ||
    ['STRIKER', 'FORWARD', 'WINGER', 'WING', 'CENTRE-FORWARD', 'SECOND STRIKER'].some(x => p.includes(x))
  ) return 3;
  return 2;
}

function tsdbLineupToPlayers(lineup: TsdbLineupPlayer[], isHome: boolean): Player[] {
  const starters = lineup.filter(
    p => p.strSubstitute === 'No' && (isHome ? p.strHome === 'Yes' : p.strHome === 'No')
  );
  if (starters.length === 0) return [];

  const rowMap: Record<number, TsdbLineupPlayer[]> = { 0: [], 1: [], 2: [], 3: [] };
  starters.forEach(p => rowMap[posToRow(p.strPosition)].push(p));

  const usedRows = ([0, 1, 2, 3] as const).filter(r => rowMap[r].length > 0);
  const totalRows = usedRows.length;
  const result: Player[] = [];

  usedRows.forEach((row, ri) => {
    const xPct = totalRows > 1 ? ri / (totalRows - 1) : 0;
    const x = isHome ? 5 + xPct * 40 : 95 - xPct * 40;
    const rowPlayers = rowMap[row];
    const count = rowPlayers.length;
    rowPlayers.forEach((p, i) => {
      const numId = parseInt(p.idPlayer.replace(/\D/g, '').slice(-7), 10);
      result.push({
        id: isNaN(numId) ? (isHome ? 1000 : 2000) + ri * 100 + i : numId,
        name: p.strPlayer,
        number: parseInt(p.intSquadNumber ?? '0', 10) || 0,
        position: { x, y: (100 / (count + 1)) * (i + 1) },
        isStarter: true,
      });
    });
  });

  return result;
}

// Premier League 2025/26 — real finished matches to demo Copa UI
const DEMO_LEAGUE = '4328';

export default function CopaDemo() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fixtures, setFixtures] = useState<TsdbEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingId, setCreatingId] = useState<string | null>(null);

  useEffect(() => {
    theSportsDbService.getLeaguePastFixtures(DEMO_LEAGUE)
      .then(data => setFixtures(data.slice(0, 5)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreateAnalysis = async (fixture: TsdbEvent) => {
    if (!user) { navigate('/login'); return; }
    setCreatingId(fixture.idEvent);
    try {
      const lineupData = await theSportsDbService.getLineup(fixture.idEvent);

      let extraPlayers: Partial<{ homePlayersDef: Player[]; homePlayersOff: Player[]; awayPlayersDef: Player[]; awayPlayersOff: Player[] }> = {};
      if (lineupData.length > 0) {
        const home = tsdbLineupToPlayers(lineupData, true);
        const away = tsdbLineupToPlayers(lineupData, false);
        if (home.length > 0 && away.length > 0) {
          extraPlayers = {
            homePlayersDef: home,
            homePlayersOff: home.map(p => ({ ...p })),
            awayPlayersDef: away,
            awayPlayersOff: away.map(p => ({ ...p })),
          };
        }
      }

      const id = await analysisService.createBlankAnalysis('analise_completa', {
        titulo: `${fixture.strHomeTeam} × ${fixture.strAwayTeam}`,
        homeTeam: fixture.strHomeTeam,
        awayTeam: fixture.strAwayTeam,
        homeTeamLogo: fixture.strHomeTeamBadge ?? '',
        awayTeamLogo: fixture.strAwayTeamBadge ?? '',
        matchDate: fixture.dateEvent,
        tags: ['Demo', 'Premier League'],
        ...extraPlayers,
      });
      navigate(`/analysis-complete/saved/${id}`);
    } catch {
      toast.error('Erro ao criar análise.');
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1111] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#0b1111]/90 backdrop-blur-sm border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate('/copa')}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar para Copa
          </button>
          <span className="text-gray-700">|</span>
          <span className="text-sm text-gray-400">Demonstração da UI</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Banner */}
        <div className="flex items-start gap-3 bg-[#27D888]/10 border border-[#27D888]/30 rounded-2xl p-4 mb-6">
          <Info size={16} className="text-[#27D888] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-[#27D888]">Prévia — Como ficará a Copa 2026</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Esses são jogos reais da Premier League 2025/26 mostrando exatamente como escalações,
              eventos e estatísticas vão aparecer nos jogos da Copa do Mundo a partir de 11 de junho.
            </p>
          </div>
        </div>

        <h2 className="text-base font-bold text-white mb-1">Premier League 2025/26</h2>
        <p className="text-xs text-gray-500 mb-5">
          Jogos recentes com dados completos — clique em <strong className="text-gray-300">Escalação</strong>,{' '}
          <strong className="text-gray-300">Eventos</strong> e <strong className="text-gray-300">Stats</strong> em cada card.
        </p>

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 bg-gray-900/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fixtures.map(f => (
              <CopaFixtureCard
                key={f.idEvent}
                fixture={f}
                onCreateAnalysis={handleCreateAnalysis}
                isCreating={creatingId === f.idEvent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
