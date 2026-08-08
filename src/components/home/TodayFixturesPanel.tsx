import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ListFilter, Check, Play } from 'lucide-react';
import TeamLogoImage from '../TeamLogoImage';
import type { ApiFixture } from '../../types/api-football';

interface Props {
    fixtures: ApiFixture[];
    loading: boolean;
    /** Id do jogo cuja analise esta sendo criada agora. */
    creatingFixtureId: number | null;
    onCreate: (fixture: ApiFixture) => void;
}

/** Horario do jogo no fuso de Brasilia (UTC-3), independente do fuso do usuario. */
function kickoffTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Jogo ja encerrado tem placar; o resto mostra o horario. */
function isFinished(f: ApiFixture): boolean {
    return ['FT', 'AET', 'PEN'].includes(f.fixture?.status?.short ?? '');
}

const TodayFixturesPanel: React.FC<Props> = ({ fixtures, loading, creatingFixtureId, onCreate }) => {
    const [filterOpen, setFilterOpen] = useState(false);
    // null = nenhum filtro aplicado (mostra tudo). Set vazio = nada marcado.
    const [selected, setSelected] = useState<Set<number> | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    const leagues = useMemo(() => {
        const map = new Map<number, string>();
        for (const f of fixtures) {
            if (f.league?.id && !map.has(f.league.id)) map.set(f.league.id, f.league.name);
        }
        return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'));
    }, [fixtures]);

    const visible = useMemo(
        () => (selected === null ? fixtures : fixtures.filter(f => selected.has(f.league?.id))),
        [fixtures, selected],
    );

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
        <section className="flex flex-col rounded-card border border-line bg-surface-raised shadow-card">
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
                <h2 className="text-xl font-bold tracking-tight text-content-primary">Jogos do dia</h2>

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
                            <div className="absolute right-0 top-[calc(100%+6px)] z-30 max-h-72 w-64 overflow-y-auto rounded-control border border-line bg-surface-raised p-1 shadow-pop">
                                <button
                                    onClick={() => setSelected(null)}
                                    className="w-full rounded px-2.5 py-1.5 text-left text-xs font-semibold text-content-secondary transition-colors hover:bg-surface-hover hover:text-content-primary"
                                >
                                    Mostrar todos
                                </button>
                                <div className="my-1 h-px bg-line-subtle" />
                                {leagues.map(([id, label]) => {
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
                                            <span className="min-w-0 flex-1 truncate">{label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="px-5 pb-5">
                {loading && (
                    <div className="flex items-center gap-2 py-10 text-sm text-content-muted">
                        <Loader2 size={16} className="animate-spin" />
                        Buscando jogos…
                    </div>
                )}

                {!loading && fixtures.length === 0 && (
                    <p className="py-10 text-center text-sm text-content-muted">
                        Nenhum jogo hoje nos campeonatos acompanhados.
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
                            const finished = isFinished(f);

                            return (
                                <li
                                    key={f.fixture.id}
                                    className="flex items-center gap-3 rounded-control border border-line bg-surface-overlay px-3 py-2.5"
                                >
                                    <span className="w-12 shrink-0 text-center text-xs font-bold tabular-nums text-content-primary">
                                        {finished
                                            ? `${f.goals?.home ?? 0}-${f.goals?.away ?? 0}`
                                            : kickoffTime(f.fixture.date)}
                                    </span>

                                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                                        <span className="truncate text-[11px] text-content-muted">
                                            {f.league?.name}
                                        </span>
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
                                        {creating ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} className="fill-current" />}
                                        Analisar
                                    </button>
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
