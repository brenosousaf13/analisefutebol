import { useEffect, useState, type RefObject } from 'react';
import { apiFootballService } from '../services/apiFootballService';
import type { ApiFixture } from '../types/api-football';
import type { LineupConfirmation } from '../utils/fixtureStatus';

/** Atualiza cada card separadamente; sair da área visível cancela consultas ainda na fila. */
export function useFixtureLineups(fixtures: ApiFixture[], rootRef: RefObject<HTMLDivElement | null>) {
    const [statuses, setStatuses] = useState<Map<number, LineupConfirmation>>(new Map());

    useEffect(() => {
        const root = rootRef.current;
        if (!root || fixtures.length === 0) return;
        const byId = new Map(fixtures.map(f => [f.fixture.id, f]));
        const visible = new Map<number, { controller: AbortController; fetching: boolean; confirmed: boolean }>();
        const query = async (id: number) => {
            const row = visible.get(id);
            const fixture = byId.get(id);
            if (!row || !fixture || row.fetching || row.confirmed || document.hidden) return;
            row.fetching = true;
            try {
                const next = await apiFootballService.getLineupConfirmations([fixture], row.controller.signal);
                const status = next.get(id);
                if (status && !row.controller.signal.aborted) {
                    row.confirmed = status === 'confirmed';
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
                    if (!visible.has(id)) visible.set(id, { controller: new AbortController(), fetching: false, confirmed: false });
                    void query(id);
                } else {
                    visible.get(id)?.controller.abort();
                    visible.delete(id);
                }
            }
        }, { root });
        const refresh = () => { for (const id of visible.keys()) void query(id); };
        const timer = window.setInterval(refresh, 15000);
        document.addEventListener('visibilitychange', refresh);
        root.querySelectorAll('[data-fixture-id]').forEach(card => observer.observe(card));
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', refresh);
            observer.disconnect();
            for (const row of visible.values()) row.controller.abort();
            visible.clear();
        };
    }, [fixtures, rootRef]);

    return statuses;
}
