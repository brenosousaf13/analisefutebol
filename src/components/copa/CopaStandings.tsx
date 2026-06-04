import type { TsdbStanding } from '../../types/thesportsdb';

interface Props {
  standings: TsdbStanding[];
}

function GroupTable({ group, teams }: { group: string; teams: TsdbStanding[] }) {
  const sorted = [...teams].sort((a, b) => parseInt(a.intRank) - parseInt(b.intRank));

  return (
    <div className="mb-4">
      <div className="px-3 py-1.5 mb-1">
        <span className="text-[11px] font-black text-[#27D888] uppercase tracking-widest">
          {group}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[28px_1fr_28px_28px_28px_28px_36px_36px] gap-0 px-3 py-1">
        <span className="text-[9px] text-gray-600 text-center">#</span>
        <span className="text-[9px] text-gray-600">Seleção</span>
        <span className="text-[9px] text-gray-600 text-center">J</span>
        <span className="text-[9px] text-gray-600 text-center">V</span>
        <span className="text-[9px] text-gray-600 text-center">E</span>
        <span className="text-[9px] text-gray-600 text-center">D</span>
        <span className="text-[9px] text-gray-600 text-center">SG</span>
        <span className="text-[9px] text-gray-600 text-center font-bold">Pts</span>
      </div>

      {/* Rows */}
      <div className="flex flex-col divide-y divide-gray-800/40">
        {sorted.map((team, i) => {
          return (
            <div
              key={team.idTeam}
              className={`grid grid-cols-[28px_1fr_28px_28px_28px_28px_36px_36px] gap-0 px-3 py-2 items-center transition-colors hover:bg-white/[0.02] ${
                i < 2 ? 'border-l-2 border-l-[#27D888]/60' : 'border-l-2 border-l-transparent'
              }`}
            >
              <span className="text-[11px] text-gray-500 text-center tabular-nums">{team.intRank}</span>

              <div className="flex items-center gap-2 min-w-0">
                {team.strBadge ? (
                  <img
                    src={team.strBadge}
                    alt={team.strTeam}
                    className="w-5 h-5 object-contain shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-gray-700 shrink-0" />
                )}
                <span className="text-xs font-medium text-white truncate">{team.strTeam}</span>
              </div>

              <span className="text-[11px] text-gray-400 text-center tabular-nums">{team.intPlayed}</span>
              <span className="text-[11px] text-gray-400 text-center tabular-nums">{team.intWin}</span>
              <span className="text-[11px] text-gray-400 text-center tabular-nums">{team.intDraw}</span>
              <span className="text-[11px] text-gray-400 text-center tabular-nums">{team.intLoss}</span>
              <span className={`text-[11px] text-center tabular-nums ${
                parseInt(team.intGoalDifference) > 0
                  ? 'text-[#27D888]'
                  : parseInt(team.intGoalDifference) < 0
                  ? 'text-red-400'
                  : 'text-gray-400'
              }`}>
                {parseInt(team.intGoalDifference) > 0 ? '+' : ''}{team.intGoalDifference}
              </span>
              <span className="text-[12px] font-black text-white text-center tabular-nums">{team.intPoints}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CopaStandings({ standings }: Props) {
  if (standings.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">Tabela disponível após o início da Copa.</p>
        <p className="text-xs mt-1 text-gray-600">Começa em 11 de junho de 2026.</p>
      </div>
    );
  }

  // Group by strDescription (group name from TSDB)
  const grouped = standings.reduce<Record<string, TsdbStanding[]>>((acc, t) => {
    const key = t.strDescription ?? 'Outros';
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  // Sort groups alphabetically
  const groupKeys = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  // If no meaningful grouping, show flat table
  const isFlat = groupKeys.length <= 1;

  if (isFlat) {
    return (
      <div className="bg-[#141a1a] rounded-2xl overflow-hidden border border-gray-800/60">
        <GroupTable group="Classificação" teams={standings} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {groupKeys.map(group => (
        <div key={group} className="bg-[#141a1a] rounded-2xl overflow-hidden border border-gray-800/60">
          <GroupTable group={group} teams={grouped[group]} />
        </div>
      ))}
      <p className="text-[10px] text-gray-600 text-center mt-1">
        ⬜ Verde = classificados para a próxima fase
      </p>
    </div>
  );
}
