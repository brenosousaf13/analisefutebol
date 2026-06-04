import type { TsdbTimeline } from '../../types/thesportsdb';

interface Props {
  events: TsdbTimeline[];
  homeTeamId: string;
}

const ICONS: Record<string, string> = {
  'Goal':         '⚽',
  'Own Goal':     '⚽',
  'Yellow Card':  '🟨',
  'Red Card':     '🟥',
  'Substitution': '🔄',
  'Penalty':      '⚽',
  'Missed Penalty': '❌',
};

const COLORS: Record<string, string> = {
  'Goal':          '#27D888',
  'Own Goal':      '#f87171',
  'Yellow Card':   '#fbbf24',
  'Red Card':      '#ef4444',
  'Substitution':  '#6b7280',
  'Penalty':       '#27D888',
  'Missed Penalty':'#f87171',
};

export default function CopaTimeline({ events, homeTeamId }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-center text-xs text-gray-500 py-4">Nenhum evento disponível.</p>
    );
  }

  return (
    <div className="flex flex-col gap-0.5">
      {events.map((ev, i) => {
        const isHome = ev.idTeam === homeTeamId;
        const icon = ICONS[ev.strTimeline] ?? '•';
        const color = COLORS[ev.strTimeline] ?? '#6b7280';
        const label = ev.strTimeline === 'Own Goal' ? 'Gol contra' : ev.strTimeline;

        return (
          <div
            key={ev.idTimeline ?? i}
            className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs ${isHome ? 'flex-row' : 'flex-row-reverse'}`}
          >
            {/* Minute bubble */}
            <span className="shrink-0 text-[10px] text-gray-500 w-8 text-center tabular-nums">
              {ev.strTimelineDetail ?? ''}
            </span>

            {/* Icon */}
            <span className="shrink-0 text-base leading-none">{icon}</span>

            {/* Details */}
            <div className={`flex flex-col min-w-0 ${isHome ? 'items-start' : 'items-end'}`}>
              <span className="font-semibold text-white truncate max-w-[140px]">
                {ev.strPlayer ?? ''}
              </span>
              <span className="text-[10px]" style={{ color }}>
                {label}
                {ev.intTimelineScore ? ` · ${ev.intTimelineScore}` : ''}
              </span>
              {ev.strComment && (
                <span className="text-[10px] text-gray-500 truncate max-w-[140px]">
                  {ev.strComment}
                </span>
              )}
            </div>

            {/* Center divider dot */}
            <div className="flex-1 flex justify-center">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
