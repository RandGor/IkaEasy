// Run with Node 20+: node --experimental-default-type=module scripts/test-academy-payback.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import City from '../js/data/city.js';
import { Research } from '../js/const.js';
import { calculateAcademyPayback, getAcademyComparisonLevels, getExperimentRate } from '../js/helper/academyPayback.js';

globalThis._ = { each: (object, callback) => Object.entries(object).forEach(([key, value]) => callback(value, key)) };
// Use the game's actual identifiers; these are the five resources affected by the method.
const reducerTypes = ['carpentering', 'architect', 'vineyard', 'optician', 'fireworker'];
let cityId = 910000;
function makeCity(level, researchIds = []) {
    const city = new City(++cityId, { research: { has: id => researchIds.includes(id) } });
    city._data.buildings = Object.fromEntries(reducerTypes.map(type => [type, [{ level }]]));
    return city;
}
const allResearch = [Research.Economy.PULLEY, Research.Economy.GEOMETRY, Research.Economy.SPIRIT_LEVEL];

test('all five reducer buildings retain their normal discounts below level 50', () => {
    for (const level of [0, 20, 49, 50]) {
        const values = Object.values(makeCity(level, allResearch).getBuildingsCostDiscount());
        assert.equal(values.length, 5);
        values.forEach(value => assert.ok(Math.abs(value - (0.86 - level / 100)) < 1e-12));
    }
});

test('levels above 50 cannot increase the building discount, with or without research', () => {
    for (const level of [50, 51, 75, 100]) {
        Object.values(makeCity(level).getBuildingsCostDiscount()).forEach(value => assert.equal(value, 0.5));
        Object.values(makeCity(level, allResearch).getBuildingsCostDiscount()).forEach(value => assert.equal(value, 0.36));
    }
});

test('missing reducers and partial research preserve their separate discounts', () => {
    const city = makeCity(50, [Research.Economy.GEOMETRY]);
    delete city._data.buildings.optician;
    const discount = city.getBuildingsCostDiscount();
    assert.equal(discount.glass, 0.96);
    assert.ok(Math.abs(discount.wood - 0.46) < 1e-12);
});

const example = { level: 27, crystalFactor: 0.36, rate: 1, exchangeRate: 1 };
test('26 to 27 compares only 15 additional scientists against discounted crystal', () => {
    const result = calculateAcademyPayback(example);
    assert.equal(result.crystal, 286607);
    assert.equal(result.extraScientists, 15);
    assert.equal(result.daily, 360);
    assert.equal(result.days, 286607 / 360);
    assert.equal(result.experimentDays, 300000 / 360);
});

test('higher research output and lower exchange value shorten payback independently', () => {
    const baseline = calculateAcademyPayback(example);
    assert.equal(calculateAcademyPayback({ ...example, rate: 2 }).days, baseline.days / 2);
    assert.equal(calculateAcademyPayback({ ...example, exchangeRate: 0.5 }).days, baseline.days / 2);
});

test('a live price already includes discounts and must not be discounted a second time', () => {
    const result = calculateAcademyPayback({ ...example, actualCrystal: 300000 });
    assert.equal(result.crystal, 300000);
    assert.equal(result.days, 300000 / 360);
    assert.equal(result.livePrice, true);
});

test('zero crystal is supported; zero output never repays a nonzero cost', () => {
    assert.equal(calculateAcademyPayback({ ...example, actualCrystal: 0 }).days, 0);
    assert.equal(calculateAcademyPayback({ ...example, level: 4 }).crystal, 0);
    assert.equal(calculateAcademyPayback({ ...example, rate: 0 }).days, Infinity);
    assert.equal(calculateAcademyPayback({ ...example, rate: 0 }).experimentDays, Infinity);
});

test('high levels need both verified capacity and an actual price; no extrapolation', () => {
    assert.equal(calculateAcademyPayback({ ...example, level: 51 }).error, 'price');
    const result = calculateAcademyPayback({ ...example, level: 51, actualCrystal: 900000000 });
    assert.equal(result.extraScientists, 21);
    assert.equal(result.crystal, 900000000);
    assert.equal(calculateAcademyPayback({ ...example, level: 72, actualCrystal: 900000000 }).error, 'capacity');
    assert.equal(getAcademyComparisonLevels(50).at(-1), 51);
});

test('invalid and overflowing inputs cannot create NaN chart coordinates', () => {
    for (const override of [{ rate: NaN }, { rate: -1 }, { rate: Infinity }, { rate: 1e308 }, { exchangeRate: 0 }, { exchangeRate: NaN }, { exchangeRate: 1e308 }]) {
        assert.equal(calculateAcademyPayback({ ...example, ...override }).error, 'rate');
    }
    assert.equal(calculateAcademyPayback({ ...example, crystalFactor: NaN }).error, 'price');
});

test('standard experiment rate observes the same Optician limit', () => {
    assert.equal(getExperimentRate(0), 0.5);
    assert.ok(Math.abs(getExperimentRate(32) - 1 / 1.36) < 1e-12);
    assert.equal(getExperimentRate(50), 1);
    assert.equal(getExperimentRate(75), 1);
});
