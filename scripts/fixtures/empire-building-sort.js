// Open through: node scripts/serve-empire-scroll.cjs
// Uses production templates, building data preparation, sorting and DOM patching.
window.chrome = { runtime: { getURL: path => '/' + path.replace(/^\//, '') } };
const { default: BuildingsTab } = await import('../../js/page/modules/empire/buildings.js');
const { CityType, Resources } = await import('../../js/const.js');
const { default: ru } = await import('../../lang/ru.js');
window.LANGUAGE = { ...ru, getLocalizedString(key) { return this[key] || key; } };

const results = document.querySelector('#results');
const checks = [];
function check(condition, message) {
    checks.push(`${condition ? 'PASS' : 'FAIL'} ${message}`);
    results.textContent = checks.join('\n');
    if (!condition) throw new Error(message);
}

const cities = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1, name: `City ${index + 1}`, coords: '[50:50]', tradegood: 1, relationship: CityType.OWN
}));
const models = new Map(cities.map(city => [city.id, {
    cityId: city.id, buildings: {}, resources: Object.fromEntries(Object.values(Resources).map(key => [key, 999999])),
    getBuildingsCostDiscount: () => Object.fromEntries(Object.values(Resources).map(key => [key, 1])),
    getBuildingByType(type) { return this.buildings?.[type]?.[0]; },
    hasConstructingBuilding() { return false; },
    toObject() { return { id: this.cityId }; }
}]));
function building(type, level, position, completed = null) {
    return { name: type, building: type, level, position, completed };
}
for (const [id, academy, ports] of [[1, 10, [1, 40]], [2, 2, [50, 3]], [3, null, [10]], [4, 9, [20, 15]], [5, 8, [30, 4]]]) {
    const model = models.get(id);
    if (academy !== null) model.buildings.academy = [building('academy', academy, 3,
        id === 4 ? Date.now() / 1000 - 60 : id === 5 ? Date.now() / 1000 + 600 : null)];
    model.buildings.port = ports.map((level, index) => building('port', level, index + 1));
}
models.get(6).buildings = null;
window.Front = {
    data: { cities: { selectedCityId: 2, ...Object.fromEntries(cities.map(city => [`city_${city.id}`, city])) } },
    ikaeasyData: {
        options: {}, off() {}, getCity: id => models.get(Number(id)),
        getBuildingInfo: type => ({ cnt: type === 'port' ? 2 : 1, name: type })
    }
};
const tab = Object.create(BuildingsTab.prototype);
tab.tpl = 'dummy/empire/tabs/buildings.ejs';
tab._cities = cities;
tab._data = Front.data;
tab.$parent = $('#tabReport');
let opened;
let closed = false;
tab.openBuilding = value => { opened = value; };
tab.parent = {
    $content: tab.$parent,
    updateContent() { tab.$parent.empty().append(tab.$el); },
    close() { closed = true; }
};
const ids = () => [...tab.$el[0].querySelectorAll('tbody tr')].map(row => Number(row.dataset.id)).join(',');
const header = (type, index = 0) => tab.$el.find(`th[data-building="${type}"][data-building-index="${index}"]`);
const click = (type, index = 0) => header(type, index).find('button')[0].click();

try {
    await tab.draw();
    tab.onRegisterClickHandlers(tab.$parent);
    check(ids() === '1,2,3,4,5,6', 'Initial city order is unchanged');
    tab.$el[0].scrollLeft = tab.$el[0].scrollWidth;
    const scrollLeft = tab.$el[0].scrollLeft;
    check(scrollLeft > 0, 'Fixture has horizontal overflow');
    click('academy');
    check(ids() === '3,2,5,1,4,6', 'Ascending uses numeric levels, missing buildings, completed upgrades and stable ties');
    check(header('academy').attr('aria-sort') === 'ascending', 'Header exposes the active sort direction');
    check(tab.$el[0].scrollLeft === scrollLeft, 'Sorting preserves horizontal scroll');
    click('academy');
    check(ids() === '1,4,5,2,3,6', 'Descending keeps unknown city data last');
    click('academy');
    check(ids() === '1,2,3,4,5,6', 'Third click restores the original order');
    click('port');
    check(ids() === '1,3,4,5,2,6', 'First port column sorts independently');
    click('port', 1);
    check(ids() === '3,2,5,4,1,6', 'Second port column uses its own levels');
    check(header('port').attr('aria-sort') === 'none', 'Previous column indicator clears');
    check(header('port', 1).find('button').attr('aria-label').includes('(2)'), 'Duplicate column has a distinct accessible name');
    models.get(2).buildings.port[1].level = 45;
    await tab.draw();
    check(ids() === '3,5,4,1,2,6', 'Background refresh reapplies sorting using updated levels');
    check(tab.$el[0].scrollLeft === scrollLeft, 'Background refresh preserves horizontal scroll');
    check(tab.$el.find('tr.current_city').attr('data-id') === '2', 'Current-city highlight follows its city');
    const portCell = tab.$el.find('tr[data-id="2"] td[data-building="port"][data-position="2"]');
    portCell[0].click();
    check(closed && opened.cityId === 2 && opened.position === 2 && opened.building === 'port', 'Building click opens the correct city and position after sorting and refresh');
    check(cities.map(city => city.id).join(',') === '1,2,3,4,5,6', 'Shared city order is not mutated');
    tab.destroy();
    const reopened = Object.create(BuildingsTab.prototype);
    Object.assign(reopened, { tpl: tab.tpl, _cities: cities, _data: Front.data, $parent: tab.$parent, parent: tab.parent });
    reopened.parent.updateContent = () => reopened.$parent.empty().append(reopened.$el);
    await reopened.draw();
    reopened.onRegisterClickHandlers(reopened.$parent);
    check(reopened.$el.find('th[data-building="port"][data-building-index="1"]').attr('aria-sort') === 'ascending', 'Reopening the tab retains the selected column and direction');
    check(reopened.$el.find('tbody tr').toArray().map(row => row.dataset.id).join(',') === '3,5,4,1,2,6', 'Reopened tab retains sorted row order');
    document.title = 'PASS — Building sort regression';
} catch (error) {
    document.title = 'FAIL — Building sort regression';
    results.textContent += `\n${error.stack}`;
}
