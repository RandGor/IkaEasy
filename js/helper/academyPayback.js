import { MAX_SCIENTISTS } from '../const.js';
import BUILDINGS from './db/buildings.js';

export function getAcademyComparisonLevels(currentLevel) {
    const levels = BUILDINGS.academy.map((_, index) => index + 1);
    const nextLevel = currentLevel + 1;
    if (Number.isInteger(nextLevel) && nextLevel > levels.length) {
        levels.push(nextLevel);
    }
    return levels;
}

export function getExperimentRate(opticianLevel) {
    // Standard experiment rate; world/event bonuses can be entered in the panel.
    return 1 / (2 * (1 - Math.min(Math.max(opticianLevel || 0, 0), 50) / 100));
}

export function calculateAcademyPayback({ level, crystalFactor, rate, exchangeRate, actualCrystal = null }) {
    if (!Number.isInteger(level) || level < 1 ||
        !Number.isFinite(MAX_SCIENTISTS[level]) || !Number.isFinite(MAX_SCIENTISTS[level - 1])) {
        return { error: 'capacity' };
    }
    if (!Number.isFinite(rate) || rate < 0 || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
        return { error: 'rate' };
    }
    const livePrice = Number.isSafeInteger(actualCrystal) && actualCrystal >= 0;
    const baseCrystal = BUILDINGS.academy[level - 1]?.glass;
    if (!livePrice && (!Number.isSafeInteger(baseCrystal) ||
        !Number.isFinite(crystalFactor) || crystalFactor < 0 || crystalFactor > 1)) {
        return { error: 'price' };
    }
    const crystal = livePrice ? actualCrystal : Math.floor(baseCrystal * crystalFactor);
    const extraScientists = MAX_SCIENTISTS[level] - MAX_SCIENTISTS[level - 1];
    const daily = extraScientists * rate * 24;
    const exchangePoints = crystal * exchangeRate;
    if (!Number.isFinite(daily) || !Number.isFinite(exchangePoints)) {
        return { error: 'rate' };
    }
    return {
        level,
        crystal,
        livePrice,
        extraScientists,
        daily,
        exchangePoints,
        days: exchangePoints === 0 ? 0 : daily > 0 ? exchangePoints / daily : Infinity,
        experimentDays: daily > 0 ? 300000 / daily : Infinity
    };
}
