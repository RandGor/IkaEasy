import Db from '../../../helper/db.js';
import Tooltip from '../../../helper/tooltip.js';
import Parent from './dummy.js';
import { Buildings } from '../../../const.js';

const DB = Db.db();

class Module extends Parent {
    drawUpdateFreq = 60 * 1000; //1 min
    constructor(parent) {
        super(parent, 'buildings.ejs')
    }

    init() {
    }

    async getRenderData(callback) {
        const helpers = {
            getBuildingInfo: this._getBuildingInfo,
            getDiscount: this.getDiscount,
        };

        const data = {
            cities: this._cities,
            selectedCityId: this._data.cities.selectedCityId,
            manager: Front.ikaeasyData,
            buildings: {}
        };

        _.each(Buildings, (building) => {
            data.buildings[building] = Front.ikaeasyData.getBuildingInfo(building);
        });

        await callback(data, helpers);
    }

    afterRender() {
        this.updateTableWidth();
        this.applySort();
    }

    toggleSort($header) {
        const building = $header.attr('data-building');
        const index = Number($header.attr('data-building-index'));
        const previous = this.parent.buildingsSort;
        const sameColumn = previous && previous.building === building && previous.index === index;
        this.parent.buildingsSort = sameColumn && previous.direction === 'descending' ? null : {
            building,
            index,
            direction: sameColumn ? 'descending' : 'ascending'
        };
        Tooltip.hide();
        this.applySort();
    }

    applySort() {
        const headers = this.$el.find('th[data-building-index]').toArray();
        let sort = this.parent.buildingsSort;
        const selected = sort && headers.find(header =>
            header.getAttribute('data-building') === sort.building &&
            Number(header.getAttribute('data-building-index')) === sort.index
        );
        if (!selected) {
            sort = this.parent.buildingsSort = null;
        }

        headers.forEach(header => {
            const direction = header === selected ? sort.direction : null;
            const action = direction === 'ascending' ? 'descending' : direction === 'descending' ? 'reset' : 'ascending';
            const index = Number(header.getAttribute('data-building-index'));
            const name = header.title + (index ? ` (${index + 1})` : '');
            const label = `${name}: ${LANGUAGE.getLocalizedString(`empire.buildings_sort_${action}`)}`;
            $(header).attr('aria-sort', direction || 'none').find('.empire-building-sort')
                .attr({ title: label, 'aria-label': label });
        });

        const tbody = this.$el.find('tbody')[0];
        if (!tbody || !this._cities) {
            return;
        }
        const originalOrder = new Map(this._cities.map((city, index) => [Number(city.id), index]));
        const rows = Array.from(tbody.rows).map(row => {
            const cell = selected && row.cells[selected.cellIndex];
            // Missing buildings count as level zero; missing city data stays last.
            const info = cell && $(cell).data('data');
            const level = info ? Number(info.level) : cell && cell.classList.contains('empire-no-building') ? 0 : null;
            return { row, level, order: originalOrder.get(Number(row.dataset.id)) ?? Number.MAX_SAFE_INTEGER };
        });
        rows.sort((a, b) => {
            if (sort) {
                if (a.level === null && b.level !== null) return 1;
                if (b.level === null && a.level !== null) return -1;
                const difference = (a.level - b.level) * (sort.direction === 'ascending' ? 1 : -1);
                if (difference) return difference;
            }
            return a.order - b.order;
        });
        const scrollLeft = this.$el.scrollLeft();
        // Keep template whitespace in place so the incremental DOM patcher
        // still sees the same sequence of text nodes and table rows.
        let rowIndex = 0;
        const nodes = Array.from(tbody.childNodes);
        const sortedNodes = nodes.map(node => node.nodeName === 'TR' ? rows[rowIndex++].row : node);
        if (sortedNodes.some((node, index) => node !== nodes[index])) {
            tbody.append(...sortedNodes);
        }
        this.$el.scrollLeft(scrollLeft);
    }

    _getBuildingInfo(city, building, discount) {
        let result = [];

        _.each(city.buildings[building], (b) => {
            let info = {
                name: b.name,
                building: b.building,
                position: b.position,

                level: b.level
            };

            info.is_upgrading = !!b.completed;
            if ((b.completed) && (b.completed * 1000 < _.now())) {
                // В случае если постройка здания завершена, но город еще не посещали
                info.level += 1;
                info.is_upgrading = false;
            }

            let lvl = (info.is_upgrading) ? info.level + 1 : info.level;
            let nextLevelResources = DB.source[building][lvl];


            info.is_finished = !nextLevelResources;
            info.resources_enough = false;

            if (!info.is_finished) {
                info.resources_enough = true;
                info.resources = {};
                _.each(nextLevelResources, (v, k) => {
                    if (v) {
                        v = Math.floor(v * discount[k]);

                        info.resources[k] = {
                            amount: v,
                            enough: city.resources[k] >= v,
                            required: city.resources[k] - v
                        };

                        if (city.resources[k] < v) {
                            info.resources_enough = false;
                        }
                    }
                });
            }

            result.push(info);
        });

        return result;
    }

    // Фиксим размеры закиксифрованных ячеек чтобы скролл был только у зданий
    updateTableWidth() {
        this.$el.addClass('empire-calc-width');

        let $tr = this.$el.find('table tr:eq(0)');
        let w1 = $tr.find('th:eq(0)').width() + 4;
        let w2 = $tr.find('th:eq(1)').width();

        this.$el.css({marginLeft: w1 + w2 + 37});

        this.$el.find('th.empire_city').css('width', w1);
        this.$el.find('td.empire_city').css('width', w1 - 29); // Магическое число... методом научного тыка
        this.$el.find('.empire_transport').css('left', w1 + 28); // 16 + 12


        this.$el.removeClass('empire-calc-width');
    }

    onRegisterClickHandlers($el){
        this.onClick('.empire-building-sort', (e) => {
            this.toggleSort($(e.currentTarget).closest('th'));
        });

        this.$parent.on('mouseenter mouseleave', '.empire-building', (e) => {
            let $td = $(e.currentTarget);
            this.$el.find('.empire-building-hover').removeClass('empire-building-hover');

            if (e.type === 'mouseenter') {
                let idx = $td.index();
                _.each(this.$el.find('tr'), ($tr) => {
                    $($tr).find('td,th').eq(idx).addClass('empire-building-hover');
                });
            }
        });

        // Подготавливаем тултипы
        this.onHover('td.empire-building', async (e) => {
            let $b = $(e.currentTarget);
            if (!$b.data('data')) {
                return;
            }

            const tpl = await this.render('dummy/empire/tooltip/building', $b.data('data'));
            Tooltip.show(e, $b, $(tpl));
        });

        this.onClick('.empire-building-can-hover', (e) => {
            let $td = $(e.currentTarget);
            let cityId = $td.parent().data('id');

            Tooltip.hide();
            this.parent.close();
            this.openBuilding({
                building: $td.data('building'),
                position: $td.data('position'),
                cityId: cityId
            });
        });
    }

    getDiscount(city) {
        return city.getBuildingsCostDiscount();
    }

    onDestroy() {
        Tooltip.hide();
        Front.ikaeasyData.off('update.empireBuildings');
    }
}

export default Module;
