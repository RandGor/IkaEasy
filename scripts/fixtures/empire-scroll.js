window.chrome = {
    runtime: { getURL: path => '/' + path },
    storage: { onChanged: { addListener() {} } }
};
const { default: Buildings } = await import('../../js/page/modules/empire/buildings.js');
const { default: Resources } = await import('../../js/page/modules/empire/resources.js');
const { default: Military } = await import('../../js/page/modules/empire/military.js');
const { default: Espionage } = await import('../../js/page/modules/empire/espionage.js');
const { default: Empire } = await import('../../js/page/modules/empire.js');
const { default: Storage } = await import('../../js/helper/storage.js');
const { default: SyncLock } = await import('../../js/helper/syncLock.js');

// Exercise the real draw, DOM patcher and width measurement with browser layout.
// Only the game data/template input is replaced by a deterministic small table.
const results = document.querySelector('#results');
const messages = [];
function check(condition, message) {
    messages.push(`${condition ? 'PASS' : 'FAIL'} ${message}`);
    results.textContent = messages.join('\n');
    if (!condition) throw new Error(message);
}
let level = 35;
let count = 32;
let cityName = '[88:37] A city with a long name';
const module = Object.create(Buildings.prototype);
module.$parent = $('#tabReport');
module.parent = { updateContent() { module.$parent.empty().append(module.$el); } };
module.getRenderData = callback => callback({});
const render = async () => `<div class="empire-table-scroll-wrapper"><table><thead><tr>
    <th class="empire_city">City</th><th class="empire_transport"><div></div></th>
    ${Array.from({ length: count }, (_, i) => `<th class="empire-building">B${i}</th>`).join('')}
    </tr></thead><tbody><tr><td class="empire_city">${cityName}</td>
    <td class="empire_transport"><div></div></td>
    ${Array.from({ length: count }, () => `<td class="empire-building">${level}</td>`).join('')}
    </tr></tbody></table></div>`;
module.render = render;

