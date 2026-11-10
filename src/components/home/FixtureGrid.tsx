import React, { useMemo } from 'react';
import FixtureCard from './FixtureCard';
import LeagueLogo from './LeagueLogo';
import type { ApiFixture } from '../../types/api-football';
import { groupFixturesByLeague, matchesSearch } from '../../utils/leagueDisplay';
import { isFixtureStartingSoon } from '../../utils/fixtureStatus';

interface Props {
    fixtures: ApiFixture[];
    /** Texto da busca por equipe. A filtragem só esconde cards; nada é recarregado. */
    query: string;
    /** Também procura pelo nome do campeonato e do país. */
    searchLeagues?: boolean;
    /** Jogos com escalações confirmadas. */
    confirmedIds?: ReadonlySet<number>;
    /** Hora de referência para "começa em até 1h"; sem ela, usa o relógio. */
    now?: number;
    creatingFixtureId: number | null;
    onSelect: (fixture: ApiFixture) => void;
    containerRef?: React.RefObject<HTMLDivElement | null>;
}

const NO_IDS: ReadonlySet<number> = new Set();

/**
 * Partidas separadas por campeonato, em cards (3 por linha no desktop).
 *
 * Todos os cards ficam no DOM e a busca só esconde os que não casam: o filtro
 * é instantâneo, não mexe nos dados e não atrapalha o observador de escalações,
 * que acompanha os mesmos elementos.
 */
const FixtureGrid: React.FC<Props> = ({
    fixtures, query, searchLeagues = false, confirmedIds = NO_IDS, now,
    creatingFixtureId, onSelect, containerRef,
}) => {
    const groups = useMemo(() => groupFixturesByLeague(fixtures), [fixtures]);

    return (
        <div ref={containerRef} className="flex flex-col gap-9">
            {groups.map(group => {
                const visible = group.fixtures.filter(f => matchesSearch(f, query, searchLeagues));
                const visibleIds = new Set(visible.map(f => f.fixture.id));
                const headingId = `league-${group.leagueId}`;

                return (
                    <section key={group.leagueId} aria-labelledby={headingId} className={visible.length === 0 ? 'hidden' : undefined}>
                        <div className="mb-3 flex items-center gap-3">
                            <LeagueLogo key={group.league.logo} league={group.league} />
                            <div className="min-w-0">
                                <h2 id={headingId} className="truncate text-base font-bold leading-tight text-content-primary">{group.name}</h2>
                                {group.subtitle && <p className="mt-0.5 truncate text-xs text-content-secondary">{group.subtitle}</p>}
                            </div>
                        </div>

                        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {group.fixtures.map(f => (
                                <li
                                    key={f.fixture.id}
                                    data-fixture-id={f.fixture.id}
                                    className={visibleIds.has(f.fixture.id) ? undefined : 'hidden'}
                                >
                                    <FixtureCard
                                        fixture={f}
                                        lineupsConfirmed={confirmedIds.has(f.fixture.id) && isFixtureStartingSoon(f, now)}
                                        creating={creatingFixtureId === f.fixture.id}
                                        disabled={creatingFixtureId !== null}
                                        onSelect={onSelect}
                                    />
                                </li>
                            ))}
                        </ul>
                    </section>
                );
            })}
        </div>
    );
};

export default FixtureGrid;
