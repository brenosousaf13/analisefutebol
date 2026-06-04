import type { TsdbEventStats } from '../../types/thesportsdb';

interface Props {
  stats: TsdbEventStats; // TsdbStatItem[]
  homeTeam: string;
  awayTeam: string;
}

const PT_LABEL: Record<string, string> = {
  'Ball Possession':   'Posse de bola',
  'Total Shots':       'Chutes totais',
  'Shots on Goal':     'Chutes no gol',
  'Shots off Goal':    'Chutes fora',
  'Goalkeeper Saves':  'Defesas do goleiro',
  'Corner Kicks':      'Escanteios',
  'Fouls':             'Faltas',
  'Yellow Cards':      'Cartões amarelos',
  'Red Cards':         'Cartões vermelhos',
  'Offsides':          'Impedimentos',
  'Passes %':          'Precisão de passes',
  'expected_goals':    'Gols esperados (xG)',
  'goals_prevented':   'Gols evitados',
  'Blocked Shots':     'Chutes bloqueados',
  'Shots insidebox':   'Chutes dentro da área',
  'Total passes':      'Passes totais',
  'Passes accurate':   'Passes certos',
};

const DISPLAY_ORDER = [
  'Ball Possession',
  'Total Shots',
  'Shots on Goal',
  'Goalkeeper Saves',
  'Corner Kicks',
  'Fouls',
  'Yellow Cards',
  'Offsides',
  'expected_goals',
];

function parseVal(raw: string | null): number {
  if (!raw) return 0;
  return parseFloat(raw.replace('%', '')) || 0;
}

function StatBar({ label, rawHome, rawAway }: { label: string; rawHome: string | null; rawAway: string | null }) {
  const h = parseVal(rawHome);
  const a = parseVal(rawAway);
  const isPct = rawHome?.includes('%') || rawAway?.includes('%');
  const total = isPct ? 100 : (h + a) || 1;
  const homePct = Math.round((h / total) * 100);

  const homeWins = h > a;
  const awayWins = a > h;
  const displayH = isPct ? `${rawHome}` : String(Math.round(h * 10) / 10);
  const displayA = isPct ? `${rawAway}` : String(Math.round(a * 10) / 10);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className={`font-bold tabular-nums w-10 ${homeWins ? 'text-white' : 'text-gray-400'}`}>{displayH}</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide text-center flex-1 px-1">{label}</span>
        <span className={`font-bold tabular-nums w-10 text-right ${awayWins ? 'text-white' : 'text-gray-400'}`}>{displayA}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800/80">
        <div
          className="h-full rounded-l-full"
          style={{ width: `${homePct}%`, background: homeWins ? '#27D888' : '#374151' }}
        />
        <div
          className="h-full rounded-r-full"
          style={{ width: `${100 - homePct}%`, background: awayWins ? '#60a5fa' : '#374151' }}
        />
      </div>
    </div>
  );
}

export default function CopaMatchStats({ stats, homeTeam, awayTeam }: Props) {
  if (!stats || stats.length === 0) {
    return <p className="text-center text-xs text-gray-500 py-4">Estatísticas não disponíveis.</p>;
  }

  const byKey = Object.fromEntries(stats.map(s => [s.strStat, s]));

  const rows = DISPLAY_ORDER
    .filter(key => byKey[key])
    .map(key => ({ key, item: byKey[key] }));

  if (rows.length === 0) return <p className="text-center text-xs text-gray-500 py-4">Estatísticas não disponíveis.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between text-[10px] text-gray-500 uppercase tracking-wider px-0.5 mb-0.5">
        <span className="truncate max-w-[120px]">{homeTeam}</span>
        <span className="truncate max-w-[120px] text-right">{awayTeam}</span>
      </div>
      {rows.map(({ key, item }) => (
        <StatBar
          key={key}
          label={PT_LABEL[key] ?? key}
          rawHome={item.intHome}
          rawAway={item.intAway}
        />
      ))}
    </div>
  );
}
