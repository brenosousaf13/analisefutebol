import type { ApiSquadPlayer } from '../types/api-football';
import type { Player } from '../types/Player';

const POSITION_ORDER: Record<string, number> = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Attacker: 3 };

/**
 * Elenco completo da API como lista de reservas: nenhum jogador em campo, e o usuário
 * escolhe os titulares. Ordem de goleiros → defensores → meias → atacantes, depois pelo número.
 * Sem id na API, o jogador recebe um id provisório que não colide com o do outro time.
 */
export function squadToBench(squad: ApiSquadPlayer[], isHome: boolean): Player[] {
    const fallbackBase = (isHome ? 1000 : 2000) + 100;
    return [...squad]
        .sort((a, b) =>
            (POSITION_ORDER[a.position] ?? 4) - (POSITION_ORDER[b.position] ?? 4)
            || (a.number ?? 999) - (b.number ?? 999)
            || a.name.localeCompare(b.name, 'pt-BR'))
        .map((item, index) => ({
            id: item.id || fallbackBase + index,
            name: item.name,
            number: item.number ?? 0,
            position: { x: 50, y: 50 },
            isStarter: false,
        }));
}
