import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, LogIn, Zap, AlertCircle, RefreshCw, Wifi, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { theSportsDbService } from '../services/theSportsDbService';
import { analysisService } from '../services/analysisService';
import { useAuth } from '../contexts/AuthContext';
import type { TsdbEvent } from '../types/thesportsdb';
import CopaFixtureCard from '../components/copa/CopaFixtureCard';
import CopaStandings from '../components/copa/CopaStandings';
import type { TsdbStanding } from '../types/thesportsdb';

// FIFA World Cup 2026 — June 11 to July 19, 2026 (BRT)
const WC_START = new Date('2026-06-11T12:00:00-03:00');

type Tab = 'ao_vivo' | 'hoje' | 'proximos' | 'resultados' | 'tabela';

// ── Countdown ─────────────────────────────────────────────────
function useCountdown() {
  const [ms, setMs] = useState(() => Math.max(0, WC_START.getTime() - Date.now()));
  useEffect(() => {
    if (ms === 0) return;
    const id = setInterval(() => setMs(Math.max(0, WC_START.getTime() - Date.now())), 1000);
    return () => clearInterval(id);
  }, [ms]);
  return {
    done:    ms === 0,
    days:    Math.floor(ms / 864e5),
    hours:   Math.floor((ms % 864e5) / 36e5),
    minutes: Math.floor((ms % 36e5) / 6e4),
    seconds: Math.floor((ms % 6e4) / 1e3),
  };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="bg-gray-900 border border-gray-700/60 rounded-xl px-3 py-2 min-w-[58px] text-center">
        <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}

// ── Date grouping helpers ─────────────────────────────────────
function groupByDate(fixtures: TsdbEvent[]): Map<string, TsdbEvent[]> {
  const map = new Map<string, TsdbEvent[]>();
  fixtures.forEach(f => {
    const key = f.dateEvent;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(f);
  });
  return map;
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC'
  });
}

