// Requires Playwright. Optional: PLAYWRIGHT_CHROMIUM_EXECUTABLE and IKAEASY_TEST_OUTPUT.
const { chromium } = require('playwright');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const output = process.env.IKAEASY_TEST_OUTPUT || path.join(os.tmpdir(), 'ikaeasy-academy-tests');
const mime = { '.js': 'text/javascript', '.ejs': 'text/plain', '.css': 'text/css', '.html': 'text/html' };

const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    if (pathname === '/js/helper/templater.js') {
        // Exercise the real EJS template while replacing only extension iframe transport.
        response.setHeader('Content-Type', 'text/javascript');
        response.end(`export default async function(name) {
            if (window.fixtureRenderDelay) await new Promise(resolve => setTimeout(resolve, window.fixtureRenderDelay));
            const html = await (await fetch('/tpl/' + name + '.ejs')).text();
            return _.template(html)({data: {}});
        }`);
        return;
    }
    if (pathname === '/js/sandbox.js') {
        response.setHeader('Content-Type', 'text/javascript');
        response.end('export default { on() {}, send() {} };');
        return;
    }
    fs.readFile(file, (error, data) => {
        if (error) { response.writeHead(404).end(); return; }
        response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
        response.end(data);
    });
});

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined });
    try {
        fs.mkdirSync(output, { recursive: true });
        const page = await browser.newPage({ viewport: { width: 780, height: 1000 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/scripts/fixtures/academy-payback.html`);
        const panel = page.locator('.ikaeasy-academy-payback');
        await panel.locator('[data-payback-crystal]').filter({ hasText: '286' }).waitFor();
        assert.equal(await panel.locator('[data-payback-level]').inputValue(), '27');
        assert.equal(await panel.locator('[data-payback-rate]').inputValue(), '1.2');
        assert.equal(await panel.locator('[data-payback-exchange]').inputValue(), '1');
        assert.equal(await panel.locator('[data-payback-scientists]').textContent(), '+15');
        assert.match(await panel.locator('[data-payback-daily]').textContent(), /432/);
        await panel.screenshot({ path: path.join(output, 'academy-payback-ru.png') });

        await panel.locator('[data-payback-rate]').fill('1');
        await page.evaluate(() => academyPage.updated());
        assert.equal(await panel.count(), 1);
        assert.equal(await panel.locator('[data-payback-rate]').inputValue(), '1');
        await page.locator('#buildingUpgrade .glass').evaluate(cell => { cell.title = '300,000'; });
        await panel.locator('[data-payback-crystal]').filter({ hasText: '300' }).waitFor();
        await panel.locator('[data-payback-level]').selectOption('28');
        assert.match(await panel.locator('[data-payback-crystal]').textContent(), /409\s937/);
        await page.evaluate(() => {
            document.querySelector('#academy .mainContent').innerHTML = document.querySelector('#fixture-game').outerHTML;
            academyPage.updated();
        });
        await page.waitForFunction(() => document.querySelector('[data-payback-level]')?.value === '28');
        assert.equal(await panel.count(), 1);
        assert.equal(await panel.locator('[data-payback-rate]').inputValue(), '1');
        await panel.locator('[data-payback-rate]').fill('-1');
        assert.equal(await panel.locator('[data-payback-error]').isVisible(), true);
        await panel.locator('[data-payback-rate]').fill('0');
        assert.equal(await panel.locator('[data-payback-error]').isVisible(), false);
        assert.equal(await panel.locator('[data-payback-time]').textContent(), 'Не окупится');
        assert.doesNotMatch(await panel.locator('svg').innerHTML(), /NaN|Infinity/);
        await panel.locator('[data-payback-rate]').fill('2');
        await panel.locator('[data-payback-level]').selectOption('4');
        assert.equal(await panel.locator('[data-payback-crystal]').textContent(), '0');
        assert.match(await panel.locator('[data-payback-time]').textContent(), /^0 /);

        await page.evaluate(() => {
            fixtureManager.current = makeFixtureCity(2, 50);
            Front.data.cities.selectedCityId = 2;
            document.querySelector('#buildingUpgrade .glass').title = '900,000,000';
            academyPage.refresh();
            academyPage.updated();
        });
        await page.waitForFunction(() => document.querySelector('[data-payback-level]')?.value === '51');
        assert.equal(await panel.count(), 1);
        assert.equal(await panel.locator('[data-payback-rate]').inputValue(), '1.2');
        assert.equal(await panel.locator('[data-payback-scientists]').textContent(), '+21');
        await page.locator('#buildingUpgrade .glass').evaluate(cell => { cell.title = '2.1G'; cell.textContent = '2.1G'; });
        await panel.locator('[data-payback-error]').filter({ hasText: 'стоимости' }).waitFor();

        await page.evaluate(() => {
            fixtureManager.current = makeFixtureCity(3, 71);
            Front.data.cities.selectedCityId = 3;
            academyPage.updated();
        });
        await panel.locator('[data-payback-error]').filter({ hasText: 'числе учёных' }).waitFor();
        await panel.locator('[data-payback-level]').selectOption('27');
        await panel.locator('[data-payback-rate]').fill('1.2');
        for (const width of [780, 360, 320]) {
            await page.setViewportSize({ width, height: 1400 });
            const overflow = await panel.evaluate(root => {
                const bounds = root.getBoundingClientRect();
                return [...root.querySelectorAll('input,select,svg')].some(element => {
                    const rect = element.getBoundingClientRect();
                    return rect.left < bounds.left || rect.right > bounds.right;
                });
            });
            assert.equal(overflow, false);
        }
        await panel.screenshot({ path: path.join(output, 'academy-payback-narrow.png') });
        await page.setViewportSize({ width: 780, height: 1000 });
        await page.evaluate(async () => {
            academyPage.selfDestroy();
            window.currentLanguage = 'en';
            const { default: en } = await import('/lang/en.js');
            window.LANGUAGE = { ...en, getLocalizedString(key) { return this[key] || key; } };
            fixtureManager.current = makeFixtureCity(4, 26);
            Front.data.cities.selectedCityId = 4;
            document.querySelector('#buildingUpgrade .glass').title = '286,607';
            window.academyPage = new AcademyPage();
        });
        await panel.locator('h3').filter({ hasText: 'Academy upgrade payback' }).waitFor();
        assert.doesNotMatch(await panel.textContent(), /academy_payback\./);
        await panel.screenshot({ path: path.join(output, 'academy-payback-en.png') });
        await page.evaluate(() => { fixtureManager.options.academy_payback = false; academyPage.updated(); });
        assert.equal(await panel.count(), 0);

        await page.evaluate(() => {
            fixtureManager.options.academy_payback = true;
            window.fixtureRenderDelay = 150;
            academyPage.updated();
            academyPage.selfDestroy();
        });
        await page.waitForFunction(() => !document.querySelector('.ikaeasy-academy-payback'));
        await page.waitForTimeout(250);
        assert.equal(await panel.count(), 0);
        assert.deepEqual(errors, []);
        console.log(JSON.stringify({ result: 'PASS', cases: ['live prices', 'no double discount', 'refresh without duplicates', 'manual overrides', 'city switching', 'missing high-level data', 'zero output and free levels', 'Russian and English', '320–780px layout', 'settings and async cleanup'], screenshots: output }));
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
