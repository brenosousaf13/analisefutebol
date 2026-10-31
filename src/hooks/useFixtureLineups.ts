import { useEffect, useState, type RefObject } from 'react';
import { apiFootballService } from '../services/apiFootballService';
import type { ApiFixture } from '../types/api-football';
import { isFixtureStartingSoon, type LineupConfirmation } from '../utils/fixtureStatus';

/** Atualiza cada card separadamente; sair da área visível cancela consultas ainda na fila. */
export function useFixtureLineups(fixtures: ApiFixture[], rootRef: RefObject<HTMLDivElement | null>) {
    const [statuses, setStatuses] = useState<Map<number, LineupConfirmation>>(new Map());
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const root = rootRef.current;
        if (!root || fixtures.length === 0) return;
        const byId = new Map(fixtures.map(f => [f.fixture.id, f]));
        const visible = new Set<number>();
        const queries = new Map<number, { controller: AbortController; fetching: boolean; confirmed: boolean; retryAt: number }>();
        const query = async (id: number) => {
            const fixture = byId.get(id);
            if (!fixture || !isFixtureStartingSoon(fixture) || document.hidden) return;
            let row = queries.get(id);
            if (!row) {
                row = { controller: new AbortController(), fetching: false, confirmed: false, retryAt: 0 };
                queries.set(id, row);
            }
            if (row.fetching || row.confirmed || Date.now() < row.retryAt) return;
            row.fetching = true;
            try {
                const next = await apiFootballService.getLineupConfirmations([fixture], row.controller.signal);
                const status = next.get(id);
                if (status && !row.controller.signal.aborted && isFixtureStartingSoon(fixture)) {
                    setNow(Date.now());
                    row.confirmed = status === 'confirmed';
                    // Falhas e negativos esperam antes de gastar outra consulta da cota diária.
                    if (status !== 'confirmed') row.retryAt = Date.now() + (status === 'pending' ? 60000 : 5 * 60000);
                    setStatuses(previous => {
                        if (previous.get(id) === status || (status === 'pending' && previous.get(id) === 'confirmed')) return previous;
                        return new Map(previous).set(id, status);
                    });
                }
            } finally { row.fetching = false; }
        };
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                const id = Number((entry.target as HTMLElement).dataset.fixtureId);
                if (entry.isIntersecting) {
                    visible.add(id);
                    void query(id);
                } else {
                    queries.get(id)?.controller.abort();
                    queries.delete(id);
                    visible.delete(id);
                }
            }
        }, { root });
        const refresh = () => {
            const current = Date.now();
            setNow(current);
            for (const [id, row] of queries) {
                if (!isFixtureStartingSoon(byId.get(id)!, current)) {
                    row.controller.abort();
                    queries.delete(id);
                }
            }
            for (const id of visible) void query(id);
        };
        let timer: ReturnType<typeof setTimeout>;
        // Atualiza também no instante de entrada na janela de 1h e no início do jogo.
        const schedule = () => {
            const current = Date.now();
            const boundaries = fixtures.flatMap(f => {
                const kickoff = Date.parse(f.fixture.date);
                return [kickoff - 3600000, kickoff];
            }).filter(time => time > current);
            const delay = Math.min(15000, ...boundaries.map(time => time - current));
            timer = window.setTimeout(() => { refresh(); schedule(); }, delay);
        };
        const onVisibility = () => { refresh(); window.clearTimeout(timer); schedule(); };
        schedule();
        document.addEventListener('visibilitychange', onVisibility);
        root.querySelectorAll('[data-fixture-id]').forEach(card => observer.observe(card));
        return () => {
            window.clearTimeout(timer);
            document.removeEventListener('visibilitychange', onVisibility);
            observer.disconnect();
            for (const row of queries.values()) row.controller.abort();
            queries.clear();
            visible.clear();
        };
    }, [fixtures, rootRef]);

    return { statuses, now };
}