function FixtureGroup({ dateStr, fixtures, onCreateAnalysis, creatingId }: {
  dateStr: string;
  fixtures: TsdbEvent[];
  onCreateAnalysis: (f: TsdbEvent) => void;
  creatingId: string | null;
}) {
  return (
    <div className="mb-5">
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1 capitalize">
        {formatDateHeader(dateStr)}
      </h3>
      <div className="flex flex-col gap-3">
        {fixtures.map(f => (
          <CopaFixtureCard
            key={f.idEvent}
            fixture={f}
            onCreateAnalysis={onCreateAnalysis}
            isCreating={creatingId === f.idEvent}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function Copa() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const countdown = useCountdown();

  const [fixtures, setFixtures] = useState<TsdbEvent[]>([]);
  const [liveFixtures, setLiveFixtures] = useState<TsdbEvent[]>([]);
  const [standings, setStandings] = useState<TsdbStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('proximos');
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  // ── Fetch all fixtures once ───────────────────────────────
  useEffect(() => {
    Promise.all([
      theSportsDbService.getAllFixtures(),
      theSportsDbService.getStandings(),
    ])
      .then(([data, table]) => {
        setFixtures(data);
        setStandings(table);
        setLastRefresh(new Date());

        const hasLive    = data.some(f => ['1H','HT','2H','ET','P'].includes(f.strStatus));
        const hasToday   = data.some(f => f.dateEvent === todayStr);
        if (hasLive)    setTab('ao_vivo');
        else if (hasToday) setTab('hoje');
        else if (countdown.done) setTab('resultados');
        else setTab('proximos');
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  // ── Live-score refresh every 2 min ───────────────────────
  const fetchLive = useCallback(async () => {
    const live = await theSportsDbService.getLiveFixtures();
    setLiveFixtures(live);
    if (live.length > 0) setTab('ao_vivo');
  }, []);

  useEffect(() => {
    fetchLive();
    const id = setInterval(fetchLive, 2 * 60 * 1000);
    return () => clearInterval(id);
  }, [fetchLive]);

  // ── Manual refresh ────────────────────────────────────────
  const handleRefresh = async () => {
    setRefreshing(true);
    theSportsDbService.clearCopaCache();
    try {
      const [data, live, table] = await Promise.all([
        theSportsDbService.getAllFixtures(),
        theSportsDbService.getLiveFixtures(),
        theSportsDbService.getStandings(),
      ]);
      setFixtures(data);
      setLiveFixtures(live);
      setStandings(table);
      setLastRefresh(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  // ── Derived views ─────────────────────────────────────────
  const todayFixtures = useMemo(() =>
    fixtures.filter(f => f.dateEvent === todayStr)
            .sort((a, b) => a.strTimestamp.localeCompare(b.strTimestamp)),
    [fixtures, todayStr]
  );

  const upcomingFixtures = useMemo(() =>
    fixtures
      .filter(f => f.dateEvent > todayStr || (f.dateEvent === todayStr && f.strStatus === 'NS'))
      .filter(f => ['NS','TBD'].includes(f.strStatus))
      .sort((a, b) => a.strTimestamp.localeCompare(b.strTimestamp)),
    [fixtures, todayStr]
  );

  const pastFixtures = useMemo(() =>
    fixtures
      .filter(f => ['FT','AET','PEN'].includes(f.strStatus))
      .sort((a, b) => b.strTimestamp.localeCompare(a.strTimestamp)),
    [fixtures]
  );

  // ── Search filter ─────────────────────────────────────────
  const q = searchQuery.trim().toLowerCase();
  function applySearch(list: TsdbEvent[]): TsdbEvent[] {
    if (!q) return list;
    return list.filter(f =>
      f.strHomeTeam.toLowerCase().includes(q) ||
      f.strAwayTeam.toLowerCase().includes(q) ||
      (f.strGroup?.toLowerCase().includes(q))
    );
  }

  // ── Create analysis ───────────────────────────────────────
  const handleCreateAnalysis = async (fixture: TsdbEvent) => {
    if (!user) { navigate('/login'); return; }
    setCreatingId(fixture.idEvent);
    try {
      const id = await analysisService.createBlankAnalysis('analise_completa', {
        titulo: `${fixture.strHomeTeam} × ${fixture.strAwayTeam}`,
        homeTeam: fixture.strHomeTeam,
        awayTeam: fixture.strAwayTeam,
        homeTeamLogo: fixture.strHomeTeamBadge ?? '',
        awayTeamLogo: fixture.strAwayTeamBadge ?? '',
        matchDate: fixture.dateEvent,
        tags: ['Copa 2026'],
      });
      navigate(`/analysis-complete/saved/${id}`);
    } catch {
      toast.error('Erro ao criar análise. Tente novamente.');
    } finally {
      setCreatingId(null);
    }
  };

  // ── Tab definitions ───────────────────────────────────────
  const tabs: { key: Tab; label: string; count?: number; live?: boolean }[] = [
    ...(liveFixtures.length > 0 ? [{ key: 'ao_vivo' as Tab, label: 'Ao Vivo', count: liveFixtures.length, live: true }] : []),
    ...(todayFixtures.length > 0 ? [{ key: 'hoje' as Tab, label: `Hoje (${todayFixtures.length})` }] : []),
    { key: 'proximos',   label: 'Calendário' },
    { key: 'resultados', label: 'Resultados' },
    { key: 'tabela',     label: 'Tabela' },
  ];

  // ── Content for current tab ───────────────────────────────
  function TabContent() {
    if (tab === 'tabela') {
      return <CopaStandings standings={standings} />;
    }

    let list: TsdbEvent[];
    if (tab === 'ao_vivo')    list = liveFixtures;
    else if (tab === 'hoje')  list = applySearch(todayFixtures);
    else if (tab === 'proximos') list = applySearch(upcomingFixtures);
    else                      list = applySearch(pastFixtures);

    if (list.length === 0) {
      return (
        <div className="text-center py-16 text-gray-500">
          <Trophy size={36} className="mx-auto mb-3 text-gray-700" />
          <p className="text-sm">
            {tab === 'ao_vivo'    && 'Nenhum jogo ao vivo agora.'}
            {tab === 'hoje'       && 'Nenhum jogo hoje.'}
            {tab === 'proximos'   && (q ? 'Nenhum jogo encontrado.' : 'Nenhum jogo agendado.')}
            {tab === 'resultados' && (q ? 'Nenhum resultado encontrado.' : 'Nenhum resultado disponível ainda.')}
          </p>
          {!countdown.done && tab === 'proximos' && !q && (
            <p className="text-xs mt-1 text-gray-600">
              A Copa começa em 11 de junho de 2026.
            </p>
          )}
        </div>
      );
    }

    if (tab === 'ao_vivo') {
      return (
        <div className="flex flex-col gap-3">
          {list.map(f => (
            <CopaFixtureCard
              key={f.idEvent}
              fixture={f}
              onCreateAnalysis={handleCreateAnalysis}
              isCreating={creatingId === f.idEvent}
            />
          ))}
        </div>
      );
    }

    const grouped = groupByDate(list);
    const dateKeys = [...grouped.keys()];

    return (
      <>
        {dateKeys.map(dateStr => (
          <FixtureGroup
            key={dateStr}
            dateStr={dateStr}
            fixtures={grouped.get(dateStr)!}
            onCreateAnalysis={handleCreateAnalysis}
            creatingId={creatingId}
          />
        ))}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1111] text-white">
      {/* ── Sticky nav ── */}
      <nav className="sticky top-0 z-50 bg-[#0b1111]/90 backdrop-blur-sm border-b border-gray-800/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            <img src="/zona14-logo-branco.svg" alt="Zona 14" className="h-5 w-auto object-contain" />
          </button>

          <div className="flex items-center gap-2">
            {lastRefresh && (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-gray-600 hover:text-gray-400 transition-colors p-1"
                title={`Atualizado às ${lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              </button>
            )}
            {user ? (
              <button
                onClick={() => navigate('/')}
                className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                Minhas análises
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-1.5 text-xs font-bold text-black bg-[#27D888] hover:bg-green-400 rounded-lg px-3 py-1.5 transition-colors"
              >
                <LogIn size={13} />
                Entrar
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-8 text-center">
        <div className="flex justify-center mb-5">
          <img
            src="/World-Cup-2026-Logo-PNG.webp"
            alt="FIFA World Cup 2026"
            className="h-28 sm:h-36 w-auto object-contain rounded-2xl bg-white p-3"
          />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-2">
          Copa do Mundo<br />
          <span className="text-[#27D888]">no Zona 14</span>
        </h1>

        <p className="text-sm text-gray-400 mb-8 max-w-sm mx-auto">
          Visualize escalações reais, analise formações e crie suas análises táticas dos jogos da Copa.
        </p>

        {!countdown.done && (
          <div className="mb-8">
            <p className="text-[11px] text-gray-600 uppercase tracking-widest mb-3">Começa em</p>
            <div className="flex gap-2 sm:gap-3 justify-center">
              <CountdownUnit value={countdown.days}    label="Dias" />
              <CountdownUnit value={countdown.hours}   label="Horas" />
              <CountdownUnit value={countdown.minutes} label="Min" />
              <CountdownUnit value={countdown.seconds} label="Seg" />
            </div>
          </div>
        )}

        {liveFixtures.length > 0 && (
          <div className="inline-flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-full px-4 py-1.5 mb-4">
            <Wifi size={12} className="text-[#22c55e] animate-pulse" />
            <span className="text-xs text-[#22c55e] font-bold">
              {liveFixtures.length} jogo{liveFixtures.length > 1 ? 's' : ''} ao vivo agora
            </span>
          </div>
        )}

        {!user && (
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 bg-[#27D888] hover:bg-green-400 text-black font-bold text-sm px-6 py-3 rounded-xl transition-colors"
          >
            <Zap size={15} />
            Criar conta grátis e analisar jogos
          </button>
        )}
      </div>

      {/* ── Fixture section ── */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/70 rounded-xl p-1 mb-4 border border-gray-800/40 overflow-x-auto scrollbar-hide">
          {tabs.map(({ key, label, live }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-shrink-0 flex items-center gap-1.5 py-2 px-3 text-sm font-semibold rounded-lg transition-all ${
                tab === key
                  ? 'bg-[#141a1a] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {live && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
              {label}
            </button>
          ))}
        </div>

        {/* Search bar (not on tabela or ao_vivo) */}
        {(tab === 'proximos' || tab === 'resultados' || tab === 'hoje') && (
          <div className="relative mb-4">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar seleção ou grupo..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-gray-900/60 border border-gray-800/60 rounded-xl text-sm text-white placeholder-gray-600 pl-8 pr-8 py-2 focus:outline-none focus:border-[#27D888]/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-36 bg-gray-900/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
            <AlertCircle size={32} className="text-gray-600" />
            <p className="text-sm">Não foi possível carregar os jogos.</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-[#27D888] hover:underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <TabContent />
        )}

        {/* Last refresh timestamp */}
        {lastRefresh && !loading && (
          <p className="text-center text-[10px] text-gray-700 mt-6">
            Atualizado às {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {' '}· Placar ao vivo atualiza automaticamente a cada 2 min
          </p>
        )}
      </div>

      {/* ── Footer CTA ── */}
      {!user && !loading && (
        <div className="border-t border-gray-800/40 bg-[#0d1414]">
          <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-bold text-white text-sm">Analise como um profissional</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Crie sua conta grátis e comece a analisar os jogos da Copa.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="shrink-0 flex items-center gap-2 bg-[#27D888] hover:bg-green-400 text-black font-bold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              <Zap size={14} />
              Criar conta grátis
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