try {
    await module.draw();
    const root = module.$el[0];
    check(root.scrollLeft === 0, 'Initial render starts at zero');
    root.scrollLeft = root.scrollWidth;
    const end = root.scrollLeft;
    check(end > 0, `Table overflows: end=${end}`);
    level = 36;
    await module.draw();
    check(root === module.$el[0], 'Refresh keeps the scroll container');
    check(root.scrollLeft === end, `Refresh at end preserves position: ${end} -> ${root.scrollLeft}`);
    check(root.querySelector('td.empire-building').textContent === '36', 'Building data still updates');

    root.scrollLeft = 80;
    await module.draw();
    check(root.scrollLeft === 80, 'Refresh preserves a middle position');
    await module.draw();
    check(root.scrollLeft === 80, 'Repeated refresh preserves position');

    // A user can scroll while an asynchronous template is being prepared.
    let release;
    module.render = () => new Promise(resolve => { release = async () => resolve(await render()); });
    const drawing = module.draw();
    root.scrollLeft = 120;
    release();
    await drawing;
    check(root.scrollLeft === 120, 'Scroll during async rendering keeps the latest position');
    module.render = render;

    cityName += ' renamed';
    await module.draw();
    check(root.scrollLeft === 120, 'Recalculating wider city names preserves position');
    check(root.querySelector('td.empire_city').textContent === cityName, 'City name updates');

    root.scrollLeft = 0;
    await module.draw();
    check(root.scrollLeft === 0, 'Start stays at zero');

    root.scrollLeft = root.scrollWidth;
    count = 3;
    await module.draw();
    check(root.scrollLeft === 0, 'Removing overflow clamps to the valid range');
    count = 32;
    await module.draw();
    check(root.scrollLeft === 0, 'New columns do not restore a stale offset');
    check(!module.drawing, 'Drawing state is released');
    // Resources starts syncing on opening the window. Switch to buildings
    // before that request finishes, then let the real runSync() complete.
    let finishSync;
    let startedSync;
    const started = new Promise(resolve => { startedSync = resolve; });
    const pending = new Promise(resolve => { finishSync = resolve; });
    const stored = new Map();
    Storage.get = async key => structuredClone(stored.get(key) || null);
    Storage.set = async (key, value) => { stored.set(key, structuredClone(value)); return true; };
    window.Front = { data: { avatarId: 1, cities: {} }, ikaeasyData: {
        resources: 10,
        off() {},
        async ajaxUpdateAllCities() {
            startedSync();
            await pending;
            this.resources = 20;
            await Storage.set('fixture-city', { resources: this.resources });
        },
        async ajaxUpdatePalace() { await Storage.set('fixture-palace', { updated: true }); }
    } };
    const parent = Object.create(Empire.prototype);
    parent.$content = module.$parent;
    let mounts = 0;
    parent.updateContent = function() { mounts++; Empire.prototype.updateContent.call(this); };
    const resources = Object.create(Resources.prototype);
    resources.parent = parent;
    resources.$parent = parent.$content;
    resources.loaderEl = '#empire_sync';
    resources.drawUpdateFreq = 5000;
    resources.getRenderData = callback => callback({});
    resources.render = async () => '<div><span id="empire_sync"></span>Resources</div>';
    parent.activeModule = resources;
    await resources.draw();
    await started;
    const syncing = resources.syncPromise;
    resources.destroy();
    parent.activeModule = module;
    module.parent = parent;
    parent.updateContent();
    root.scrollLeft = root.scrollWidth;
    const position = root.scrollLeft;
    const mountsBeforeCompletion = mounts;
    finishSync();
    const syncResult = await syncing;
    const timerRestarted = resources.drawTimer != null;
    resources.stopDrawTimer();
    check(root.scrollLeft === position, `Inactive resource sync preserves buildings: ${position} -> ${root.scrollLeft}`);
    check(mounts === mountsBeforeCompletion, 'Inactive resource sync does not remount the active table');
    check(!timerRestarted, 'Destroyed resources does not restart its refresh timer');
    check(syncResult.status === 'completed', 'Closing the tab does not cancel its in-flight sync');
    check((await Storage.get('fixture-city')).resources === 20, 'City data is saved after closing the tab');
    check((await Storage.get('fixture-palace')).updated, 'The remaining palace request still finishes');
    const syncState = await Storage.get('empire');
    check(syncState.sync_completed_at > 0 && syncState.sync_id === null, 'Real sync lock records completion and releases the lock');
    check(!SyncLock.running.empire, 'Completed sync is removed from the running requests');

    // Every empire tab shares this lifecycle, including its own cleanup hook.
    for (const [label, Tab] of Object.entries({ Resources, Buildings, Military, Espionage })) {
        let finishRender;
        const stale = Object.create(Tab.prototype);
        stale.$parent = parent.$content;
        stale.parent = parent;
        stale.getRenderData = callback => callback({});
        stale.render = () => new Promise(resolve => { finishRender = resolve; });
        const pendingDraw = stale.draw();
        stale.destroy();
        finishRender('<div>Stale content</div>');
        await pendingDraw;
        check(mounts === mountsBeforeCompletion, `${label}: late template does not remount the active tab`);
        check(!stale.drawing, `${label}: cancelled drawing releases its state`);
        stale.startDrawTimer();
        const timerRestarted = stale.drawTimer != null;
        stale.stopDrawTimer();
        check(!timerRestarted, `${label}: destroyed tab cannot restart its timer`);
        check(await stale.draw() === false, `${label}: destroyed tab rejects new draws`);
    }

    // Close before the constructor's existing initial-render callback runs.
    Front.data = { cities: {} };
    let initialRender;
    let immediatelyClosed;
    const schedule = window.setTimeout;
    try {
        window.setTimeout = callback => { initialRender = callback; return 0; };
        immediatelyClosed = new Resources(parent);
    } finally {
        window.setTimeout = schedule;
    }
    let initialDraws = 0;
    immediatelyClosed.draw = () => { initialDraws++; };
    immediatelyClosed.destroy();
    initialRender();
    check(initialDraws === 0, 'Closing before initial render prevents a late draw');
    check(immediatelyClosed.drawTimer == null, 'Closing before initial render leaves no timer');

    module.drawUpdateFreq = 60000;
    module.startDrawTimer();
    const activeTimer = module.drawTimer;
    module.stopDrawTimer();
    check(activeTimer != null, 'Active buildings still starts its refresh timer');

    const reopened = Object.create(Resources.prototype);
    reopened.parent = parent;
    reopened.$parent = parent.$content;
    reopened.loaderEl = '#empire_sync';
    reopened.getRenderData = callback => callback({ resources: Front.ikaeasyData.resources });
    reopened.render = async (template, data) => `<div>Resources: ${data.resources}</div>`;
    parent.activeModule = reopened;
    await reopened.draw();
    await reopened.syncPromise;
    check(reopened.$el.text() === 'Resources: 20', 'Reopened tab displays data received while it was closed');
    reopened.destroy();
    document.title = 'PASS — Empire scroll regression';
} catch (error) {
    document.title = 'FAIL — Empire scroll regression';
    results.textContent += `\n${error.stack}`;
}
