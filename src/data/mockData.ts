import type { Player } from '../types/Player';

export const homeTeamPlayers: Player[] = [
    // Goleiro
    { id: 1, name: "Ederson", number: 31, position: { x: 50, y: 90 } },
    // Defesa
    { id: 2, name: "Walker", number: 2, position: { x: 80, y: 75 } },
    { id: 3, name: "Dias", number: 3, position: { x: 60, y: 80 } },
    { id: 4, name: "Akanji", number: 25, position: { x: 40, y: 80 } },
    { id: 5, name: "Gvardiol", number: 24, position: { x: 20, y: 75 } },
    // Meio-campo
    { id: 6, name: "Rodri", number: 16, position: { x: 50, y: 60 } },
    { id: 7, name: "De Bruyne", number: 17, position: { x: 70, y: 45 } },
    { id: 8, name: "Bernardo", number: 20, position: { x: 30, y: 45 } },
    // Ataque
    { id: 9, name: "Foden", number: 47, position: { x: 80, y: 25 } },
    { id: 10, name: "Haaland", number: 9, position: { x: 50, y: 15 } },
    { id: 11, name: "Grealish", number: 10, position: { x: 20, y: 25 } },
];

export const awayTeamPlayers: Player[] = [
    // Goleiro
    { id: 12, name: "Raya", number: 22, position: { x: 50, y: 90 } },
    // Defesa
    { id: 13, name: "White", number: 4, position: { x: 85, y: 75 } },
    { id: 14, name: "Saliba", number: 2, position: { x: 60, y: 80 } },
    { id: 15, name: "Gabriel", number: 6, position: { x: 40, y: 80 } },
    { id: 16, name: "Zinchenko", number: 35, position: { x: 15, y: 75 } },
    // Meio-campo
    { id: 17, name: "Saka", number: 7, position: { x: 85, y: 45 } },
    { id: 18, name: "Odegaard", number: 8, position: { x: 60, y: 50 } },
    { id: 19, name: "Rice", number: 41, position: { x: 40, y: 50 } },
    { id: 20, name: "Martinelli", number: 11, position: { x: 15, y: 45 } },
    // Ataque
    { id: 21, name: "Jesus", number: 9, position: { x: 60, y: 20 } },
    { id: 22, name: "Havertz", number: 29, position: { x: 40, y: 20 } },
];
