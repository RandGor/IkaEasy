// Run via scripts/serve-empire-scroll.cjs. Network sync is stubbed; production
// templates, numeric sort metadata, UI handlers and DOM patching run unchanged.
window.chrome = { runtime: { getURL: path => '/' + path.replace(/^\//, '') }, storage: { onChanged: { addListener() {} } } };
const { default: ResourcesTab } = await import('../../js/page/modules/empire/resources.js');
const { default: MilitaryTab } = await import('../../js/page/modules/empire/military.js');
const { default: renderLocal } = await import('../../js/helper/local-templater.js');
const { default: ru } = await import('../../lang/ru.js');
const { UnitIds } = await import('../../js/const.js');
window.LANGUAGE = { ...ru, getLocalizedString: key => ru[key] || key };
const results = document.querySelector('#results');
const messages = [];
function check(condition, message) {
    messages.push(`${condition ? 'PASS' : 'FAIL'} ${message}`);
    results.textContent = messages.join('\n');
    if (!condition) throw new Error(message);
}
const resourceKeys = ['wood', 'wine', 'marble', 'glass', 'sulfur'];
const amounts = [10000, 500, 0, 500];
const cities = Array.from({ length: 5 }, (_, index) => {
    const known = index < 4;
    const values = Object.fromEntries(resourceKeys.map(key => [key, amounts[index] || 0]));
    values.wine = [1000, 0, 500, 20, 0][index];
    return {
        id: index + 1, name: `City ${index + 1}`, coords: '[50:50]', tradegood: 1,
        _popData: known ? { population: [100, 20, 0, 20][index], max: 200, growth: 1, percent: 50, happinessClass: 'happy' } : null,
        _resInfo: { safe: 100 },
        _mcity: {
            buildings: known ? {} : null, _corruption: [0.1, 0.03, 0, 0.03, 0][index],
            _scientists: [5, 10, 0, 10, 0][index], _maxScientists: 50, _scientistsPercent: 20,
            resources: values, maxResources: Object.fromEntries(resourceKeys.map(key => [key, 50000])),
            production: { wood: 100, wineSpendings: 10 }
        }
    };
});
const models = new Map(cities.map((city, index) => [city.id, {
    military: {
        units: index < 4 ? {
            ...Object.fromEntries(Object.values(UnitIds).map(type => [type, 1])),
            phalanx: [1000, 9, 0, 9][index], steamgiant: [2, 100, 0, 1][index], ship_ram: [10, 100, 0, 2][index]
        } : {},
        updatedAt: index < 4 ? { units: 1, ships: 1 } : {}
    }
}]));
window.Front = { data: { cities: { selectedCityId: 2 } }, ikaeasyData: { options: {}, getCity: id => models.get(Number(id)) } };
const parent = { updateContent() { this.$content.empty().append(this.activeModule.$el); } };
function createTab(Type, selector, template) {
    const tab = Object.create(Type.prototype);
    Object.assign(tab, { parent, $parent: $(selector), _cities: cities, _data: Front.data, options: { get: () => true }, tpl: template });
    tab.syncAll = async () => {};
    tab.autoSync = async () => {};
    return tab;
}
const resources = createTab(ResourcesTab, '#resources', 'dummy/empire/tabs/resources');
resources.loaderEl = '#empire_sync';
resources.render = async (template, data) => renderLocal(template, data);
resources.getRenderData = callback => callback({
    cities, selectedCityId: 2, manager: { info: { _government: '' } }, dragDropEnabled: true,
    _total: { population: 140, corruption: 16, research: 25, growth: 4, max: 800, resource: {} }
});
function table(tab, key) { return tab.$el.find(`[data-empire-sort-table="${key}"]`); }
function ids(tab, key) { return table(tab, key).find('tbody tr').toArray().map(row => row.dataset.id).join(','); }
function click(tab, scope, key) { table(tab, scope).find(`th[data-sort-key="${key}"] button`)[0].click(); }
function drag(source, target) {
    const dataTransfer = new DataTransfer();
    source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
}
async function mount(tab) {
    parent.activeModule = tab;
    parent.$content = tab.$parent;
    await tab.draw();
    tab.registerClickHandlers();
}
try {
    await mount(resources);
    check(ids(resources, 'resources') === '1,2,3,4,5', 'Resources starts in original order');
    const footer = table(resources, 'resources').find('tfoot')[0];
    const totals = footer.textContent;
    for (const key of ['wood', 'marble', 'glass', 'sulfur']) {
        click(resources, 'resources', key);
        check(ids(resources, 'resources') === '3,2,4,1,5', `${key}: numeric ascending, zero and stable ties`);
        click(resources, 'resources', key);
        check(ids(resources, 'resources') === '1,2,4,3,5', `${key}: descending keeps unknown data last`);
        click(resources, 'resources', key);
        check(ids(resources, 'resources') === '1,2,3,4,5', `${key}: reset restores original order`);
    }
    click(resources, 'resources', 'wine');
    check(ids(resources, 'resources') === '2,4,3,1,5', 'Wine sorts by stock, not production or days remaining');
    click(resources, 'resources', 'population');
    check(ids(resources, 'resources') === '3,2,4,1,5', 'Population sorts correctly across a colspan header');
    click(resources, 'resources', 'scientists');
    check(ids(resources, 'resources') === '3,1,2,4,5', 'Scientists sort by assigned count');
    click(resources, 'resources', 'corruption');
    check(ids(resources, 'resources') === '3,2,4,1,5', 'Corruption sorts numerically');
    check(footer === table(resources, 'resources').find('tfoot')[0] && totals === footer.textContent, 'Resource totals stay unchanged at the bottom');
    click(resources, 'resources', 'wood');
    cities[0]._mcity.resources.wood = 2;
    await resources.draw();
    check(ids(resources, 'resources') === '3,1,2,4,5', 'Resource refresh re-sorts updated values');
    check(table(resources, 'resources').find('tr.current_city').attr('data-id') === '2', 'Resource current-city highlight follows its row');
    let transport;
    resources.openResourceTransport = (...args) => { transport = args; };
    drag(resources.$el.find('[data-city-id="1"]')[0], resources.$el.find('[data-city-id="2"]')[0]);
    check(transport.join(',') === '1,2', 'Resource drag/drop retains source and target after sorting and refresh');
    resources.destroy();

    const military = createTab(MilitaryTab, '#military', 'dummy/empire/tabs/military');
    await mount(military);
    const army = 'military-units';
    const navy = 'military-ships';
    const armyFooter = table(military, army).find('tfoot')[0];
    const armyTotal = armyFooter.textContent;
    const scroller = table(military, army)[0].parentElement;
    scroller.scrollLeft = scroller.scrollWidth;
    const offset = scroller.scrollLeft;
    check(offset > 0, 'Military fixture has horizontal overflow');
    click(military, army, 'phalanx');
    check(ids(military, army) === '3,2,4,1,5', 'Army sorts numeric counts including zero, stable ties and unknown data');
    check(ids(military, navy) === '1,2,3,4,5', 'Army sorting leaves fleet order unchanged');
    click(military, navy, 'ship_ram');
    check(ids(military, navy) === '3,4,1,2,5', 'Fleet has its own selected column and order');
    click(military, army, 'phalanx');
    check(ids(military, army) === '1,2,4,3,5', 'Army descending keeps unknown data last');
    check(ids(military, navy) === '3,4,1,2,5', 'Changing army direction preserves fleet sorting');
    check(scroller.scrollLeft === offset, 'Military sorting preserves horizontal scroll');
    check(armyFooter === table(military, army).find('tfoot')[0] && armyTotal === armyFooter.textContent, 'Military totals stay unchanged at the bottom');
    models.get(2).military.units.phalanx = 2000;
    await military.draw();
    check(ids(military, army) === '2,1,4,3,5' && ids(military, navy) === '3,4,1,2,5', 'Refresh preserves both sorts and incorporates new counts');
    check(scroller.scrollLeft === offset, 'Military refresh preserves horizontal scroll');
    let deployment;
    military.openDeployment = (...args) => { deployment = args; };
    for (const [section, type] of [[army, 'army'], [navy, 'fleet']]) {
        drag(table(military, section).find('[data-city-id="1"]')[0], table(military, section).find('[data-city-id="2"]')[0]);
        check(deployment.join(',') === `1,2,${type}`, `${type}: drag/drop retains the correct cities and deployment type`);
    }
    click(military, army, 'phalanx');
    check(ids(military, army) === '1,2,3,4,5', 'Third army click restores original city order');
    // A refreshed column can disappear when no units of that type remain.
    for (const model of models.values()) delete model.military.units.ship_ram;
    await military.draw();
    check(ids(military, navy) === '1,2,3,4,5', 'Disappearing selected unit safely restores default order');
    check(cities.map(city => city.id).join(',') === '1,2,3,4,5', 'Shared city order is never mutated');
    const reopened = createTab(ResourcesTab, '#resources', resources.tpl);
    reopened.loaderEl = '#empire_sync';
    reopened.render = resources.render;
    reopened.getRenderData = resources.getRenderData;
    await mount(reopened);
    check(ids(reopened, 'resources') === '3,1,2,4,5', 'Returning to resources restores its independent sort');
    document.title = 'PASS — Resource and military sorting';
} catch (error) {
    document.title = 'FAIL — Resource and military sorting';
    results.textContent += `\n${error.stack}`;
}
