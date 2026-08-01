import type { Player } from '../types/Player';

const GK_NAME = /goleiro|goalkeeper|\bgk\b|\bgol\b/i;

/**
 * Identifica o goleiro.
 *
 * O tipo `Player` nao guarda a posicao em campo — so as coordenadas —, entao a
 * deteccao usa os dois sinais disponiveis: o nome e a camisa 1. Geometria nao
 * serve porque o goleiro fica no eixo Y no modo vertical e no X no horizontal.
 *
 * Para ficar exato seria preciso persistir o `pos` que a API-Football devolve
 * na escalacao ("G"/"D"/"M"/"F") numa coluna nova de analysis_players.
 */
function isGoalkeeper(player: Player): boolean {
    return GK_NAME.test(player.name) || player.number === 1;
}

/**
 * Ordena o elenco para as listas laterais: goleiro primeiro, independente do
 * numero; o restante em ordem numerica crescente.
 */
export function sortRoster(players: Player[]): Player[] {
    const keepers: Player[] = [];
    const rest: Player[] = [];

    for (const p of players) (isGoalkeeper(p) ? keepers : rest).push(p);

    const byNumber = (a: Player, b: Player) => (a.number ?? 999) - (b.number ?? 999);
    keepers.sort(byNumber);
    rest.sort(byNumber);

    return [...keepers, ...rest];
}
