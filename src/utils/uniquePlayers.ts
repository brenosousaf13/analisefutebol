import type { AnalysisBoard } from '../services/analysisService';

/** Keep the first record for each player ID, never deduplicate by name or shirt. */
export function uniquePlayersById<T extends { id: number; note?: string }>(players: readonly T[]): T[] {
    const result: T[] = [];
    const indices = new Map<number, number>();

    for (const player of players) {
        // Legacy records without a usable ID cannot safely be matched.
        if (!Number.isSafeInteger(player.id) || player.id <= 0) {
            result.push(player);
            continue;
        }
        const index = indices.get(player.id);
        if (index === undefined) {
            indices.set(player.id, result.length);
            result.push(player);
        } else if (!result[index].note?.trim() && player.note?.trim()) {
            // A later duplicate may contain the player's saved note.
            result[index] = { ...result[index], note: player.note };
        }
    }
    return result;
}

type PlayerGroups = Pick<AnalysisBoard,
    'homePlayersDef' | 'homePlayersOff' | 'awayPlayersDef' | 'awayPlayersOff' |
    'homeSubstitutes' | 'awaySubstitutes'>;

/** Each team, phase and scene keeps its own positions and roster. */
export function normalizePlayerGroups<T extends PlayerGroups>(data: T): T {
    return {
        ...data,
        homePlayersDef: uniquePlayersById(data.homePlayersDef ?? []),
        homePlayersOff: uniquePlayersById(data.homePlayersOff ?? []),
        awayPlayersDef: uniquePlayersById(data.awayPlayersDef ?? []),
        awayPlayersOff: uniquePlayersById(data.awayPlayersOff ?? []),
        homeSubstitutes: uniquePlayersById(data.homeSubstitutes ?? []),
        awaySubstitutes: uniquePlayersById(data.awaySubstitutes ?? []),
    };
}

export function normalizeAnalysisPlayers<T extends PlayerGroups & { boards?: AnalysisBoard[] }>(data: T): T {
    return {
        ...normalizePlayerGroups(data),
        boards: data.boards?.map(board => normalizePlayerGroups(board)),
    };
}
