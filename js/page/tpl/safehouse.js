import Parent from './dummy.js';
import { getItem, getInt, updateObjectItem, formatNumber } from '../../utils.js';

class Page extends Parent {

    async init() {
        this.ikariamPremiumToggle(['#tabReports .archiveButton .ambrosia']);
        this.scanReports();

        // Ikariam updates its report contents asynchronously, including when a
        // building finishes, a message arrives, or a pirate mission ends.
        // Calling init() alone can be too early for the newly inserted report.
        if (!this._safehouseObserver) {
            this._safehouseObserver = new MutationObserver((mutations) => {
                // Only react to newly added/removed DOM nodes; mere text edits
                // to the calculator must not create an update loop.
                if (!mutations.some(m => m.type === 'childList')) return;
                clearTimeout(this._safehouseScanTimer);
                this._safehouseScanTimer = setTimeout(() => this.scanReports(), 100);
            });
            this._safehouseObserver.observe(document.getElementById('tabReports') || document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    scanReports() {
        $('table.reportTable.resourcesTable').each((i, el) => {
            const $table = $(el);
            // Already-initialized reports must never be rebuilt in response
            // to calculator updates (including checkbox changes).
            if ($table.find('input.js-warehouse').length === 1 &&
                $table.find('input.js-idle').length === 1 &&
                $table.find('tr:first > th').filter((_, th) =>
                    $(th).text().trim() === LANGUAGE.getLocalizedString('safehouse_available_steal')
                ).length === 1) return;
            // Do not patch a half-rendered report; the observer will retry.
            const $info = $table.closest('tr.report').prev();
            const href = $info.find('.targetCity a').attr('href') || '';
            if (!/selectCity=([0-9]+)/.test(href) ||
                !$table.find('.unitname img').length ||
                !$table.find('tr:first th').length) return;
            void this.appendTable($table, i).catch(err =>
                console.warn('IkaEasy: cannot initialize espionage report', err)
            );
        });
    }

    destroy() {
        clearTimeout(this._safehouseScanTimer);
        this._safehouseObserver?.disconnect();
        this._safehouseObserver = null;
    }

    async appendTable($table, index) {
        // The game can trigger several update callbacks while a template is loading.
        // Mark the table synchronously, before the first await, to avoid races.
        if ($table.data('ikaeasy-safehouse-initializing')) {
            return;
        }
        $table.data('ikaeasy-safehouse-initializing', true);

        try {
            // DOM-based detection survives jQuery data resets on partial refreshes.
            // Recover older duplicates (including those injected by previous runs).
            const headerCount = $table.find('tr:first > th').filter((_, el) =>
                $(el).text().trim() === LANGUAGE.getLocalizedString('safehouse_available_steal')
            ).length;
            const inputCount = $table.find('input.js-warehouse').length;
            const idleCount = $table.find('input.js-idle').length;

            // Only our own header and controls determine whether we have
            // installed the calculator. The old code counted generated result
            // cells against resource rows, but also added cells to non-resource
            // rows, so it wrongly rebuilt an already complete calculator.
            if (headerCount === 1 && inputCount === 1 && idleCount === 1) {
                $table.data('updated', true);
                return;
            }

            // If the DOM is partially injected or duplicated, clean only IkaEasy's
            // additions before rebuilding the calculator once.
            const savedLevel = $table.find('input.js-warehouse').first().val();
            const savedIdle = $table.find('input.js-idle').first().prop('checked');
            $table.find('tr').filter((_, el) =>
                $(el).find('input.js-warehouse, input.js-idle').length > 0
            ).remove();
            $table.find('tr:first > th').filter((_, el) =>
                $(el).text().trim() === LANGUAGE.getLocalizedString('safehouse_available_steal')
            ).remove();
            $table.find('td.js-resource').remove();
            $table.find('tr.js-resource-row').removeClass('js-resource-row');

            _.each($table.find('tr'), (el, i) => {
                let $el = $(el);
                if (i === 0) {
                    $el.append(`<th class="count">${LANGUAGE.getLocalizedString('safehouse_available_steal')}</th>`);
                    return;
                }
                $el.addClass('js-resource-row').append(`<td class="count js-resource">0</td>`);
            });

            const tpl = await this.render('safehouse');
            // The report might have been replaced while the template was loading.
            if (!$table[0].isConnected) return;
            const $tr = $(tpl);
            $table.append($tr);

            const $info = $table.closest('tr.report').prev();
            const href = $info.find('.targetCity a').attr('href') || '';
            const match = href.match(/selectCity=([0-9]+)/);
            if (!match) {
                console.warn('IkaEasy: missing target city for espionage report');
                return;
            }
            const targetCityId = match[1];
            const levels = getItem('warehouse-level');
            if (savedLevel !== undefined) {
                $tr.find('.js-warehouse').val(savedLevel);
            } else if (levels && levels[targetCityId] !== undefined) {
                $tr.find('.js-warehouse').val(levels[targetCityId]);
            }
            if (savedIdle !== undefined) {
                $tr.find('.js-idle').prop('checked', savedIdle);
            }

            $tr.find('.js-warehouse').on('input', () => this.refreshResourcesReports($table));
            $tr.find('.js-idle').on('change', () => this.refreshResourcesReports($table));
            this.refreshResourcesReports($table);
            // Report metadata extraction is not necessary for the calculator.
            // It can fail on certain reports whose owner link has no onclick.
            try { this.getReportInfo($table); }
            catch (err) { console.warn('IkaEasy: report metadata unavailable', err); }
            $table.data('updated', true);
        } finally {
            $table.removeData('ikaeasy-safehouse-initializing');
        }
    }

    getReportInfo($table) {
        // Узнаем инфу о репорте
        let storage = {};
        let $info = $table.closest('tr.report').prev();
        let m = $info.find('.targetCity a').attr('href').match(/xcoord=([0-9]+)&ycoord=([0-9]+)&selectCity=([0-9]+)/);
        if (m && m.length) {
            //onclick="toggleElement('tbl_mail97634'); toggleArrow($('#button97634')[0]);"
            const ownerClick = $info.find('.targetOwner').attr('onclick') || '';
            const ownerMatch = ownerClick.match(/tbl_mail([0-9]+)/);
            storage.ownerId = ownerMatch ? parseInt(ownerMatch[1], 10) : null;
            storage.ownerName = $info.find('.targetOwner').text().trim();
            storage.date = $info.find('.date').text().trim();
            storage.coordX = parseInt(m[1]);
            storage.coordY = parseInt(m[2]);
            storage.cityId = parseInt(m[3]);
            storage.cityName = $info.find('.targetCity a').text().replace(/(\[.*?\])/, '').trim();
            storage.resources = {};

            _.each($table.find('tr.js-resource-row'), (el) => {
                let $el = $(el);
                const src = $el.find('.unitname img').attr('src') || '';
                const resourceMatch = src.match(/icon_([a-z]+)\.png/);
                if (resourceMatch) storage.resources[resourceMatch[1]] = getInt($el.find('.count:eq(0)').text());
            });
        } else {
            console.error('Cannot parse url', $info.find('.targetCity a').attr('href'))
        }
    }

    refreshResourcesReports($table) {
        let $info = $table.closest('tr.report').prev();
        let targetCityId = $info.find('.targetCity a').attr('href').match(/selectCity=([0-9]+)/)[1];

        let warehouseLevel = getInt($table.find('.js-warehouse').val());
        updateObjectItem('warehouse-level', {[targetCityId]: warehouseLevel});

        let isIdle = $table.find('.js-idle').prop('checked');

        let sum = 0;
        let protectedResource = (isIdle) ? 15 + warehouseLevel * 80 : 100 + warehouseLevel * 480;
        _.each($table.find('tr.js-resource-row'), (el) => {
            let $el = $(el);
            let cnt = getInt($el.find('.count:eq(0)').text());
            let toStole = Math.max(0, cnt - protectedResource);
            sum += toStole;

            $el.find('.js-resource').html(formatNumber(toStole));
        });

        $table.find('.js-result-1').html(LANGUAGE.getLocalizedString('safehouse_resources', {SUM: formatNumber(sum)}));
        $table.find('.js-result-2').html(LANGUAGE.getLocalizedString('safehouse_ships', {SHIPS: Math.ceil(sum / 500)}));
    }
}

export default Page;
