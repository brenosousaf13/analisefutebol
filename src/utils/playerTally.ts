/** Gols e assistencias de um jogador, contados a partir dos eventos da partida. */
export interface PlayerTally {
    goals: number;
    assists: number;
}

/**
 * Chave de comparacao por nome.
 *
 * Os eventos da partida (`MatchEvent`) guardam `player_name` e
 * `secondary_player_name` — nomes, nao ids —, entao a associacao com o elenco
 * so pode ser feita por nome normalizado.
 */
export function nameKey(name: string): string {
    return name.trim().toLowerCase();
}
