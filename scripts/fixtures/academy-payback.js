import City from '../../js/data/city.js';
import { Research } from '../../js/const.js';
import ru from '../../lang/ru.js';
import en from '../../lang/en.js';

window.currentLanguage = 'ru';
window.LANGUAGE = { ...en, ...ru, getLocalizedString(key) { return this[key] || key; } };
const known = new Set([Research.Economy.PULLEY, Research.Economy.GEOMETRY, Research.Economy.SPIRIT_LEVEL,
    Research.Science.PAPER, Research.Science.INK, Research.Science.MECHANICAL_PEN]);
const research = { has: id => known.has(id), getLevel: () => 3 };
window.fixtureManager = {
    options: { hide_premium: false, academy_payback: true },
    research,
    info: { get: () => null },
    getResearch: () => research,
    getCurrentCity() { return this.current; },
    getOwnCities() { return [this.current]; },
    save() {}
};
window.makeFixtureCity = (id, level) => {
    const city = new City(id, fixtureManager);
    city._data.buildings = {
        academy: [{ level, position: 3, completed: null }],
        optician: [{ level: 51 }],
        palace: [{ level: 1 }]
    };
    return city;
};
fixtureManager.current = makeFixtureCity(1, 26);
window.Front = {
    tpl: 'academy',
    ikaeasyData: fixtureManager,
    data: { avatarId: 1, cities: { selectedCityId: 1 }, localizationStrings: { thousandSeperator: '.', decimalPoint: ',' } }
};
const { default: AcademyPage } = await import('../../js/page/tpl/academy.js');
window.AcademyPage = AcademyPage;
window.academyPage = new AcademyPage();
