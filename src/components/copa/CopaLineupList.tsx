import type { TsdbLineupPlayer } from '../../types/thesportsdb';

interface Props {
  lineup: TsdbLineupPlayer[];
}

type PosGroup = 'GK' | 'DEF' | 'MID' | 'FWD';

const GROUP_LABEL: Record<PosGroup, string> = {
  GK: 'Goleiro', DEF: 'Defesa', MID: 'Meio', FWD: 'Ataque',
};

function classifyPos(pos: string): PosGroup {
  const p = pos.toUpperCase().trim();
  if (p === 'GK' || p.includes('GOALKEEPER')) return 'GK';
  if (
    ['CB', 'RB', 'LB', 'RWB', 'LWB'].includes(p) ||
    ['DEFENDER', 'CENTRE-BACK', 'RIGHT BACK', 'LEFT BACK', 'WING BACK', 'FULLBACK', 'CENTRE BACK'].some(x => p.includes(x))
  ) return 'DEF';
  if (
    ['CF', 'ST', 'RW', 'LW'].includes(p) ||
    ['STRIKER', 'FORWARD', 'WINGER', 'WING', 'CENTRE-FORWARD', 'SECOND STRIKER'].some(x => p.includes(x))
  ) return 'FWD';
  return 'MID';
}

function displayName(full: string): string {
  const parts = full.trim().split(' ');
  if (parts.length === 1) return full;
  const last = parts[parts.length - 1];
  return last.length >= 4 ? last : parts.slice(-2).join(' ');
}

function buildGroups(players: TsdbLineupPlayer[]): { group: PosGroup; players: TsdbLineupPlayer[] }[] {
  const order: PosGroup[] = ['GK', 'DEF', 'MID', 'FWD'];
  const map = new Map<PosGroup, TsdbLineupPlayer[]>();
  players.forEach(p => {
    const g = classifyPos(p.strPosition);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(p);
  });
  return order.filter(g => map.has(g)).map(g => ({ group: g, players: map.get(g)! }));
}

function HomeRow({ p }: { p: TsdbLineupPlayer }) {
  return (
    <div className="flex items-center gap-1.5 py-[3px]">
      <span className="text-[10px] text-gray-500 font-mono w-4 text-right shrink-0 tabular-nums">
        {p.intSquadNumber ?? ''}
      </span>
      <span className="text-[12px] text-white truncate">{displayName(p.strPlayer)}</span>
    </div>
  );
}

function AwayRow({ p }: { p: TsdbLineupPlayer }) {
  return (
    <div className="flex items-center justify-end gap-1.5 py-[3px]">
      <span className="text-[12px] text-white truncate">{displayName(p.strPlayer)}</span>
      <span className="text-[10px] text-gray-500 font-mono w-4 text-left shrink-0 tabular-nums">
        {p.intSquadNumber ?? ''}
      </span>
    </div>
  );
}

export default function CopaLineupList({ lineup }: Props) {
  const homeStarters = lineup.filter(p => p.strHome === 'Yes' && p.strSubstitute === 'No');
  const awayStarters = lineup.filter(p => p.strHome === 'No' && p.strSubstitute === 'No');
  const homeSubs    = lineup.filter(p => p.strHome === 'Yes' && p.strSubstitute === 'Yes');
  const awaySubs    = lineup.filter(p => p.strHome === 'No'  && p.strSubstitute === 'Yes');

  const homeGroups = buildGroups(homeStarters);
  const awayGroups = buildGroups(awayStarters);

  const homeFormation = lineup.find(p => p.strHome === 'Yes' && p.strFormation)?.strFormation;
  const awayFormation = lineup.find(p => p.strHome === 'No'  && p.strFormation)?.strFormation;
  const homeTeam = homeStarters[0]?.strTeam ?? '';
  const awayTeam = awayStarters[0]?.strTeam ?? '';

  const allGroups: PosGroup[] = ['GK', 'DEF', 'MID', 'FWD'];
  const usedGroups = allGroups.filter(g =>
    homeGroups.some(hg => hg.group === g) || awayGroups.some(ag => ag.group === g)
  );

  return (
    <div className="space-y-3">
      {/* Team headers */}
      <div className="grid grid-cols-2 gap-2">
        <span className="text-[11px] font-bold text-gray-300 truncate">
          {homeTeam}{homeFormation ? ` · ${homeFormation}` : ''}
        </span>
        <span className="text-[11px] font-bold text-gray-300 text-right truncate">
          {awayFormation ? `${awayFormation} · ` : ''}{awayTeam}
        </span>
      </div>

      {/* Position groups */}
      {usedGroups.map(g => {
        const hg = homeGroups.find(x => x.group === g);
        const ag = awayGroups.find(x => x.group === g);
        return (
          <div key={g}>
            <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-0.5 border-b border-gray-800/60 pb-0.5">
              {GROUP_LABEL[g]}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>{(hg?.players ?? []).map(p => <HomeRow key={p.idPlayer} p={p} />)}</div>
              <div>{(ag?.players ?? []).map(p => <AwayRow key={p.idPlayer} p={p} />)}</div>
            </div>
          </div>
        );
      })}

      {/* Subs */}
      {(homeSubs.length > 0 || awaySubs.length > 0) && (
        <div>
          <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-0.5 border-b border-gray-800/60 pb-0.5 mt-1">
            Suplentes
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>{homeSubs.map(p => <HomeRow key={p.idPlayer} p={p} />)}</div>
            <div>{awaySubs.map(p => <AwayRow key={p.idPlayer} p={p} />)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
