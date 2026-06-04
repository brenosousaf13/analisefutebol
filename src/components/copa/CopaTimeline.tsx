import type { TsdbTimeline } from '../../types/thesportsdb';

interface Props {
  events: TsdbTimeline[];
  homeTeamId: string;
}

// strTimeline values from real API: "Goal", "Card", "subst"
// strTimelineDetail: "Normal Goal", "Yellow Card", "Red Card", "Substitution 1", etc.

function getIcon(timeline: string, detail: string | null): string {
  const t = timeline.toLowerCase();
  const d = (detail ?? '').toLowerCase();
  if (t === 'goal' || d.includes('goal')) return '⚽';
  if (d.includes('red')) return '🟥';
  if (d.includes('yellow')) return '🟨';
  if (t === 'subst' || d.includes('sub')) return '🔄';
  return '•';
}

function getColor(timeline: string, detail: string | null): string {
  const t = timeline.toLowerCase();
  const d = (detail ?? '').toLowerCase();
  if (t === 'goal' || d.includes('goal')) return '#27D888';
  if (d.includes('red')) return '#ef4444';
  if (d.includes('yellow')) return '#fbbf24';
  if (t === 'subst') return '#6b7280';
  return '#6b7280';
}

function getLabel(timeline: string, detail: string | null): string {
  const t = timeline.toLowerCase();
  const d = (detail ?? '').toLowerCase();
  if (d.includes('own goal')) return 'Gol contra';
  if (d.includes('penalty') && t === 'goal') return 'Gol de pênalti';
  if (t === 'goal') return 'Gol';
  if (d.includes('red')) return 'Cartão vermelho';
  if (d.includes('yellow')) return 'Cartão amarelo';
  if (t === 'subst') return 'Substituição';
  return detail ?? timeline;
}

export default function CopaTimeline({ events, homeTeamId }: Props) {
  if (events.length === 0) {
    return <p className="text-center text-xs text-gray-500 py-4">Nenhum evento disponível.</p>;
  }

  // Sort by match minute
  const sorted = [...events].sort((a, b) =>
    parseInt(a.intTime ?? '0') - parseInt(b.intTime ?? '0')
  );

  return (
    <div className="flex flex-col gap-0.5">
      {sorted.map((ev, i) => {
        const isHome = ev.strHome === 'Yes' || ev.idTeam === homeTeamId;
        const icon  = getIcon(ev.strTimeline, ev.strTimelineDetail);
        const color = getColor(ev.strTimeline, ev.strTimelineDetail);
        const label = getLabel(ev.strTimeline, ev.strTimelineDetail);
        const minute = ev.intTime ? `${ev.intTime}'` : '';

        return (
          <div key={ev.idTimeline ?? i} className="flex items-center gap-2 py-1.5 px-1 rounded-lg text-xs">
            {/* Minute */}
            <span className="shrink-0 text-[10px] text-gray-500 w-7 text-center tabular-nums font-mono">
              {minute}
            </span>

            {/* Home side */}
            {isHome ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-base leading-none shrink-0">{icon}</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-white truncate">{ev.strPlayer ?? ''}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]" style={{ color }}>{label}</span>
                    {ev.strAssist && (
                      <span className="text-[10px] text-gray-500 truncate">· assist: {ev.strAssist}</span>
                    )}
                  </div>
                </div>
                {/* Spacer for away side */}
                <div className="flex-1" />
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 opacity-0 w-20" />
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1 min-w-0 flex-row-reverse">
                <span className="text-base leading-none shrink-0">{icon}</span>
                <div className="flex flex-col min-w-0 items-end">
                  <span className="font-semibold text-white truncate">{ev.strPlayer ?? ''}</span>
                  <div className="flex items-center gap-1 flex-row-reverse">
                    <span className="text-[10px]" style={{ color }}>{label}</span>
                    {ev.strAssist && (
                      <span className="text-[10px] text-gray-500 truncate">assist: {ev.strAssist} ·</span>
                    )}
                  </div>
                </div>
                <div className="flex-1" />
                <div className="w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
                <div className="flex-1 opacity-0 w-20" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
