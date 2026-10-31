import { useEffect, useState, type RefObject } from 'react';
import { apiFootballService } from '../services/apiFootballService';
import type { ApiFixture } from '../types/api-football';
import type { LineupConfirmation } from '../utils/fixtureStatus';

/** Consulta as escalações somente quando o card entra na área visível. */
export function useFixtureLineups(fixtures: ApiFixture[], rootRef: RefObject<HTMLDivElement | null>) {
    const [statuses, setStatuses] = useState<Map<number, LineupConfirmation>>(new Map());

    useEffect(() => {
        const root = rootRef.current;
        if (!root || fixtures.length === 0) return;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;
        const queued = new Set<number>();
        const flush = async () => {
            const batch = fixtures.filter(f => queued.has(f.fixture.id));
            queued.clear();
            const next = await apiFootballService.getLineupConfirmations(batch);
            if (!cancelled) setStatuses(previous => new Map([...previous, ...next]));
        };
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                if (entry.isIntersecting) queued.add(Number((entry.target as HTMLElement).dataset.fixtureId));
            }
            if (queued.size > 0) {
                clearTimeout(timer);
                timer = setTimeout(() => { void flush(); }, 100);
            }
        }, { root });
        root.querySelectorAll('[data-fixture-id]').forEach(card => observer.observe(card));
        return () => {
            cancelled = true;
            clearTimeout(timer);
            observer.disconnect();
        };
    }, [fixtures, rootRef]);

    return statuses;
}
