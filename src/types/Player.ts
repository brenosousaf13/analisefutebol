export interface Player {
    id: number;
    name: string;
    number: number;
    position: {
        x: number; // 0-100%
        y: number; // 0-100%
    };
    isManual?: boolean;
    note?: string;
    color?: string;
}
