import type { Player } from '../types/Player';

/**
 * Forma minima de escalacao aceita — declarada estruturalmente para servir tanto
 * ao `ApiLineup` de types/api-football quanto ao `Lineup` de services/apiFootball.
 */
export interface LineupLike {
    startXI: Array<{ player: { id: number; name: string; number: number; grid: string | null } }>;
    substitutes?: Array<{ player: { id: number; name: string; number: number } }>;
}

// Faixa vertical ocupada pelos titulares: 90 = proximo ao proprio gol, 20 = ataque.
const Y_DEFENSIVE = 90;
const Y_OFFENSIVE = 20;

/**
 * Converte o `grid` da API-Football ("linha:coluna") em posicoes percentuais no campo.
 *
 * A API numera as linhas a partir da defesa (1 = goleiro), entao a linha 1 fica em
 * y=90 e a ultima linha em y=20. Dentro de cada linha os jogadores sao distribuidos
 * horizontalmente em intervalos iguais.
 *
 * Jogadores sem `grid` (a API nem sempre devolve) sao ignorados aqui — cabe ao
 * chamador decidir se entram como reservas.
 */
export function lineupToPlayers(lineup: LineupLike): Player[] {
    const rows = new Map<number, LineupLike['startXI'][number]['player'][]>();

    for (const item of lineup.startXI ?? []) {
        const grid = item.player.grid;
        if (!grid) continue;

        const line = Number(grid.split(':')[0]);
        if (!Number.isFinite(line)) continue;

        const bucket = rows.get(line);
        if (bucket) bucket.push(item.player);
        else rows.set(line, [item.player]);
    }

    if (rows.size === 0) return [];

    const maxLine = Math.max(...rows.keys());
    const step = maxLine > 1 ? (Y_DEFENSIVE - Y_OFFENSIVE) / (maxLine - 1) : 0;

    const players: Player[] = [];

    for (const [line, rowPlayers] of rows) {
        rowPlayers.sort(
            (a, b) => Number(a.grid?.split(':')[1] ?? 0) - Number(b.grid?.split(':')[1] ?? 0),
        );

        const count = rowPlayers.length;
        const y = maxLine > 1 ? Y_DEFENSIVE - (line - 1) * step : Y_DEFENSIVE;

        rowPlayers.forEach((p, index) => {
            players.push({
                id: p.id,
                name: p.name,
                number: p.number,
                position: { x: (100 / (count + 1)) * (index + 1), y },
                isStarter: true,
            });
        });
    }

    return players;
}

/** Reservas nao tem posicao em campo; ficam centralizados ate serem arrastados. */
export function substitutesToPlayers(lineup: LineupLike): Player[] {
    return (lineup.substitutes ?? []).map(item => ({
        id: item.player.id,
        name: item.player.name,
        number: item.player.number,
        position: { x: 50, y: 50 },
        isStarter: false,
    }));
}
