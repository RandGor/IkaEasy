import Parent from './dummy.js';
import Tooltip from '../../../helper/tooltip.js';
import Storage from '../../../helper/storage.js';
import SyncLock from '../../../helper/syncLock.js';
import { executePageCommand } from '../../../utils.js';

const RESOURCE_SYNC_STORAGE_KEY = 'empire';
const RESOURCE_AUTO_SYNC_INTERVAL = 10 * 60 * 1000;

class Module extends Parent {
    $loader;
    loaderEl = '#empire_sync';
    constructor(parent) {
        super(parent, 'resources.ejs')
    }

    init() {
    }

    async getRenderData(callback) {
        const data = {
            cities: this._cities,
            selectedCityId: this._data.cities.selectedCityId,
            manager: Front.ikaeasyData,
            dragDropEnabled: this.options.get('empire_resource_drag_drop', true)
        };

        await callback(data);
    }

    afterRender() {
        this.getLoader();
        this.syncAll();
    }

    getLoader(){
        this.$loader = $(this.loaderEl);
    }

    startLoader(){
        if (this.$loader.hasClass('rotate')) {
            return;
        }

        this.$loader.addClass('rotate');
    }

    async syncAll(force = false) {
        if (this.resourceTransportOpening) {
            return null;
        }
        if (this.syncPromise) {
            return this.syncPromise;
        }

        const syncPromise = this.runSync(force);
        this.syncPromise = syncPromise;
        try {
            return await syncPromise;
        } finally {
            if (this.syncPromise === syncPromise) {
                this.syncPromise = null;
            }
        }
    }

    async runSync(force = false) {
        const lastUpdateStorage = await Storage.get(RESOURCE_SYNC_STORAGE_KEY);
        const nowTime = _.now();
        const oneMinute = 1 * 60000;
        let syncInterval = RESOURCE_AUTO_SYNC_INTERVAL;
        if(lastUpdateStorage && !force){
            const lastUpdate = parseInt(lastUpdateStorage.sync_completed_at || lastUpdateStorage.update_time) || 0;
            if(this.firstRender){
                this.firstRender = false;
                syncInterval = oneMinute;
                if(lastUpdate + oneMinute > nowTime){ return null; }
            }else{
                if(lastUpdate + RESOURCE_AUTO_SYNC_INTERVAL > nowTime){ return null;}
            }
        }

        this.syncing = true;
        this.stopDrawTimer();
        this.startLoader();
        try {
            const result = await SyncLock.run(RESOURCE_SYNC_STORAGE_KEY, {
                force: force,
                interval: syncInterval
            }, async () => {
                await Front.ikaeasyData.ajaxUpdateAllCities();
                await Front.ikaeasyData.ajaxUpdatePalace();
            });

            if (result.status === 'completed') {
                await this.draw();
            }
            return result;
        } catch (error) {
            console.error('IkaEasy empire resources refresh failed:', error);
            return null;
        } finally {
            this.syncing = false;
            this.$parent.find(this.loaderEl).removeClass('rotate');
            this.startDrawTimer();
        }
    }

    onRegisterClickHandlers($el){
        this.onClick(this.loaderEl, (e) => {
            e.preventDefault();
            this.startLoader();
            this.syncAll(true);
        });

        this.onHover('tbody td.empire-resource', async (e) => {
            let $td = $(e.currentTarget);
            if (!$td.data('resource')) {
                return;
            }

            let data = {
                resource : $td.data('resource'),
                amount   : $td.data('amount'),
                safe     : $td.data('safe'),
                capacity : $td.data('capacity'),
                percent : $td.data('percent'),
                production: $td.data('production'),
                hasProduction: $td.data('has-production')
            };

            const tpl = await this.render('dummy/empire/tooltip/resource', data);
            Tooltip.show(e, $td, $(tpl));
        });

        this.onHover('tbody td.empire-research', async (e) => {
            let $td = $(e.currentTarget);
            let cityId = $td.parent().data('id');
            let city = Front.ikaeasyData.getCity(cityId);

            const tpl = await this.render('dummy/empire/tooltip/research', { city: city });
            Tooltip.show(e, $td, $(tpl));
        });

        this.onHover('tbody td.empire-happiness', async (e) => {
            let $td = $(e.currentTarget);
            let cityId = $td.parent().data('id');
            let city = Front.ikaeasyData.getCity(cityId);
            let popData = city.getPopulationData();

            if (popData) {
                const tpl = await this.render('dummy/empire/tooltip/happiness', { popData: popData });
                Tooltip.show(e, $td, $(tpl));
            }
        });

        this.onHover('tbody td.empire-corruption', async (e) => {
            let $td = $(e.currentTarget);
            const tpl = await this.render('dummy/empire/tooltip/corruption', { });
            Tooltip.show(e, $td, $(tpl));
        });

        if (this.options.get('empire_resource_drag_drop', true)) {
            this.registerResourceDragDrop();
        }
    }

