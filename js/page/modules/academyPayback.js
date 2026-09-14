import { Buildings } from '../../const.js';
import { getInt, executePageCommand } from '../../utils.js';
import Render from '../../helper/templater.js';
import { calculateAcademyPayback, getAcademyComparisonLevels, getExperimentRate } from '../../helper/academyPayback.js';

export default class AcademyPayback {
    constructor(host, city, edited = {}) {
        this.host = host;
        this.city = city;
        this.cityId = city.id;
        this.destroyed = false;
        this.edited = edited;
        const locale = window.currentLanguage === 'gr' ? 'el' : window.currentLanguage || 'en';
        this.number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
        this.compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
        this.mount();
    }

    text(key) {
        return LANGUAGE.getLocalizedString('academy_payback.' + key);
    }

    async mount() {
        const html = await Render('academy-payback');
        if (this.destroyed || !this.host.isConnected) {
            return;
        }
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        this.element = wrapper.firstElementChild;
        const content = this.host.querySelector('.mainContent') || this.host;
        content.append(this.element);
        this.levelInput = this.element.querySelector('[data-payback-level]');
        this.rateInput = this.element.querySelector('[data-payback-rate]');
        this.exchangeInput = this.element.querySelector('[data-payback-exchange]');
        this.graph = this.element.querySelector('[data-payback-chart]');
        for (const field of ['rate', 'exchange']) {
            if (this.edited[field] !== undefined) {
                this[field + 'Input'].value = this.edited[field];
                this[field + 'Edited'] = true;
            }
        }
        this.levelInput.addEventListener('change', () => {
            this.levelEdited = true;
            this.draw();
        });
        this.rateInput.addEventListener('input', () => {
            this.rateEdited = true;
            this.draw();
        });
        this.exchangeInput.addEventListener('input', () => {
            this.exchangeEdited = true;
            this.draw();
        });
        this.resizeObserver = new ResizeObserver(() => this.draw());
        this.resizeObserver.observe(this.element);
        this.update(this.city);
    }

    update(city) {
        this.city = city;
        if (!this.element || this.destroyed) {
            return;
        }
        const academy = city.getBuildingByType(Buildings.ACADEMY);
        this.academy = academy;
        const currentLevel = academy?.level;
        if (!Number.isInteger(currentLevel)) {
            this.showError('capacity');
            return;
        }
        if (this.currentLevel !== currentLevel) {
            const selected = this.levelEdited ? Number(this.levelInput.value) : this.edited.level ?? currentLevel + 1;
            this.levelEdited = this.levelEdited || this.edited.level !== undefined;
            this.levelInput.replaceChildren();
            for (const level of getAcademyComparisonLevels(currentLevel)) {
                const option = document.createElement('option');
                option.value = level;
                option.textContent = `${level - 1} → ${level}`;
                this.levelInput.append(option);
            }
            this.levelInput.value = String(selected);
            if (!this.levelInput.value) {
                this.levelInput.value = String(currentLevel + 1);
            }
            this.currentLevel = currentLevel;
        }
        if (!this.rateEdited) {
            const rate = (city.getResearchMultiplier() + city.getResearchGovernmentMultiplier()) * (1 - city.getCorruption());
            this.rateInput.value = Number.isFinite(rate) ? String(Number(Math.max(0, rate).toFixed(6))) : '';
        }
        if (!this.exchangeEdited) {
            const optician = city.getBuildingByType(Buildings.OPTICIAN);
            this.exchangeInput.value = String(Number(getExperimentRate(optician?.level).toFixed(6)));
        }
        this.observePrice();
        this.draw();
        executePageCommand('adjustMainboxScrollbar');
    }

