import type { TsdbLineupPlayer } from '../../types/thesportsdb';

interface Props {
  lineup: TsdbLineupPlayer[];
  homeTeamId: string;
  awayTeamId: string;
}

interface FieldPlayer {
  id: string;
  name: string;
  number: number;
  x: number;
  y: number;
  color: string;
}

/** Parse "4-3-3" → [1, 4, 3, 3] (GK always prepended) */
function parseFormation(formation: string): number[] {
  const parts = formation.split('-').map(Number).filter(n => !isNaN(n) && n > 0);
  return parts.length > 0 ? [1, ...parts] : [1, 4, 3, 3];
}

/** Assign players to rows using formation counts, then compute x/y */
function toFieldPlayers(
  players: TsdbLineupPlayer[],
  formation: string,
  isHome: boolean
): FieldPlayer[] {
  const starting = players.filter(p => p.strEvent === 'Starting XI');
  const rowCounts = parseFormation(formation);
  const totalRows = rowCounts.length;

  // y positions: home GK at bottom (y≈85), home FW at y≈15
  //              away GK at top  (y≈15), away FW at y≈85
  const yPositions = rowCounts.map((_, ri) => {
    const pct = ri / Math.max(totalRows - 1, 1); // 0 = GK row, 1 = FW row
    return isHome ? 85 - pct * 70 : 15 + pct * 70;
  });

  const result: FieldPlayer[] = [];
  let playerIdx = 0;

  rowCounts.forEach((count, rowIdx) => {
    for (let i = 0; i < count; i++) {
      const p = starting[playerIdx++];
      if (!p) return;

      const xBase = isHome
        ? (100 / (count + 1)) * (i + 1)
        : 100 - (100 / (count + 1)) * (i + 1); // mirror away team

      result.push({
        id: p.idPlayer,
        name: p.strPlayer,
        number: parseInt(p.intShirtNumber ?? '0', 10) || 0,
        x: xBase,
        y: yPositions[rowIdx],
        color: '', // set by caller
      });
    }
  });

  return result;
}

function shortName(name: string): string {
  const parts = name.split(' ');
  const last = parts[parts.length - 1];
  return last.length > 9 ? last.slice(0, 9) : last;
}

export default function CopaLineupField({ lineup, homeTeamId, awayTeamId }: Props) {
  const homePlayers = lineup.filter(p => p.idTeam === homeTeamId);
  const awayPlayers = lineup.filter(p => p.idTeam === awayTeamId);

  const homeFormation = homePlayers.find(p => p.strFormation)?.strFormation ?? '4-4-2';
  const awayFormation = awayPlayers.find(p => p.strFormation)?.strFormation ?? '4-4-2';

  const HOME_COLOR = '#dc2626';
  const AWAY_COLOR = '#2563eb';

  const homeField = toFieldPlayers(homePlayers, homeFormation, true).map(p => ({ ...p, color: HOME_COLOR }));
  const awayField = toFieldPlayers(awayPlayers, awayFormation, false).map(p => ({ ...p, color: AWAY_COLOR }));

  const homeTeamName = homePlayers[0]?.strTeam ?? '';
  const awayTeamName = awayPlayers[0]?.strTeam ?? '';

  const svgToX = (px: number) => 5 + (px / 100) * 90;
  const svgToY = (py: number) => {
    // Map y ∈ [15, 85] → SVG y ∈ [8, 142]
    return 8 + ((py - 15) / 70) * 134;
  };

  return (
    <svg
      viewBox="0 0 100 150"
      className="w-full rounded-xl"
      style={{ background: '#1e4d2b', display: 'block' }}
    >
      {/* Field lines */}
      <rect x="5" y="4" width="90" height="142" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" rx="1" />
      <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
      <circle cx="50" cy="75" r="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
      <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.35)" />
      {/* Home penalty area */}
      <rect x="28" y="118" width="44" height="26" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      <rect x="37" y="132" width="26" height="12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      {/* Away penalty area */}
      <rect x="28" y="6" width="44" height="26" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      <rect x="37" y="6" width="26" height="12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />

      {/* Formation labels */}
      <text x="50" y="148.5" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.4)">{homeTeamName} · {homeFormation}</text>
      <text x="50" y="2.5" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.4)">{awayTeamName} · {awayFormation}</text>

      {/* Home players */}
      {homeField.map(p => {
        const cx = svgToX(p.x);
        const cy = svgToY(p.y);
        return (
          <g key={`h-${p.id}`}>
            <circle cx={cx} cy={cy} r="4.5" fill={p.color} stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
            <text x={cx} y={cy + 1.6} textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">
              {p.number || ''}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="2.7" fill="rgba(255,255,255,0.85)">
              {shortName(p.name)}
            </text>
          </g>
        );
      })}

      {/* Away players */}
      {awayField.map(p => {
        const cx = svgToX(p.x);
        const cy = svgToY(p.y);
        return (
          <g key={`a-${p.id}`}>
            <circle cx={cx} cy={cy} r="4.5" fill={p.color} stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
            <text x={cx} y={cy + 1.6} textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">
              {p.number || ''}
            </text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="2.7" fill="rgba(255,255,255,0.85)">
              {shortName(p.name)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
