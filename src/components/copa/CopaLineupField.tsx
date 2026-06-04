import type { ApiLineup, ApiLineupPlayer } from '../../types/api-football';

interface Props {
    homeLineup: ApiLineup;
    awayLineup: ApiLineup;
}

function gridToPlayers(lineup: ApiLineup) {
    const rows: Record<number, ApiLineupPlayer[]> = {};

    lineup.startXI.forEach(({ player }) => {
        if (!player.grid) return;
        const row = parseInt(player.grid.split(':')[0]);
        if (!rows[row]) rows[row] = [];
        rows[row].push(player);
    });

    const rowNums = Object.keys(rows).map(Number);
    if (rowNums.length === 0) return [];

    const maxRow = Math.max(...rowNums);
    const step = maxRow > 1 ? 70 / (maxRow - 1) : 0;

    const result: Array<{ id: number; name: string; number: number; x: number; y: number }> = [];

    rowNums.forEach(row => {
        const rowPlayers = rows[row].sort((a, b) =>
            parseInt(a.grid!.split(':')[1]) - parseInt(b.grid!.split(':')[1])
        );
        const count = rowPlayers.length;
        const y = 90 - (row - 1) * step;
        rowPlayers.forEach((p, i) => {
            result.push({ id: p.id, name: p.name, number: p.number, x: (100 / (count + 1)) * (i + 1), y });
        });
    });

    return result;
}

function resolveColor(lineup: ApiLineup, fallback: string): string {
    const raw = lineup.team.colors?.player?.primary;
    if (!raw) return fallback;
    if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
    return fallback;
}

function shortName(name: string) {
    const parts = name.split(' ');
    const last = parts[parts.length - 1];
    return last.length > 8 ? last.slice(0, 8) : last;
}

export default function CopaLineupField({ homeLineup, awayLineup }: Props) {
    const homePlayers = gridToPlayers(homeLineup);
    const awayPlayers = gridToPlayers(awayLineup);
    const homeColor = resolveColor(homeLineup, '#dc2626');
    const awayColor = resolveColor(awayLineup, '#2563eb');

    // Map stored y (10–90) to SVG space:
    // Home half: GK (y=90) → SVG y≈138, FWD (y≈20) → SVG y≈85
    const homeY = (py: number) => 138 - ((90 - py) / 70) * 53;
    // Away half: GK (y=90) → SVG y≈12, FWD (y≈20) → SVG y≈65
    const awayY = (py: number) => 12 + ((90 - py) / 70) * 53;

    const toX = (px: number) => 5 + (px / 100) * 90;
    const toXAway = (px: number) => 95 - (px / 100) * 90;

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
            <rect x="28" y="118" width="44" height="26" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
            <rect x="37" y="132" width="26" height="12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
            <rect x="28" y="6" width="44" height="26" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
            <rect x="37" y="6" width="26" height="12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />

            {/* Formation labels */}
            <text x="50" y="148" textAnchor="middle" fontSize="3.2" fill="rgba(255,255,255,0.45)">{homeLineup.team.name}</text>
            <text x="50" y="2.5" textAnchor="middle" fontSize="3.2" fill="rgba(255,255,255,0.45)">{awayLineup.team.name}</text>

            {/* Home players */}
            {homePlayers.map(p => {
                const cx = toX(p.x);
                const cy = homeY(p.y);
                return (
                    <g key={`h-${p.id}`}>
                        <circle cx={cx} cy={cy} r="4.5" fill={homeColor} stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
                        <text x={cx} y={cy + 1.6} textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">{p.number}</text>
                        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="2.7" fill="rgba(255,255,255,0.85)">{shortName(p.name)}</text>
                    </g>
                );
            })}

            {/* Away players (x mirrored) */}
            {awayPlayers.map(p => {
                const cx = toXAway(p.x);
                const cy = awayY(p.y);
                return (
                    <g key={`a-${p.id}`}>
                        <circle cx={cx} cy={cy} r="4.5" fill={awayColor} stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
                        <text x={cx} y={cy + 1.6} textAnchor="middle" fontSize="3.5" fill="white" fontWeight="bold">{p.number}</text>
                        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="2.7" fill="rgba(255,255,255,0.85)">{shortName(p.name)}</text>
                    </g>
                );
            })}
        </svg>
    );
}
