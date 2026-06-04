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
}

// Map position string → row category (0=GK, 1=DEF, 2=MID, 3=FWD)
function posToRow(pos: string): number {
  const p = pos.toUpperCase().trim();
  if (['GK', 'GOALKEEPER'].includes(p)) return 0;
  if (['CB', 'RB', 'LB', 'RWB', 'LWB', 'DEFENDER', 'CENTRE-BACK', 'RIGHT BACK', 'LEFT BACK',
       'RIGHT WING BACK', 'LEFT WING BACK', 'FULLBACK', 'CENTRE BACK'].some(x => p.includes(x))) return 1;
  // Wingers and forwards → row 3
  if (['CF', 'ST', 'STRIKER', 'FORWARD', 'CENTRE-FORWARD', 'SECOND STRIKER',
       'RW', 'LW', 'RIGHT WING', 'LEFT WING', 'WINGER'].some(x => p === x || p === x.replace('-', ' '))) return 3;
  // Everything else (DM, CM, AM, MF, Midfielder) → row 2
  return 2;
}

function shortName(name: string): string {
  const parts = name.split(' ');
  if (parts.length === 1) return name.length > 9 ? name.slice(0, 9) : name;
  const last = parts[parts.length - 1];
  return last.length > 9 ? last.slice(0, 9) : last;
}

function buildFieldPlayers(
  players: TsdbLineupPlayer[],
  isHome: boolean
): FieldPlayer[] {
  const starters = players.filter(p => p.strSubstitute === 'No');

  // Group by row
  const rowMap: Record<number, TsdbLineupPlayer[]> = { 0: [], 1: [], 2: [], 3: [] };
  starters.forEach(p => {
    const row = posToRow(p.strPosition);
    rowMap[row].push(p);
  });

  // Remove empty rows and assign y values
  const usedRows = ([0, 1, 2, 3] as const).filter(r => rowMap[r].length > 0);
  const totalRows = usedRows.length;

  const result: FieldPlayer[] = [];

  usedRows.forEach((row, ri) => {
    const pct = totalRows > 1 ? ri / (totalRows - 1) : 0;
    // home: GK at bottom (y=83), FWD at y=17
    // away: GK at top (y=17), FWD at y=83
    const y = isHome ? 83 - pct * 66 : 17 + pct * 66;

    const rowPlayers = rowMap[row];
    const count = rowPlayers.length;

    rowPlayers.forEach((p, i) => {
      const xBase = (100 / (count + 1)) * (i + 1);
      result.push({
        id: p.idPlayer,
        name: p.strPlayer,
        number: parseInt(p.intSquadNumber ?? '0', 10) || 0,
        x: isHome ? xBase : 100 - xBase, // mirror away team
        y,
      });
    });
  });

  return result;
}

const svgX = (px: number) => 5 + (px / 100) * 90;
const svgY = (py: number) => 8 + ((py - 15) / 70) * 134;

export default function CopaLineupField({ lineup, homeTeamId, awayTeamId }: Props) {
  const homePlayers = lineup.filter(p => p.idTeam === homeTeamId || p.strHome === 'Yes');
  const awayPlayers = lineup.filter(p => p.idTeam === awayTeamId || p.strHome === 'No');

  const HOME_COLOR = '#dc2626';
  const AWAY_COLOR = '#2563eb';

  const homeField = buildFieldPlayers(homePlayers, true);
  const awayField = buildFieldPlayers(awayPlayers, false);

  const homeFormation = homePlayers.find(p => p.strFormation)?.strFormation;
  const awayFormation = awayPlayers.find(p => p.strFormation)?.strFormation;
  const homeTeamName = homePlayers[0]?.strTeam ?? '';
  const awayTeamName = awayPlayers[0]?.strTeam ?? '';

  return (
    <svg viewBox="0 0 100 150" className="w-full rounded-xl" style={{ background: '#1e4d2b', display: 'block' }}>
      {/* Field lines */}
      <rect x="5" y="4" width="90" height="142" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.7" rx="1" />
      <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
      <circle cx="50" cy="75" r="10" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
      <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.35)" />
      <rect x="28" y="118" width="44" height="26" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      <rect x="37" y="132" width="26" height="12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      <rect x="28" y="6"   width="44" height="26" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      <rect x="37" y="6"   width="26" height="12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />

      {/* Team + formation labels */}
      <text x="50" y="148.5" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.4)">
        {homeTeamName}{homeFormation ? ` · ${homeFormation}` : ''}
      </text>
      <text x="50" y="2.5" textAnchor="middle" fontSize="3" fill="rgba(255,255,255,0.4)">
        {awayTeamName}{awayFormation ? ` · ${awayFormation}` : ''}
      </text>

      {/* Home players */}
      {homeField.map(p => {
        const cx = svgX(p.x);
        const cy = svgY(p.y);
        return (
          <g key={`h-${p.id}`}>
            <circle cx={cx} cy={cy} r="4.5" fill={HOME_COLOR} stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
            <text x={cx} y={cy + 1.6} textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">{p.number || ''}</text>
            <text x={cx} y={cy + 8}   textAnchor="middle" fontSize="2.7" fill="rgba(255,255,255,0.85)">{shortName(p.name)}</text>
          </g>
        );
      })}

      {/* Away players */}
      {awayField.map(p => {
        const cx = svgX(p.x);
        const cy = svgY(p.y);
        return (
          <g key={`a-${p.id}`}>
            <circle cx={cx} cy={cy} r="4.5" fill={AWAY_COLOR} stroke="rgba(255,255,255,0.5)" strokeWidth="0.6" />
            <text x={cx} y={cy + 1.6} textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">{p.number || ''}</text>
            <text x={cx} y={cy + 8}   textAnchor="middle" fontSize="2.7" fill="rgba(255,255,255,0.85)">{shortName(p.name)}</text>
          </g>
        );
      })}
    </svg>
  );
}