    observePrice() {
        const upgrade = document.getElementById('buildingUpgrade');
        if (this.upgradeElement === upgrade) {
            return;
        }
        this.priceObserver?.disconnect();
        this.upgradeElement = upgrade;
        if (upgrade) {
            this.priceObserver = new MutationObserver(() => this.draw());
            this.priceObserver.observe(upgrade, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title'] });
        }
    }

    actualCrystal(level) {
        if (level !== this.currentLevel + 1 || this.academy?.completed || !this.upgradeElement?.isConnected) {
            return null;
        }
        const cell = this.upgradeElement.querySelector('ul.resources > li.glass, ul.resources > li.crystal');
        if (!cell) {
            return null;
        }
        const raw = cell.getAttribute('title') || cell.querySelector('.tooltip')?.textContent || cell.textContent;
        // Abbreviated display values must not be mistaken for an exact price.
        if (!/^\s*[\d.,\s\u00a0]+\s*$/.test(raw)) {
            return null;
        }
        return getInt(raw);
    }

    showError(reason) {
        const error = this.element.querySelector('[data-payback-error]');
        const message = this.text('error_' + reason);
        const changed = error.hidden || error.textContent !== message;
        error.textContent = message;
        error.hidden = false;
        this.element.querySelector('[data-payback-results]').hidden = true;
        if (changed) { executePageCommand('adjustMainboxScrollbar'); }
    }

    duration(days) {
        if (!Number.isFinite(days)) {
            return this.text('never');
        }
        const years = days >= 730;
        return this.number.format(years ? days / 365 : days) + ' ' + this.text(years ? 'years_short' : 'days_short');
    }

    draw() {
        if (this.destroyed || !this.element || !this.academy) {
            return;
        }
        const level = Number(this.levelInput.value);
        const result = calculateAcademyPayback({
            level,
            crystalFactor: this.city.getBuildingsCostDiscount().glass,
            rate: this.rateInput.value === '' ? NaN : Number(this.rateInput.value),
            exchangeRate: this.exchangeInput.value === '' ? NaN : Number(this.exchangeInput.value),
            actualCrystal: this.actualCrystal(level)
        });
        if (result.error) {
            this.showError(result.error);
            return;
        }
        const error = this.element.querySelector('[data-payback-error]');
        const restored = !error.hidden;
        error.hidden = true;
        this.element.querySelector('[data-payback-results]').hidden = false;
        const setText = (key, value) => { this.element.querySelector(`[data-payback-${key}]`).textContent = value; };
        setText('crystal', this.number.format(result.crystal));
        setText('price-source', this.text(result.livePrice ? 'live_price' : 'table_price'));
        setText('scientists', '+' + result.extraScientists);
        setText('daily', '+' + this.number.format(result.daily) + ' ' + this.text('points_daily'));
        setText('time', this.duration(result.days));
        setText('experiment', this.text('experiment_time') + ' ' + this.duration(result.experimentDays));
        this.drawChart(result);
        if (restored) { executePageCommand('adjustMainboxScrollbar'); }
    }

    drawChart(result) {
        const width = Math.max(250, this.graph.getBoundingClientRect().width);
        const height = 245, left = 62, right = width - 12, top = 30, bottom = height - 48;
        const maxDays = Number.isFinite(result.days) ? Math.max(1, result.days * 1.3) : 365;
        const maxPoints = Math.max(1, result.exchangePoints, result.daily * maxDays) * 1.12;
        const x = days => left + days / maxDays * (right - left);
        const y = points => bottom - points / maxPoints * (bottom - top);
        const years = maxDays >= 1460;
        this.graph.setAttribute('viewBox', `0 0 ${width} ${height}`);
        this.graph.replaceChildren();
        const svg = (name, attributes, text) => {
            const element = document.createElementNS('http://www.w3.org/2000/svg', name);
            for (const [key, value] of Object.entries(attributes)) {
                element.setAttribute(key, value);
            }
            if (text !== undefined) { element.textContent = text; }
            this.graph.append(element);
        };
        svg('title', {}, this.text('chart') + ': ' + this.duration(result.days));
        svg('rect', { x: left, y: top, width: right - left, height: bottom - top, class: 'payback-axis' });
        for (const fraction of [0, 0.5, 1]) {
            const points = maxPoints * fraction;
            svg('line', { x1: left, x2: right, y1: y(points), y2: y(points), class: 'payback-axis' });
            svg('text', { x: left - 7, y: y(points) + 4, 'text-anchor': 'end' }, this.compact.format(points));
            svg('text', { x: x(maxDays * fraction), y: bottom + 19, 'text-anchor': fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle' }, this.compact.format(maxDays * fraction / (years ? 365 : 1)));
        }
        svg('text', { x: left, y: 15 }, this.text('points'));
        svg('text', { x: (left + right) / 2, y: height - 5, 'text-anchor': 'middle' }, this.text(years ? 'axis_years' : 'axis_days'));
        svg('line', { x1: left, x2: right, y1: y(result.exchangePoints), y2: y(result.exchangePoints), class: 'payback-exchange' });
        svg('line', { x1: left, x2: right, y1: y(0), y2: y(result.daily * maxDays), class: 'payback-research' });
        if (result.exchangePoints > 0 && Number.isFinite(result.days)) {
            svg('circle', { cx: x(result.days), cy: y(result.exchangePoints), r: 4, class: 'payback-crossing' });
            svg('text', { x: x(result.days) - 7, y: y(result.exchangePoints) - 10, 'text-anchor': 'end' }, this.duration(result.days));
        }
    }

    getEditedInputs() {
        return {
            ...(this.levelEdited ? { level: Number(this.levelInput.value) } : {}),
            ...(this.rateEdited ? { rate: this.rateInput.value } : {}),
            ...(this.exchangeEdited ? { exchange: this.exchangeInput.value } : {})
        };
    }

    destroy() {
        this.destroyed = true;
        this.resizeObserver?.disconnect();
        this.priceObserver?.disconnect();
        this.element?.remove();
    }
}
