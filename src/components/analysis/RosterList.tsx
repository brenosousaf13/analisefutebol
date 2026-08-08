import React from 'react';
import { Info, Footprints } from 'lucide-react';
import type { Player } from '../../types/Player';
import { sortRoster } from '../../utils/rosterOrder';
import { nameKey, type PlayerTally } from '../../utils/playerTally';

interface Props {
    title: string;
    players: Player[];
    teamColor: string;
    /** Fundo do marcador em campo — a bolinha da lista usa o mesmo. */
    teamBgColor?: string;
    tallies: Map<string, PlayerTally>;
    /** Duplo clique abre a janela de anotacoes do jogador. */
    onPlayerDoubleClick?: (player: Player) => void;
    /** Clique simples — usado no banco para promover o reserva a titular. */
    onPlayerClick?: (player: Player) => void;
    emptyLabel?: string;
}

/**
 * Lista de jogadores de uma secao ("EM CAMPO" ou "SUPLENTES").
 *
 * Os indicativos de gol, assistencia e anotacao aparecem AQUI e so aqui — o
 * marcador dentro do campo nao mostra nenhum indicador.
 */
const RosterList: React.FC<Props> = ({
    title, players, teamColor, teamBgColor, tallies, onPlayerDoubleClick, onPlayerClick,
    emptyLabel = 'Ninguém nesta lista.',
}) => {
    const ordered = sortRoster(players);

    return (
        // shrink-0: sem isso, como filho de um flex column a lista encolhe
        // abaixo da propria altura e o conteudo transborda por cima da de baixo.
        <div className="shrink-0">
            <h4 className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {title}
            </h4>

            {ordered.length === 0 ? (
                <p className="px-1 text-xs italic text-gray-600">{emptyLabel}</p>
            ) : (
                <ul className="flex flex-col gap-0.5">
                    {ordered.map(player => {
                        const tally = tallies.get(nameKey(player.name));
                        const goals = tally?.goals ?? 0;
                        const assists = tally?.assists ?? 0;
                        const hasNote = !!player.note?.trim();

                        return (
                            <li key={player.id}>
                                <div
                                    onClick={() => onPlayerClick?.(player)}
                                    onDoubleClick={() => onPlayerDoubleClick?.(player)}
                                    title="Duplo clique para abrir as anotações"
                                    className="flex cursor-pointer select-none items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-white/5"
                                >
                                    {/* Mesmas cores do marcador em campo: fundo do
                                        time, numero e borda na cor do time. */}
                                    <span
                                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                                        style={{
                                            backgroundColor: teamBgColor || '#090909',
                                            color: teamColor,
                                            border: `2px solid ${teamColor}`,
                                        }}
                                    >
                                        {player.number}
                                    </span>

                                    <span className="min-w-0 flex-1 truncate text-xs text-gray-200">
                                        {player.name}
                                    </span>

                                    <span className="flex shrink-0 items-center gap-1">
                                        {goals > 0 && (
                                            <span
                                                title={`${goals} gol${goals > 1 ? 's' : ''}`}
                                                className="inline-flex items-center gap-0.5 text-[10px] text-gray-300"
                                            >
                                                <span aria-hidden>⚽</span>
                                                {goals > 1 && <span className="tabular-nums">{goals}</span>}
                                            </span>
                                        )}
                                        {assists > 0 && (
                                            <span
                                                title={`${assists} assistência${assists > 1 ? 's' : ''}`}
                                                className="inline-flex items-center gap-0.5 text-[10px] text-gray-300"
                                            >
                                                <Footprints size={12} />
                                                {assists > 1 && <span className="tabular-nums">{assists}</span>}
                                            </span>
                                        )}
                                        {hasNote && (
                                            <span title="Tem anotação" className="text-accent-green">
                                                <Info size={12} />
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default RosterList;
