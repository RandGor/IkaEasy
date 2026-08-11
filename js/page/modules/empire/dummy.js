import Parent from '../../common.js';
import { execute_js } from '../../../utils.js';
import { CityType } from '../../../const.js';

class Dummy extends Parent {
    drawTimer;
    firstRender = true;
    drawUpdateFreq = 5000;

    constructor(parent, tpl) {
        super();

        this.tpl = `dummy/empire/tabs/${tpl}`;
        this.parent = parent;
        this.$parent = parent.$content;
        this.init();

        setTimeout(() => {
            this.draw();
            this.registerClickHandlers();
            this.afterFirstRender();
        }, 0);
    }

    init() {
    }

    updated() {
        this.init();
    }

    async draw() {
        if (this.drawing) {
            return false;
        }

        this.drawing = true;
        return this.getRenderData(async (data, helpers) => {
            try {
                const tpl = await this.render(this.tpl, data, helpers);
                const $nextEl = $(tpl);

                if (this.$el && this.$el.length && $.contains(this.$parent[0], this.$el[0])) {
                    this.patchNode(this.$el[0], $nextEl[0]);
                } else {
                    this.$el = $nextEl;
                    this.parent.updateContent();
                }

                this.afterRender();
                return true;
            } finally {
                this.drawing = false;
            }
        });
    }

    patchNode(current, next) {
        if (!current || !next || current.nodeType !== next.nodeType || current.nodeName !== next.nodeName) {
            current && current.replaceWith(next.cloneNode(true));
            return;
        }

        if (current.nodeType === Node.TEXT_NODE) {
            if (current.nodeValue !== next.nodeValue) {
                current.nodeValue = next.nodeValue;
            }
            return;
        }

        const nextAttributes = new Map(Array.from(next.attributes).map((attribute) => [attribute.name, attribute.value]));
        let dataChanged = false;
        Array.from(current.attributes).forEach((attribute) => {
            if (!nextAttributes.has(attribute.name)) {
                current.removeAttribute(attribute.name);
                dataChanged = dataChanged || attribute.name.startsWith('data-');
            }
        });
        nextAttributes.forEach((value, name) => {
            if (current.getAttribute(name) !== value) {
                current.setAttribute(name, value);
                dataChanged = dataChanged || name.startsWith('data-');
            }
        });

        if (dataChanged) {
            $(current).removeData();
        }

        const currentChildren = Array.from(current.childNodes);
        const nextChildren = Array.from(next.childNodes);
        const commonLength = Math.min(currentChildren.length, nextChildren.length);
        for (let index = 0; index < commonLength; index++) {
            this.patchNode(currentChildren[index], nextChildren[index]);
        }
        for (let index = currentChildren.length - 1; index >= nextChildren.length; index--) {
            currentChildren[index].remove();
        }
        for (let index = currentChildren.length; index < nextChildren.length; index++) {
            current.appendChild(nextChildren[index].cloneNode(true));
        }
    }

    startDrawTimer(){
        this.stopDrawTimer();
        this.drawTimer = setInterval(() => {
            this.draw();
        }, this.drawUpdateFreq);
    }

    afterFirstRender(){
        this.startDrawTimer();
    }

    stopDrawTimer(){
        clearInterval(this.drawTimer);
        this.drawTimer = null;
    }

    onClick(el, callback){
        return this.$parent.off("click", el).on('click', el, callback);
    }

    onHover(el, callback){
        return this.$parent.on('mouseover', el, callback);
    }

    registerClickHandlers(){
        if(!this.parent){
            console.error("[IkaEasy]: Cant register click events on empty element!");
            return;
        }
        this.onClick('td.empire_city span', (e) => {
            const $tr = $(e.currentTarget).closest('tr');
            if (!$tr.hasClass('current_city')) {
                this.changeCity($tr.data('id'));
            }
        });
        this.onClick('td.empire_transport [data-js]', (e) => {
            const $tr = $(e.currentTarget).closest('tr');
            if (!$tr.hasClass('current_city')) {
                this.parent.close();

                const js = $(e.currentTarget).data('js');
                execute_js(js);
            }
        });

        this.onRegisterClickHandlers(this.$parent);
    }

    onRegisterClickHandlers($el){
        // used in child
    }

    _prepareCities() {
        const cities = [];
        _.each(this._data.cities, (city, key) => {
            if ((key.indexOf('city_') === 0) && (city.relationship === CityType.OWN)) {
                city.id = parseInt(city.id);
                cities.push(city);
            }
        });

        this._cities = Object.freeze(cities);
    }

    async getRenderData(callback) {
        await callback({});
    }

    afterRender() {
        // child use
    }

    refresh() {
        super.refresh();
    }

    destroy() {//shouldnt be overriden - use onDestroy() instead
        this.stopDrawTimer();
        this.onDestroy();
    }
    onDestroy(){
    }
}

export default Dummy;
