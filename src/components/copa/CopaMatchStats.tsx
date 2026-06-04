import type { TsdbEventStats } from '../../types/thesportsdb';

interface Props {
  stats: TsdbEventStats;
  homeTeam: string;
  awayTeam: string;
}

interface StatRow {
  label: string;
  home: number | null;
  away: number | null;
  isPossession?: boolean;
}

function StatBar({ label, home, away, isPossession }: StatRow) {
  const h = home ?? 0;
  const a = away ?? 0;
  const total = isPossession ? 100 : (h + a) || 1;
  const homePct = Math.round((h / total) * 100);
  const awayPct = 100 - homePct;

  const homeWins = h > a;
  const awayWins = a > h;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className={`font-bold tabular-nums ${homeWins ? 'text-white' : 'text-gray-400'}`}>{h}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</span>
        <span className={`font-bold tabular-nums ${awayWins ? 'text-white' : 'text-gray-400'}`}>{a}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
        <div
          className="h-full rounded-l-full transition-all"
          style={{ width: `${homePct}%`, background: homeWins ? '#27D888' : '#374151' }}
        />
        <div
          className="h-full rounded-r-full transition-all"
          style={{ width: `${awayPct}%`, background: awayWins ? '#60a5fa' : '#374151' }}
        />
      </div>
    </div>
  );
}

function n(v: string | null): number | null {
  if (v === null || v === '') return null;
  const parsed = parseInt(v, 10);
  return isNaN(parsed) ? null : parsed;
}

export default function CopaMatchStats({ stats, homeTeam, awayTeam }: Props) {
  const rows: StatRow[] = [
    { label: 'Posse (%)', home: n(stats.intHomePossession), away: n(stats.intAwayPossession), isPossession: true },
    { label: 'Chutes', home: n(stats.intHomeShotsTotal), away: n(stats.intAwayShotsTotal) },
    { label: 'No gol', home: n(stats.intHomeShotsOnGoal), away: n(stats.intAwayShotsOnGoal) },
    { label: 'Defesas', home: n(stats.intHomeSaves), away: n(stats.intAwaySaves) },
    { label: 'Escanteios', home: n(stats.intHomeCorners), away: n(stats.intAwayCorners) },
    { label: 'Faltas', home: n(stats.intHomeFouls), away: n(stats.intAwayFouls) },
    { label: 'Cartões am.', home: n(stats.intHomeYellowCards), away: n(stats.intAwayYellowCards) },
    { label: 'Impedimentos', home: n(stats.intHomeOffsides), away: n(stats.intAwayOffsides) },
  ].filter(r => r.home !== null || r.away !== null);

  if (rows.length === 0) {
    return (
      <p className="text-center text-xs text-gray-500 py-4">Estatísticas não disponíveis.</p>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider px-0.5 mb-0.5">
        <span>{homeTeam}</span>
        <span>{awayTeam}</span>
      </div>
      {rows.map(r => (
        <StatBar key={r.label} {...r} />
      ))}
    </div>
  );
}
