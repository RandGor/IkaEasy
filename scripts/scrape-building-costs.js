/*
 * Run this file in the DevTools console of an authenticated Ikariam tab.
 * It reads every building table from the in-game Help section and downloads
 * a generated buildings.js file suitable for js/helper/db/buildings.js.
 */
(async () => {
    const buildings = [
        { id: 0,  name: 'townHall',           resources: ['wood', 'marble'] },
        { id: 4,  name: 'academy',            resources: ['wood', 'glass'] },
        { id: 7,  name: 'warehouse',          resources: ['wood', 'marble'] },
        { id: 9,  name: 'tavern',             resources: ['wood', 'marble'] },
        { id: 11, name: 'palace',             resources: ['wood', 'wine', 'marble', 'glass', 'sulfur'] },
        { id: 17, name: 'palaceColony',       resources: ['wood', 'wine', 'marble', 'glass', 'sulfur'] },
        { id: 10, name: 'museum',             resources: ['wood', 'marble'] },
        { id: 3,  name: 'port',               resources: ['wood', 'marble'] },
        { id: 5,  name: 'shipyard',           resources: ['wood', 'marble'] },
        { id: 6,  name: 'barracks',           resources: ['wood', 'marble'] },
        { id: 8,  name: 'wall',               resources: ['wood', 'marble'] },
        { id: 12, name: 'embassy',            resources: ['wood', 'marble'] },
        { id: 13, name: 'branchOffice',       resources: ['wood', 'marble'] },
        { id: 15, name: 'workshop',           resources: ['wood', 'marble'] },
        { id: 16, name: 'safehouse',          resources: ['wood', 'marble'] },
        { id: 18, name: 'forester',           resources: ['wood', 'marble'] },
        { id: 20, name: 'glassblowing',       resources: ['wood', 'marble'] },
        { id: 22, name: 'alchemist',          resources: ['wood', 'marble'] },
        { id: 21, name: 'winegrower',         resources: ['wood', 'marble'] },
        { id: 19, name: 'stonemason',         resources: ['wood', 'marble'] },
        { id: 23, name: 'carpentering',       resources: ['wood', 'marble'] },
        { id: 25, name: 'optician',           resources: ['wood', 'marble'] },
        { id: 27, name: 'fireworker',         resources: ['wood', 'marble'] },
        { id: 26, name: 'vineyard',           resources: ['wood', 'marble'] },
        { id: 24, name: 'architect',          resources: ['wood', 'marble'] },
        { id: 28, name: 'temple',             resources: ['wood', 'glass'] },
        { id: 29, name: 'dump',               resources: ['wood', 'marble', 'glass', 'sulfur'] },
        { id: 30, name: 'pirateFortress',     resources: ['wood', 'marble'] },
        { id: 31, name: 'blackMarket',        resources: ['wood', 'marble'] },
        { id: 32, name: 'marineChartArchive', resources: ['wood', 'marble', 'glass'] },
        { id: 33, name: 'dockyard',           resources: ['wood', 'marble', 'glass'] },
        { id: 34, name: 'shrineOfOlympus',    resources: ['wood', 'wine', 'marble', 'glass', 'sulfur'] },
        { id: 35, name: 'chronosForge',       resources: ['wood', 'wine', 'marble', 'glass', 'sulfur'] }
    ];

    function findHelpHtml(value) {
        if (typeof value === 'string') {
            return value.includes('table01') && value.includes('buildingDescription')
                ? value
                : null;
        }

        if (!value || typeof value !== 'object') {
            return null;
        }

        for (const child of Object.values(value)) {
            const html = findHelpHtml(child);
            if (html) {
                return html;
            }
        }

        return null;
    }

    function parseNumber(cell, building, level) {
        const value = (cell.querySelector('.tooltip') || cell).textContent.trim();
        const digits = value.replace(/[^0-9]/g, '');
        if (!digits) {
            throw new Error(`${building} level ${level}: invalid resource value "${value}"`);
        }

        return Number.parseInt(digits, 10);
    }

    function parseBuilding(html, building) {
        const document = new DOMParser().parseFromString(html, 'text/html');
        const selectedBuilding = document.querySelector('.button_building.selected');
        if (!selectedBuilding || !selectedBuilding.classList.contains(building.name)) {
            throw new Error(`${building.name}: Ikariam returned a different Help page`);
        }

        const table = document.querySelector('.content table.table01.center');
        if (!table) {
            throw new Error(`${building.name}: Help cost table was not found`);
        }

        const levels = [];
        table.querySelectorAll('tr').forEach((row) => {
            const levelCell = row.querySelector('td.level');
            if (!levelCell) {
                return;
            }

            const level = Number.parseInt(levelCell.textContent.trim(), 10);
            const costCells = Array.from(row.querySelectorAll('td.costs'));
            const expectedColumns = building.resources.length + 1; // Resources plus construction time.
            if (costCells.length !== expectedColumns) {
                throw new Error(
                    `${building.name} level ${level}: expected ${expectedColumns} cost columns, found ${costCells.length}`
                );
            }

            if (level !== levels.length + 1) {
                throw new Error(`${building.name}: expected level ${levels.length + 1}, found ${level}`);
            }

            const costs = {};
            building.resources.forEach((resource, index) => {
                costs[resource] = parseNumber(costCells[index], building.name, level);
            });
            levels.push(costs);
        });

        if (!levels.length) {
            throw new Error(`${building.name}: Help table contains no levels`);
        }

        return levels;
    }

    async function loadBuilding(building) {
        const params = new URLSearchParams({
            view: 'buildingDetail',
            buildingId: building.id,
            helpId: 1,
            ajax: 1
        });
        const response = await fetch('/index.php?' + params.toString(), {
            credentials: 'same-origin',
            headers: {
                Accept: 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`${building.name}: Ikariam returned HTTP ${response.status}`);
        }

        const responseText = await response.text();
        let responseData = responseText;
        try {
            responseData = JSON.parse(responseText);
        } catch (error) {
            // Non-AJAX responses contain the complete HTML page.
        }

        const html = findHelpHtml(responseData);
        if (!html) {
            throw new Error(`${building.name}: Help HTML is missing in the response`);
        }

        return parseBuilding(html, building);
    }

    function formatModule(data) {
        const sections = Object.entries(data).map(([building, levels]) => {
            const rows = levels.map((costs) => {
                const values = Object.entries(costs)
                    .map(([resource, amount]) => `${JSON.stringify(resource)}: ${amount}`)
                    .join(', ');
                return `    {${values}}`;
            }).join(',\n');
            return `  ${JSON.stringify(building)}: [\n${rows}\n  ]`;
        });

        return `export default {\n${sections.join(',\n\n')}\n};\n`;
    }

    const result = {};
    for (const building of buildings) {
        result[building.name] = await loadBuilding(building);
        console.info(`[IkaEasy] ${building.name}: ${result[building.name].length} levels`);
    }

    const source = formatModule(result);
    const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'buildings.js';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    console.info(`[IkaEasy] Exported ${buildings.length} building cost tables`);
})();
