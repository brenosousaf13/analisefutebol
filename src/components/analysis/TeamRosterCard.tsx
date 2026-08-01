import React from 'react';
import { FileText } from 'lucide-react';
import TeamLogoImage from '../TeamLogoImage';
import type { Player } from '../../types/Player';
import { nameKey, type PlayerTally } from '../../utils/playerTally';

interface Props {
    teamName: string;
    teamLogo?: string;
    coachName?: string;
    teamColor?: string;
    /** Apenas os jogadores que estao em campo na fase exibida. */
    players: Player[];
    tallies: Map<string, PlayerTally>;
    onPlayerClick?: (player: Player) => void;
}

const Indicator: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <span
        title={label}
        aria-label={label}
        className="inline-flex items-center gap-0.5 text-[11px] leading-none text-content-secondary"
    >
        {children}
    </span>
);

/**
 * Coluna lateral de um time: escudo, nome, tecnico e a lista dos jogadores em
 * campo. Os indicadores de anotacao, gol e assistencia vivem aqui — e so aqui.
 */
const TeamRosterCard: React.FC<Props> = ({
    teamName, teamLogo, coachName, teamColor, players, tallies, onPlayerClick,
}) => (
    <aside className="flex h-full flex-col rounded-card border border-line bg-surface-raised p-4 shadow-card">
        <div className="mb-4">
            <div className="mb-3 grid h-16 w-16 place-items-center overflow-hidden rounded-control border border-line bg-surface-overlay">
                <TeamLogoImage logoUrl={teamLogo} teamName={teamName} className="h-12 w-12" />
            </div>

            <h2
                className="border-l-4 pl-2 text-lg font-bold leading-tight text-content-primary"
                style={{ borderColor: teamColor || 'transparent' }}
            >
                {teamName}
            </h2>
            <p className="mt-1 pl-2 text-xs text-content-muted">
                {coachName?.trim() ? coachName : 'Técnico não informado'}
            </p>
        </div>

        {players.length === 0 ? (
            <p className="text-sm italic text-content-muted">Nenhum jogador em campo nesta fase.</p>
        ) : (
            <ul className="flex flex-col gap-1 overflow-y-auto">
                {players.map(player => {
                    const tally = tallies.get(nameKey(player.name));
                    const hasNote = !!player.note?.trim();
                    const goals = tally?.goals ?? 0;
                    const assists = tally?.assists ?? 0;

                    return (
                        <li key={player.id}>
                            <button
                                type="button"
                                onClick={() => onPlayerClick?.(player)}
                                disabled={!hasNote}
                                title={hasNote ? player.note : undefined}
                                className={`
                                    flex w-full items-center gap-2 rounded-control px-1.5 py-1.5 text-left
                                    transition-colors
                                    ${hasNote ? 'hover:bg-surface-overlay' : 'cursor-default'}
                                `}
                            >
                                <span
                                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold text-content-primary"
                                    style={{ borderColor: teamColor || 'rgba(255,255,255,0.16)' }}
                                >
                                    {player.number}
                                </span>

                                <span className="min-w-0 flex-1 truncate text-sm text-content-primary">
                                    {player.name}
                                </span>

                                <span className="flex shrink-0 items-center gap-1.5">
                                    {goals > 0 && (
                                        <Indicator label={`${goals} gol${goals > 1 ? 's' : ''}`}>
                                            <span aria-hidden>⚽</span>
                                            {goals > 1 && <span className="tabular-nums">{goals}</span>}
                                        </Indicator>
                                    )}
                                    {assists > 0 && (
                                        <Indicator label={`${assists} assistência${assists > 1 ? 's' : ''}`}>
                                            <span aria-hidden>🅰</span>
                                            {assists > 1 && <span className="tabular-nums">{assists}</span>}
                                        </Indicator>
                                    )}
                                    {hasNote && (
                                        <Indicator label="Tem anotação">
                                            <FileText size={13} className="text-brand-primary" />
                                        </Indicator>
                                    )}
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        )}
    </aside>
);

export default TeamRosterCard;
