import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ListFilter, Check } from 'lucide-react';
import TeamLogoImage from '../TeamLogoImage';
import type { ApiFixture } from '../../types/api-football';
import { fixtureTimeLabel, isFixtureFinished, isFixtureLive, isFixtureStartingSoon } from '../../utils/fixtureStatus';
import LeagueFlag from './LeagueFlag';
import { useFixtureLineups } from '../../hooks/useFixtureLineups';

interface Props {
    fixtures: ApiFixture[];
    loading: boolean;
    error?: string | null;
    onRetry?: () => void;
    /** Id do jogo cuja analise esta sendo criada agora. */
    creatingFixtureId: number | null;
    onCreate: (fixture: ApiFixture) => void;
}

const TodayFixturesPanel: React.FC<Props> = ({ fixtures, loading, error, onRetry, creatingFixtureId, onCreate }) => {
    const [filterOpen, setFilterOpen] = useState(false);
    // null = nenhum filtro aplicado (mostra tudo). Set vazio = nada marcado.
    const [selected, setSelected] = useState<Set<number> | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const leagues = useMemo(() => {
        const map = new Map<number, ApiFixture['league']>();
        for (const f of fixtures) {
            if (f.league?.id && !map.has(f.league.id)) map.set(f.league.id, f.league);
        }
        return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name, 'pt-BR')
            || a[1].country.localeCompare(b[1].country, 'pt-BR'));
    }, [fixtures]);

    const visible = useMemo(
        () => (selected === null ? fixtures : fixtures.filter(f => selected.has(f.league?.id))),
        [fixtures, selected],
    );
    const { statuses: lineupStatuses, now } = useFixtureLineups(visible, scrollRef);

    useEffect(() => {
        if (!filterOpen) return;
        const onDown = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [filterOpen]);

    const toggleLeague = (id: number) => {
        setSelected(prev => {
            const base = prev === null ? new Set(leagues.map(([lid]) => lid)) : new Set(prev);
            if (base.has(id)) base.delete(id); else base.add(id);
            // Todos marcados equivale a nenhum filtro.
            return base.size === leagues.length ? null : base;
        });
    };

    const activeFilterCount = selected === null ? 0 : selected.size;

    return (
        <section aria-labelledby="today-fixtures-title" className="flex h-[calc(100dvh-7rem)] min-h-0 flex-col rounded-card border border-line bg-surface-raised shadow-card lg:h-[calc(100dvh-8rem)] xl:sticky xl:top-24">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-5 sm:px-5">
                <div>
                    <h2 id="today-fixtures-title" className="text-xl font-bold tracking-tight text-content-primary">Agenda do dia</h2>
                    {!loading && fixtures.length > 0 && (
                        <p className="mt-1 text-[11px] text-content-muted" aria-live="polite">
                            {selected === null ? fixtures.length : `${visible.length} de ${fixtures.length}`} partidas · Brasília
                        </p>
                    )}
                </div>

                {leagues.length > 0 && (
                    <div ref={filterRef} className="relative">
                        <button
                            onClick={() => setFilterOpen(v => !v)}
                            aria-expanded={filterOpen}
                            className="flex items-center gap-1.5 rounded-control border border-line px-2.5 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:border-line-strong hover:text-content-primary"
                        >
                            <ListFilter size={14} />
                            Campeonatos
                            {activeFilterCount > 0 && (
                                <span className="rounded-full bg-brand-primary px-1.5 text-[10px] font-bold text-nav-dark">
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>

                        {filterOpen && (
                            <div className="absolute right-0 top-[calc(100%+6px)] z-30 max-h-[min(18rem,60dvh)] w-64 overflow-y-auto overscroll-contain rounded-control border border-line bg-surface-raised p-1 shadow-pop">
                                <button
                                    onClick={() => setSelected(null)}
                                    className="w-full rounded px-2.5 py-1.5 text-left text-xs font-semibold text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
                                >
                                    Mostrar todos
                                </button>
                                <div className="my-1 h-px bg-line-subtle" />
                                {leagues.map(([id, league]) => {
                                    const checked = selected === null || selected.has(id);
                                    return (
                                        <button
                                            key={id}
                                            onClick={() => toggleLeague(id)}
                                            role="menuitemcheckbox"
                                            aria-checked={checked}
                                            className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-xs text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
                                        >
                                            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${checked ? 'border-brand-primary bg-brand-primary text-nav-dark' : 'border-line'}`}>
                                                {checked && <Check size={11} strokeWidth={3} />}
                                            </span>
                                            <LeagueFlag flag={league.flag} country={league.country} />
                                            <span className="min-w-0 flex-1 truncate" title={`${league.name} — ${league.country}`}>{league.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {error && (
                <div role="alert" className="flex shrink-0 flex-wrap items-center gap-2 px-4 pb-3 text-xs text-amber-300 sm:px-5">
                    <span>{fixtures.length > 0 ? 'Não foi possível atualizar a agenda.' : error}</span>
                    <button onClick={onRetry} className="font-semibold underline">Tentar novamente</button>
                </div>
            )}

            <div ref={scrollRef} role="region" aria-label="Partidas do dia" tabIndex={0} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-primary/50 sm:px-5">
                {loading && (
                    <div className="flex items-center gap-2 py-10 text-sm text-content-muted">
                        <Loader2 size={16} className="animate-spin" />
                        Buscando jogos…
                    </div>
                )}

                {!loading && !error && fixtures.length === 0 && (
                    <p className="py-10 text-center text-sm text-content-muted">
                        Nenhuma partida hoje nas ligas acompanhadas.
                    </p>
                )}

                {!loading && fixtures.length > 0 && visible.length === 0 && (
                    <p className="py-10 text-center text-sm text-content-muted">
                        Nenhum jogo nos campeonatos selecionados.
                    </p>
                )}

                {!loading && visible.length > 0 && (
                    <ul className="flex flex-col gap-2">
                        {visible.map(f => {
                            const creating = creatingFixtureId === f.fixture.id;
                            const finished = isFixtureFinished(f);
                            const live = isFixtureLive(f);
                            const confirmed = isFixtureStartingSoon(f, now) && lineupStatuses.get(f.fixture.id) === 'confirmed';

                            return (
                                <li
                                    key={f.fixture.id}
                                    data-fixture-id={f.fixture.id}
                                    className="rounded-control border border-line bg-surface-overlay px-3 py-3"
                                >
                                    <div className="mb-2 flex min-w-0 items-center gap-1.5 text-[11px] text-content-secondary">
                                        <LeagueFlag key={f.league?.flag} flag={f.league?.flag} country={f.league?.country} />
                                        <span className="truncate" title={f.league?.name}>{f.league?.name}</span>
                                    </div>

                                    <div className="flex items-center gap-2.5">
                                        <span className="flex w-14 shrink-0 flex-col items-center gap-1.5 text-center text-xs font-bold tabular-nums text-content-primary">
                                            <span>{finished || live
                                                ? `${f.goals?.home ?? '–'}–${f.goals?.away ?? '–'}`
                                                : fixtureTimeLabel(f)}</span>
                                            {live && (
                                                <span className="inline-flex items-center gap-1 rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-red-300">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />AGORA
                                                </span>
                                            )}
                                        </span>

                                        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                                            <span className="flex items-center gap-1.5">
                                                <TeamLogoImage logoUrl={f.teams.home.logo} teamName={f.teams.home.name} className="h-4 w-4 shrink-0" />
                                                <span className="min-w-0 flex-1 truncate text-xs text-content-primary">{f.teams.home.name}</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <TeamLogoImage logoUrl={f.teams.away.logo} teamName={f.teams.away.name} className="h-4 w-4 shrink-0" />
                                                <span className="min-w-0 flex-1 truncate text-xs text-content-primary">{f.teams.away.name}</span>
                                            </span>
                                        </span>

                                        <button
                                            onClick={() => onCreate(f)}
                                            disabled={creatingFixtureId !== null}
                                            title="Criar análise deste jogo"
                                            className="flex shrink-0 items-center gap-1 rounded-control bg-brand-primary px-2.5 py-1.5 text-xs font-bold text-nav-dark transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {creating && <Loader2 size={13} className="animate-spin" />}
                                            Analisar
                                        </button>
                                    </div>

                                    {(finished || confirmed) && (
                                        <div className="mt-2.5 flex flex-wrap gap-1.5 text-[10px] font-semibold leading-4">
                                            {finished && <span className="rounded-md bg-yellow-400/15 px-2 py-0.5 text-yellow-300">Encerrada</span>}
                                            {confirmed && <span className="rounded-md bg-emerald-400/15 px-2 py-0.5 text-emerald-300">Escalações confirmadas</span>}
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
};

export default TodayFixturesPanel;
