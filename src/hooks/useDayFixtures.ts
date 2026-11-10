import { useEffect, useState } from 'react';
import { apiFootballService } from '../services/apiFootballService';
import type { ApiFixture } from '../types/api-football';

interface DayResult {
    key: string;
    fixtures: ApiFixture[];
    error: unknown;
}

export interface DayFixtures {
    fixtures: ApiFixture[];
    /** Primeira carga deste dia ainda em andamento. */
    loading: boolean;
    /** Falha na última tentativa. Se já havia lista, ela continua em `fixtures`. */
    error: unknown;
}

/** A lista só "muda" se algo visível mudou — evita re-renderizar a cada checagem sem novidade. */
function sameFixtures(a: ApiFixture[], b: ApiFixture[]): boolean {
    return a.length === b.length && a.every((f, i) => {
        const o = b[i];
        return f.fixture.id === o.fixture.id
            && f.fixture.date === o.fixture.date
            && f.fixture.status.short === o.fixture.status.short
            && f.fixture.status.elapsed === o.fixture.status.elapsed
            && f.goals?.home === o.goals?.home
            && f.goals?.away === o.goals?.away;
    });
}

/**
 * Partidas de um dia. A tela só consulta a API quando o cache do serviço venceu,
 * então reler a cada minuto (apenas para o dia de hoje) não gera consulta nova.
 *
 * @param refreshKey  muda para forçar uma nova tentativa (botão "Tentar novamente").
 */
export function useDayFixtures(
    date: string,
    scope: 'tracked' | 'all',
    { follow = false, refreshKey = 0 }: { follow?: boolean; refreshKey?: number } = {},
): DayFixtures {
    const key = `${date}|${scope}|${refreshKey}`;
    const [result, setResult] = useState<DayResult | null>(null);

    useEffect(() => {
        let cancelled = false;
        let fetching = false;

        const load = async () => {
            if (fetching) return;
            fetching = true;
            try {
                const list = await apiFootballService.getDayFixtures(date, scope);
                if (!cancelled) {
                    setResult(prev => (prev && prev.key === key && !prev.error && sameFixtures(prev.fixtures, list)
                        ? prev
                        : { key, fixtures: list, error: null }));
                }
            } catch (error) {
                if (!cancelled) {
                    setResult(prev => ({ key, fixtures: prev?.key === key ? prev.fixtures : [], error }));
                }
            } finally {
                fetching = false;
            }
        };

        void load();
        if (!follow) return () => { cancelled = true; };

        // Hoje: relê ao voltar para a aba e a cada minuto. O serviço decide se vale uma consulta.
        const refresh = () => { if (!document.hidden) void load(); };
        const interval = window.setInterval(refresh, 60000);
        document.addEventListener('visibilitychange', refresh);
        window.addEventListener('focus', refresh);
        return () => {
            cancelled = true;
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', refresh);
            window.removeEventListener('focus', refresh);
        };
    }, [date, scope, follow, key]);

    const current = result?.key === key ? result : null;
    return {
        fixtures: current?.fixtures ?? [],
        loading: current === null,
        error: current?.error ?? null,
    };
}