    registerResourceDragDrop() {
        this.$parent
            .off('.empireResourceDragDrop')
            .on('dragstart.empireResourceDragDrop', '.empire-resource-city[draggable="true"]', (event) => {
                const sourceCityId = parseInt($(event.currentTarget).data('city-id'));
                this.draggedResourceCityId = sourceCityId;
                event.originalEvent.dataTransfer.effectAllowed = 'move';
                event.originalEvent.dataTransfer.setData('text/plain', String(sourceCityId));
                $(event.currentTarget).closest('tr').addClass('empire-resource-dragging');
            })
            .on('dragend.empireResourceDragDrop', '.empire-resource-city[draggable="true"]', () => {
                this.clearResourceDragState();
            })
            .on('dragover.empireResourceDragDrop', '.empire-resource-city[data-city-id]', (event) => {
                const targetCityId = parseInt($(event.currentTarget).data('city-id'));
                if (!this.draggedResourceCityId || this.draggedResourceCityId === targetCityId) {
                    return;
                }

                event.preventDefault();
                event.originalEvent.dataTransfer.dropEffect = 'move';
                $(event.currentTarget).addClass('empire-resource-drop-target');
            })
            .on('dragleave.empireResourceDragDrop', '.empire-resource-city[data-city-id]', (event) => {
                $(event.currentTarget).removeClass('empire-resource-drop-target');
            })
            .on('drop.empireResourceDragDrop', '.empire-resource-city[data-city-id]', (event) => {
                event.preventDefault();
                const targetCityId = parseInt($(event.currentTarget).data('city-id'));
                const sourceCityId = this.readResourceDragSource(event.originalEvent);
                this.clearResourceDragState();

                if (!sourceCityId || sourceCityId === targetCityId) {
                    return;
                }
                this.openResourceTransport(sourceCityId, targetCityId);
            });
    }

    readResourceDragSource(event) {
        if (this.draggedResourceCityId) {
            return this.draggedResourceCityId;
        }
        return parseInt(event.dataTransfer.getData('text/plain')) || null;
    }

    clearResourceDragState() {
        this.draggedResourceCityId = null;
        this.$parent.find('.empire-resource-dragging').removeClass('empire-resource-dragging');
        this.$parent.find('.empire-resource-drop-target').removeClass('empire-resource-drop-target');
    }

    async openResourceTransport(sourceCityId, targetCityId) {
        if (this.resourceTransportOpening) {
            return;
        }

        this.resourceTransportOpening = true;
        this.$parent.addClass('empire-resource-switching-city');

        try {
            if (this.syncPromise) {
                await this.syncPromise;
            }
            await this.silentChangeCity(sourceCityId);
            this.parent.close();

            const query = `/index.php?view=transport&destinationCityId=${targetCityId}` +
                `&currentCityId=${sourceCityId}&actionRequest=${encodeURIComponent(Front.data.actionRequest)}&ajax=1`;
            this.openTransportResponse(query);
        } catch (error) {
            console.error('IkaEasy resource transport: could not switch source city', error);
        } finally {
            this.resourceTransportOpening = false;
            this.$parent.removeClass('empire-resource-switching-city');
        }
    }

    openTransportResponse(query) {
        executePageCommand('openAjaxResponse', {
            url: query,
            errorMessage: 'IkaEasy resource transport request failed'
        });
    }

    async silentChangeCity(cityId, attempt = 1) {
        const $form = $('#changeCityForm');
        const $cityInput = $form.find('#js_cityIdOnChange');
        if (!$form.length || !$cityInput.length || !$cityInput.attr('name')) {
            throw new Error('IkaEasy resource transport: change city form was not found');
        }

        const data = {};
        $form.serializeArray().forEach((field) => {
            data[field.name] = field.value;
        });
        data[$cityInput.attr('name')] = cityId;
        data.actionRequest = Front.data.actionRequest;
        data.ajax = 1;

        const response = await $.ajax({
            url: $form.attr('action') || '/',
            method: ($form.attr('method') || 'POST').toUpperCase(),
            data: data,
            dataType: 'json'
        });

        this.updateActionRequest(response);
        const switchState = this.getCitySwitchState(response);
        const confirmed = switchState.selectedCityId === cityId;
        if (!confirmed) {
            if (attempt < 3) {
                return this.silentChangeCity(cityId, attempt + 1);
            }
            throw new Error(`IkaEasy resource transport: server did not switch to city ${cityId}`);
        }
        this.updateClientActiveCity(cityId);
    }

    getCitySwitchState(response) {
        if (!Array.isArray(response)) {
            return {};
        }

        const globalData = response.find((command) =>
            Array.isArray(command) && command[0] === 'updateGlobalData' && command[1]
        );
        if (!globalData) {
            return {};
        }

        const data = globalData[1];
        const backgroundCityId = Number(data.backgroundData && data.backgroundData.id);
        const dropdown = data.headerData && data.headerData.cityDropdownMenu;
        const selectedCity = dropdown && dropdown.selectedCity;
        const selectedCityId = Number(dropdown && dropdown.selectedCityId) ||
            (typeof selectedCity === 'string' ? Number(selectedCity.replace('city_', '')) : 0);

        return { backgroundCityId, selectedCityId };
    }

    updateClientActiveCity(cityId) {
        const selectedCity = `city_${cityId}`;
        Front.data.cities.selectedCity = selectedCity;
        Front.data.cities.selectedCityId = cityId;
        $('#js_cityIdOnChange').val(cityId);

        executePageCommand('updateActiveCity', { cityId });
    }

    updateActionRequest(response) {
        if (!Array.isArray(response)) {
            return;
        }

        const globalData = response.find((command) =>
            Array.isArray(command) && command[0] === 'updateGlobalData' && command[1]
        );
        const actionRequest = globalData && globalData[1].actionRequest;
        if (actionRequest) {
            Front.data.actionRequest = actionRequest;
            executePageCommand('setActionRequest', { actionRequest });
        }
    }

    onDestroy() {
        Tooltip.hide();
        this.$parent.off('.empireResourceDragDrop');
    }
}

export default Module;
