import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readAnalysisMetadata, readCoachNotes, eventsWithMetadata } from '../src/utils/analysisMetadata.ts';
import { buildAnalysisSavePayload } from '../src/services/analysisSavePayload.ts';
import { sharedAnalysisFromPayload } from '../src/services/sharedAnalysisData.ts';

test('old analyses without coach notes remain readable; invalid notes are ignored', () => {
    assert.deepEqual(readCoachNotes(readAnalysisMetadata()), { home: '', away: '' });
    assert.deepEqual(readCoachNotes({ coachNotes: { home: 123, away: 'Nota visitante' } }), { home: '', away: 'Nota visitante' });
    assert.deepEqual(readCoachNotes(readAnalysisMetadata([null, {}, 'text'])), { home: '', away: '' });
});

test('coach notes preserve video, unknown metadata and visible match events without mutating input', () => {
    const goal = { type: 'goal', player_name: 'Jogador' };
    const original = [goal, { type: '_meta', videoUrl: 'video-legado' }, { type: '_meta', futureField: 'preservar' }];
    const notes = { home: 'Pressiona alto\nAjusta a defesa', away: 'Troca de formação' };
    const result = eventsWithMetadata(original, { coachNotes: notes });
    assert.equal(result[0], goal);
    assert.equal(result.filter(e => e.type === '_meta').length, 1);
    assert.deepEqual(readAnalysisMetadata(result), { type: '_meta', videoUrl: 'video-legado', futureField: 'preservar', coachNotes: notes });
    assert.equal(original.length, 3);
    assert.equal(original[1].coachNotes, undefined);
    assert.deepEqual(readCoachNotes(readAnalysisMetadata(JSON.parse(JSON.stringify(result)))), notes);
});

test('updating or clearing either coach note never changes the other coach or adds timeline events', () => {
    const initial = eventsWithMetadata([], { coachNotes: { home: 'Nota mandante', away: 'Nota visitante' } });
    const cleared = eventsWithMetadata(initial, { coachNotes: { ...readCoachNotes(readAnalysisMetadata(initial)), home: '' } });
    assert.deepEqual(readCoachNotes(readAnalysisMetadata(cleared)), { home: '', away: 'Nota visitante' });
    assert.equal(cleared.length, 1);
    assert.deepEqual(eventsWithMetadata([], {}), []);
});

test('atomic save payload and shared analysis keep coach notes, legacy video and percent coordinates', () => {
    const notes = { home: 'Observação mandante', away: 'Observação visitante' };
    const events = eventsWithMetadata([{ type: '_meta', videoUrl: 'video-legado' }], { coachNotes: notes });
    const payload = buildAnalysisSavePayload({ homeTeam: 'Casa', awayTeam: 'Fora', events,
        homePlayersDef: [{ id: 10, name: 'Jogador', number: 9, position: { x: 18.5, y: 73.25 } }],
        homePlayersOff: [], awayPlayersDef: [], awayPlayersOff: [], homeSubstitutes: [], awaySubstitutes: [],
        boards: [], tags: [] });
    const loaded = sharedAnalysisFromPayload({ ...payload, analysis: { ...payload.analysis, id: payload.analysis_id } });
    assert.deepEqual(readCoachNotes(readAnalysisMetadata(loaded.events)), notes);
    assert.equal(readAnalysisMetadata(loaded.events).videoUrl, 'video-legado');
    assert.deepEqual(loaded.homePlayersDef[0].position, { x: 18.5, y: 73.25 });
});
