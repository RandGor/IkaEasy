// Serve with scripts/serve-empire-scroll.cjs. Uses real storage-to-row mapping,
// templates, sorting, incremental rendering and mission-link event handlers.
window.chrome = { runtime: { getURL: path => '/' + path.replace(/^\//, '') }, storage: { onChanged: { addListener() {} } } };
const { default: Espionage } = await import('../../js/page/modules/empire/espionage.js');
const { default: Storage } = await import('../../js/helper/storage.js');
const { default: ru } = await import('../../lang/ru.js');
window.LANGUAGE = { ...ru, getLocalizedString: key => ru[key] || key };
const messages = [];
const results = document.querySelector('#results');
function check(condition, message) {
    messages.push(`${condition ? 'PASS' : 'FAIL'} ${message}`);
    results.textContent = messages.join('\n');
    if (!condition) throw new Error(message);
}
const cities = Array.from({ length: 6 }, (_, index) => ({ id: index + 1, name: `City ${index + 1}`, coords: '[50:50]', tradegood: 1 }));
const models = new Map(cities.map((city, index) => [city.id, {
    buildings: index === 5 ? null : {},
    getBuildingByType() { return index === 2 || index === 5 ? null : { level: [20, 3, 0, 10, 5][index] }; }
}]));
const mission = targetCityId => ({ targetCityId, targetCity: `Target ${targetCityId}`, targetPlayer: 'Player', status: 'Waiting', spies: 1 });
const state = { cities: {
    1: { hasSafehouse: true, defending: 10, capacity: 1000, assigned: 0, position: 3, missions: [] },
    2: { hasSafehouse: true, defending: 2, capacity: 3, assigned: 10, position: 7, missions: [mission(901), mission(902)] },
    3: { hasSafehouse: false },
    4: { hasSafehouse: true, defending: 0, capacity: 10, assigned: 2, position: 5, missions: [mission(903)] }
} };
Storage.get = async () => structuredClone(state);
window.Front = { data: { cities: { selectedCityId: 2 } }, ikaeasyData: { options: {}, getCity: id => models.get(Number(id)) } };
const parent = { $content: $('#tabReport'), updateContent() { this.$content.empty().append(this.activeModule.$el); } };
function createTab() {
    const tab = Object.create(Espionage.prototype);
    Object.assign(tab, { parent, $parent: parent.$content, _cities: cities, _data: Front.data, tpl: 'dummy/empire/tabs/espionage.ejs' });
    tab.autoSync = async () => {};
    return tab;
}
const tab = createTab();
const ids = current => current.$el.find('tbody tr').toArray().map(row => row.dataset.id).join(',');
const click = key => tab.$el.find(`th[data-sort-key="${key}"] button`)[0].click();
try {
    parent.activeModule = tab;
    await tab.draw();
    tab.registerClickHandlers();
    check(ids(tab) === '1,2,3,4,5,6', 'Initial order is unchanged');
    for (const [key, ascending, descending] of [
        ['level', '3,2,5,4,1,6', '1,4,5,2,3,6'],
        ['defending', '3,4,2,1,5,6', '1,2,3,4,5,6'],
        ['assigned', '1,3,4,2,5,6', '2,4,1,3,5,6'],
        ['targets', '1,3,4,2,5,6', '2,4,1,3,5,6']
    ]) {
        click(key);
        check(ids(tab) === ascending, `${key}: ascending sorts numbers, zeros and stable ties; unknowns last`);
        check(tab.$el.find(`th[data-sort-key="${key}"]`).attr('aria-sort') === 'ascending', `${key}: header reports ascending direction`);
        click(key);
        check(ids(tab) === descending, `${key}: descending keeps unknowns last`);
        click(key);
        check(ids(tab) === '1,2,3,4,5,6', `${key}: third click restores original order`);
    }
    check(tab.$el.find('tr[data-id="3"] [data-sort-key="defending"]').text() === '0', 'Known absence of a safehouse shows zero spies');
    check(!tab.$el.find('tr[data-id="5"] [data-sort-key="defending"]').length, 'Uncollected spy data is not reported as zero');
    click('defending');
    state.cities[4].defending = 20;
    await tab.draw();
    check(ids(tab) === '3,2,1,4,5,6', 'Background refresh re-sorts updated spy counts');
    check(tab.$el.find('tr.current_city').attr('data-id') === '2', 'Current city stays correctly highlighted after refresh');
    let opened;
    tab.openSpyMissions = (...args) => { opened = args; };
    tab.$el.find('tr[data-id="2"] [data-target-city-id="902"]')[0].click();
    check(opened.join(',') === '2,902,7', 'Mission link retains the correct source, target and safehouse position');
    check(cities.map(city => city.id).join(',') === '1,2,3,4,5,6', 'Shared city order is untouched');
    tab.destroy();
    const reopened = createTab();
    parent.activeModule = reopened;
    await reopened.draw();
    reopened.registerClickHandlers();
    check(ids(reopened) === '3,2,1,4,5,6', 'Reopening keeps the espionage sort');
    check(reopened.$el.find('th[data-sort-key="defending"]').attr('aria-sort') === 'ascending', 'Reopening restores the header indicator');
    document.title = 'PASS — Espionage sorting';
} catch (error) {
    document.title = 'FAIL — Espionage sorting';
    results.textContent += `\n${error.stack}`;
}
