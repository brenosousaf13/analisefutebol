import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFootballRequestQueue, FootballApiError } from '../src/services/footballRequestQueue.ts';

function harness(storage) {
    let time = Date.parse('2026-10-31T15:00:00Z');
    const waits = [];
    return {
        queue: createFootballRequestQueue({ now: () => time, sleep: async ms => { waits.push(ms); time += ms; }, storage }),
        waits,
        now: () => time,
    };
}
const reply = (remaining = 9, errors = []) => ({ status: 200, data: { errors, response: [] }, headers: {
    'x-ratelimit-limit': '10', 'x-ratelimit-remaining': String(remaining),
} });

test('serializes requests and pauses before exceeding the minute budget', async () => {
    const h = harness();
    let calls = 0, active = 0, maxActive = 0;
    await Promise.all(Array.from({ length: 12 }, () => h.queue.run(async () => {
        active++; maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        const response = reply(9 - calls++ % 10);
        active--;
        return response;
    })));
    assert.equal(calls, 12);
    assert.equal(maxActive, 1);
    assert.deepEqual(h.waits, [61000]);
});

test('respects a smaller remaining budget consumed outside the queue', async () => {
    const h = harness();
    await h.queue.run(async () => reply(0));
    await h.queue.run(async () => reply(9));
    assert.deepEqual(h.waits, [61000]);
});

test('retries HTTP 429 and API rateLimit errors instead of treating them as absent lineups', async () => {
    for (const bodyError of [false, true]) {
        const h = harness();
        let calls = 0;
        const result = await h.queue.run(async () => {
            if (++calls === 1) {
                if (bodyError) return reply(0, { rateLimit: 'Too many requests' });
                throw { response: { status: 429, headers: { 'retry-after': '2' } } };
            }
            return reply(8);
        });
        assert.equal(result.status, 200);
        assert.equal(calls, 2);
        assert.deepEqual(h.waits, [bodyError ? 61000 : 2000]);
    }
});

test('cancels obsolete queued work without spending another request', async () => {
    const h = harness();
    let cancelled = false, calls = 0;
    const first = h.queue.run(async () => { cancelled = true; return reply(); });
    const second = h.queue.run(async () => { calls++; return reply(); }, () => cancelled);
    await first;
    await assert.rejects(second, error => error.name === 'AbortError');
    assert.equal(calls, 0);
});

test('does not keep retrying after the daily quota is exhausted', async () => {
    const h = harness();
    await h.queue.run(async () => ({ ...reply(), headers: { 'x-ratelimit-requests-remaining': '0' } }));
    let calls = 0;
    await assert.rejects(h.queue.run(async () => { calls++; return reply(); }), error => error instanceof FootballApiError && error.retryAt > h.now());
    assert.equal(calls, 0);
    assert.equal(h.waits.length, 0);
});

test('a new tab reuses the known provider budget', async () => {
    const data = new Map();
    const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const first = harness(storage);
    await first.queue.run(async () => reply(0));
    const second = harness(storage);
    await second.queue.run(async () => reply(9));
    assert.deepEqual(second.waits, [61000]);
});

test('persistent throttling exits with a retry time and does not loop without a bound', async () => {
    const h = harness();
    let calls = 0;
    await assert.rejects(h.queue.run(async () => {
        calls++;
        throw { response: { status: 429, headers: { 'retry-after': '1' } } };
    }), error => error instanceof FootballApiError && error.retryAt > h.now());
    assert.ok(calls >= 2 && calls <= 3);
    assert.equal(h.waits.length, calls - 1);
});
