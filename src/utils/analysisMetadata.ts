export interface CoachNotes {
    home: string;
    away: string;
}

export function readAnalysisMetadata(events: readonly unknown[] = []): Record<string, unknown> {
    return events.reduce<Record<string, unknown>>((meta, event) => {
        if (event && typeof event === 'object' && 'type' in event && event.type === '_meta') {
            return { ...meta, ...event };
        }
        return meta;
    }, {});
}

export function readCoachNotes(metadata: Record<string, unknown>): CoachNotes {
    const value = metadata.coachNotes;
    const notes = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    return {
        home: typeof notes.home === 'string' ? notes.home : '',
        away: typeof notes.away === 'string' ? notes.away : '',
    };
}

/** Preserva video e metadados antigos sem criar um evento visivel na linha do tempo. */
export function eventsWithMetadata<T extends { type?: string }>(events: readonly T[], metadata: Record<string, unknown>) {
    const merged = { ...readAnalysisMetadata(events), ...metadata, type: '_meta' };
    const visible = events.filter(event => event.type !== '_meta');
    return Object.keys(merged).length > 1 ? [...visible, merged] : visible;
}
