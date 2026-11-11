import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (context.parentURL?.includes('/src/') && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return nextResolve(`${specifier}.ts`, context);
        return nextResolve(specifier, context);
    },
});
const { isTrackedFixture, isMainNationalTeam, isFriendlyNation } = await import('../src/utils/trackedFixtures.ts');
const { FRIENDLY_NATIONS } = await import('../src/data/friendlyNations.ts');

const game = (league, home, away) => ({ league: { id: league }, teams: { home: { name: home }, away: { name: away } } });

test('the friendlies list has the 70 countries of Lucas\'s file, no repeats, each with an API name', () => {
    assert.equal(FRIENDLY_NATIONS.length, 70);
    assert.equal(new Set(FRIENDLY_NATIONS.map(n => n.name)).size, 70);
    assert.equal(FRIENDLY_NATIONS[0].name, 'Espanha');
    assert.equal(FRIENDLY_NATIONS.at(-1).name, 'Gana');
    assert.ok(FRIENDLY_NATIONS.every(n => n.apiNames.length > 0));
});

test('main teams are told apart from youth, women, olympic and B sides', () => {
    for (const name of ['Brazil', 'Vietnam', 'Sint Maarten', 'USA', 'Cape Verde Islands', 'Congo DR']) assert.equal(isMainNationalTeam(name), true, name);
    for (const name of ['Brazil U23', 'England U18', 'Norway U19', 'Brazil W', 'Brazil Women', 'Spain B', 'Argentina Olympic', 'Qatar U-23']) assert.equal(isMainNationalTeam(name), false, name);
});

test('API name variants of the listed countries are recognised, and unlisted ones are not', () => {
    for (const name of ['Türkiye', 'Turkey', 'Czechia', 'Bosnia & Herzegovina', 'Rep. Of Ireland', 'Northern Ireland', 'South Korea', 'Ivory Coast', 'United Arab Emirates', 'Cape Verde Islands', 'Congo DR', 'USA', 'Brazil']) {
        assert.equal(isFriendlyNation(name), true, name);
    }
    for (const name of ['Congo', 'North Korea', 'Vietnam', 'Sint Maarten', 'Anguilla', 'Ireland Women', 'Brazil U23']) assert.equal(isFriendlyNation(name) && isMainNationalTeam(name), false, name);
});

test('international friendlies: only main teams, and at least one listed country', () => {
    assert.equal(isTrackedFixture(game(10, 'Brazil', 'Senegal')), true);
    assert.equal(isTrackedFixture(game(10, 'Brazil', 'Anguilla')), true);   // uma das duas basta
    assert.equal(isTrackedFixture(game(10, 'Sint Maarten', 'Argentina')), true);
    assert.equal(isTrackedFixture(game(10, 'Vietnam', 'Chinese Taipei')), false); // nenhuma na lista
    assert.equal(isTrackedFixture(game(10, 'Sint Maarten', 'Anguilla')), false);
    assert.equal(isTrackedFixture(game(10, 'Brazil U23', 'Argentina')), false);   // base nunca entra
    assert.equal(isTrackedFixture(game(10, 'Brazil', 'Argentina U20')), false);
    assert.equal(isTrackedFixture(game(10, 'England U18', 'Netherlands U18')), false);
    assert.equal(isTrackedFixture(game(666, 'Brazil W', 'Argentina W')), false);  // amistosos femininos: fora da lista
});

test('other tracked competitions are not affected by the friendlies rule', () => {
    assert.equal(isTrackedFixture(game(71, 'Vasco', 'Santos')), true);
    assert.equal(isTrackedFixture(game(2, 'Aston Villa', 'PSG')), true);
    assert.equal(isTrackedFixture(game(1, 'Qatar', 'Ecuador')), true);
    assert.equal(isTrackedFixture(game(999, 'Brazil', 'Argentina')), false);
});
