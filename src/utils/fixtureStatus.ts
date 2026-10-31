import type { ApiFixture } from '../types/api-football';

export type LineupConfirmation = 'confirmed' | 'unconfirmed' | 'unavailable';

export function isFixtureFinished(fixture: ApiFixture): boolean {
    return ['FT', 'AET', 'PEN'].includes(fixture.fixture.status.short);
}

export function isFixtureLive(fixture: ApiFixture): boolean {
    return ['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT'].includes(fixture.fixture.status.short);
}

/** Só confirma quando os dois times têm os onze titulares publicados. */
export function hasConfirmedLineups(fixture: ApiFixture): boolean {
    return [fixture.teams.home.id, fixture.teams.away.id].every(teamId =>
        fixture.lineups?.some(lineup => lineup.team?.id === teamId
            && lineup.startXI?.length >= 11
            && lineup.startXI.every(({ player }) => !!player?.id)),
    );
}

export function fixtureTimeLabel(fixture: ApiFixture): string {
    const specialStatus: Record<string, string> = {
        TBD: 'A definir', PST: 'Adiada', CANC: 'Cancelada', SUSP: 'Suspensa',
        ABD: 'Abandonada', AWD: 'Decidida', WO: 'W.O.',
    };
    const status = specialStatus[fixture.fixture.status.short];
    if (status) return status;
    const date = new Date(fixture.fixture.date);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit',
    });
}
