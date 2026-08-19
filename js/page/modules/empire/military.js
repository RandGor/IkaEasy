'use strict';

import Parent from './dummy.js';
import { Military, UnitIds } from '../../../const.js';
import HttpClient from '../../../helper/httpClient.js';
import Storage from '../../../helper/storage.js';
import SyncLock from '../../../helper/syncLock.js';
import { executePageCommand, getInt } from '../../../utils.js';

const UNIT_IDS = Object.fromEntries(
    Object.entries(UnitIds).map(([id, type]) => [type, id])
);

const ARMY = [
    Military.HOPLITE,
    Military.STEAM_GIANT,
    Military.SPEARMAN,
    Military.SWORDSMAN,
    Military.SLINGER,
    Military.ARCHER,
    Military.GUNNER,
    Military.BATTERING_RAM,
    Military.CATAPULT,
    Military.MORTAR,
    Military.GYROCOPTER,
    Military.BALLOON_BOMBADIER,
    Military.COOK,
    Military.DOCTOR,
    Military.SPARTAN
];

const NAVY = [
    Military.FLAME_THROWER,
    Military.STEAM_RAM,
    Military.RAM_SHIP,
    Military.BALLISTA_SHIP,
    Military.CATAPULT_SHIP,
    Military.MORTAR_SHIP,
    Military.ROCKET_SHIP,
    Military.SUBMARINE,
    Military.PADDLE_SPEED_SHIP,
    Military.BALLOON_CARRIER,
    Military.TENDER
];

const ARMY_COLUMNS = [
    [Military.HOPLITE, 1],
    [Military.STEAM_GIANT, 2],
    [Military.SPEARMAN, 3],
    [Military.SWORDSMAN, 4],
    [Military.SLINGER, 5],
    [Military.ARCHER, 6],
    [Military.GUNNER, 7],
    [Military.BATTERING_RAM, 8],
    [Military.CATAPULT, 10],
    [Military.MORTAR, 11],
    [Military.GYROCOPTER, 12],
    [Military.BALLOON_BOMBADIER, 13],
    [Military.COOK, 14],
    [Military.DOCTOR, 15],
    [Military.SPARTAN, 16]
];

const NAVY_COLUMNS = [
    [Military.FLAME_THROWER, 1],
    [Military.STEAM_RAM, 2],
    [Military.RAM_SHIP, 3],
    [Military.BALLISTA_SHIP, 4],
    [Military.CATAPULT_SHIP, 5],
    [Military.MORTAR_SHIP, 6],
    [Military.ROCKET_SHIP, 7],
    [Military.SUBMARINE, 8],
    [Military.PADDLE_SPEED_SHIP, 10],
    [Military.BALLOON_CARRIER, 11],
    [Military.TENDER, 12]
];

const MILITARY_SYNC_STORAGE_KEY = 'empire_military';
const MILITARY_AUTO_SYNC_INTERVAL = 10 * 60 * 1000;

class Module extends Parent {
    constructor(parent) {
        super(parent, 'military.ejs');
    }

    afterRender() {
        this.autoSync();
    }

    onRegisterClickHandlers() {
        this.onClick('#empire_military_sync', (event) => {
            event.preventDefault();
            this.syncAll(true);
        });

        if (this.options.get('empire_military_drag_drop', true)) {
            this.registerDeploymentDragDrop();
        }
    }

    registerDeploymentDragDrop() {
        this.$parent
            .off('.empireMilitaryDragDrop')
            .on('dragstart.empireMilitaryDragDrop', '.empire-military-city[draggable="true"]', (event) => {
                const $source = $(event.currentTarget);
                const payload = {
                    sourceCityId: parseInt($source.data('city-id')),
                    deploymentType: $source.data('deployment-type')
                };

                this.draggedDeployment = payload;
                event.originalEvent.dataTransfer.effectAllowed = 'move';
                event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(payload));
                $source.closest('tr').addClass('empire-military-dragging');
            })
            .on('dragend.empireMilitaryDragDrop', '.empire-military-city[draggable="true"]', () => {
                this.clearDeploymentDragState();
            })
            .on('dragover.empireMilitaryDragDrop', '.empire-military-city[data-city-id]', (event) => {
                const payload = this.draggedDeployment;
                const $target = $(event.currentTarget);
                const targetCityId = parseInt($target.data('city-id'));
                if (!payload || payload.sourceCityId === targetCityId ||
                    payload.deploymentType !== $target.data('deployment-type')) {
                    return;
                }

                event.preventDefault();
                event.originalEvent.dataTransfer.dropEffect = 'move';
                $target.addClass('empire-military-drop-target');
            })
            .on('dragleave.empireMilitaryDragDrop', '.empire-military-city[data-city-id]', (event) => {
                $(event.currentTarget).removeClass('empire-military-drop-target');
            })
            .on('drop.empireMilitaryDragDrop', '.empire-military-city[data-city-id]', (event) => {
                event.preventDefault();
                const $target = $(event.currentTarget);
                const targetCityId = parseInt($target.data('city-id'));
                const payload = this.readDeploymentDragPayload(event.originalEvent);
                this.clearDeploymentDragState();

                if (!payload || payload.sourceCityId === targetCityId ||
                    payload.deploymentType !== $target.data('deployment-type')) {
                    return;
                }

                this.openDeployment(payload.sourceCityId, targetCityId, payload.deploymentType);
            });
    }

    readDeploymentDragPayload(event) {
        if (this.draggedDeployment) {
            return this.draggedDeployment;
        }

        try {
            return JSON.parse(event.dataTransfer.getData('text/plain'));
        } catch (error) {
            return null;
        }
    }

    clearDeploymentDragState() {
        this.draggedDeployment = null;
        this.$parent.find('.empire-military-dragging').removeClass('empire-military-dragging');
        this.$parent.find('.empire-military-drop-target').removeClass('empire-military-drop-target');
    }

    async openDeployment(sourceCityId, targetCityId, deploymentType) {
        if (this.deploymentOpening || !['army', 'fleet'].includes(deploymentType)) {
            return;
        }

        this.deploymentOpening = true;
        this.$parent.addClass('empire-military-switching-city');

        try {
            await this.silentChangeCity(sourceCityId);

            this.parent.close();
            const query = `/index.php?view=deployment&deploymentType=${deploymentType}` +
                `&destinationCityId=${targetCityId}&currentCityId=${sourceCityId}` +
                `&actionRequest=${encodeURIComponent(Front.data.actionRequest)}&ajax=1`;
            this.openDeploymentResponse(query);
        } catch (error) {
            console.error('IkaEasy military deployment: could not switch source city', error);
        } finally {
            this.deploymentOpening = false;
            this.$parent.removeClass('empire-military-switching-city');
        }
    }

    openDeploymentResponse(query) {
        executePageCommand('openAjaxResponse', {
            url: query,
            errorMessage: 'IkaEasy military deployment request failed'
        });
    }

    async silentChangeCity(cityId) {
        const $form = $('#changeCityForm');
        const $cityInput = $form.find('#js_cityIdOnChange');
        if (!$form.length || !$cityInput.length || !$cityInput.attr('name')) {
            throw new Error('IkaEasy military deployment: change city form was not found');
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
        this.updateClientActiveCity(cityId);
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

    async autoSync() {
        if (this.syncing) {
            return;
        }

        const state = await Storage.get(MILITARY_SYNC_STORAGE_KEY);
        const lastUpdate = state && parseInt(state.sync_completed_at || state.update_time) || 0;
        if (lastUpdate + MILITARY_AUTO_SYNC_INTERVAL > Date.now()) {
            return;
        }

        this.syncAll(false);
    }

    async syncAll(force = false) {
        if (this.syncing) {
            return;
        }

        this.syncing = true;
        this.$parent.find('#empire_military_sync').addClass('rotate');

        try {
            const result = await SyncLock.run(MILITARY_SYNC_STORAGE_KEY, {
                force: force,
                interval: MILITARY_AUTO_SYNC_INTERVAL
            }, async () => {
                for (const city of this._cities) {
                    const response = await HttpClient.ikariam('/', {
                        view: 'cityMilitary',
                        cityId: city.id,
                        backgroundView: 'city',
                        currentCityId: city.id
                    });
                    if (!this.updateCityFromResponse(city.id, response)) {
                        throw new Error(`Could not update military data for city ${city.id}`);
                    }
                }
            });

            if (result.status === 'completed') {
                await this.draw();
            }
        } catch (error) {
            console.error('IkaEasy military overview refresh failed:', error);
        } finally {
            this.syncing = false;
            this.$parent.find('#empire_military_sync').removeClass('rotate');
        }
    }

    updateCityFromResponse(cityId, response) {
        const commands = typeof response === 'string' ? JSON.parse(response) : response;
        if (!Array.isArray(commands)) {
            return false;
        }

        const globalData = commands.find((command) =>
            Array.isArray(command) && command[0] === 'updateGlobalData' && command[1]
        );
        if (globalData && globalData[1].actionRequest) {
            Front.data.actionRequest = globalData[1].actionRequest;
        }

        const changeView = commands.find((command) =>
            Array.isArray(command) && command[0] === 'changeView' &&
            Array.isArray(command[1]) && command[1][0] === 'cityMilitary'
        );
        if (!changeView || typeof changeView[1][1] !== 'string') {
            return false;
        }

        const $html = $('<div>').append($.parseHTML(changeView[1][1]));
        const $armyCells = $html.find('#tabUnits .militaryList .count td');
        const $navyCells = $html.find('#tabShips .militaryList .count td');
        if (!$armyCells.length && !$navyCells.length) {
            return false;
        }

        const military = Front.ikaeasyData.getCity(cityId).military;
        this.updateCounts(military, $armyCells, ARMY_COLUMNS, 'units');
        this.updateCounts(military, $navyCells, NAVY_COLUMNS, 'ships');
        return true;
    }

    updateCounts(military, $cells, columns, sectionType) {
        if (!$cells.length) {
            return;
        }

        columns.forEach(([type, index]) => {
            military.setCount(type, getInt($cells.eq(index).text()));
        });
        military.markUpdated(sectionType);
    }

    async getRenderData(callback) {
        const rows = this._cities.map((city) => {
            const model = Front.ikaeasyData.getCity(city.id);
            const military = model && model.military;
            const units = military && military.units ? military.units : {};
            const unitTypes = Object.keys(units);

            return {
                id: city.id,
                name: city.name,
                coords: city.coords,
                tradegood: city.tradegood,
                units: units,
                hasData: {
                    units: !!(military && military.updatedAt && military.updatedAt.units) ||
                        unitTypes.some((type) => !type.startsWith('ship_')),
                    ships: !!(military && military.updatedAt && military.updatedAt.ships) ||
                        unitTypes.some((type) => type.startsWith('ship_'))
                }
            };
        });

        const createSection = (type, units) => {
            const totals = {};
            units.forEach((unit) => {
                totals[unit] = rows.reduce((sum, row) => sum + (parseInt(row.units[unit]) || 0), 0);
            });

            const visibleUnits = units.filter((unit) => {
                if (totals[unit] > 0) {
                    return true;
                }

                return false;
            });

            return {
                type: type,
                title: LANGUAGE.getLocalizedString(`empire.military_${type}`),
                iconClass: type === 'ships' ? 'fleet' : 'army',
                units: visibleUnits.map((unit) => ({
                    type: unit,
                    id: UNIT_IDS[unit],
                    label: this.unitLabel(unit),
                    total: totals[unit]
                }))
            };
        };

        await callback({
            rows: rows,
            selectedCityId: this._data.cities.selectedCityId,
            sections: [createSection('units', ARMY), createSection('ships', NAVY)],
            dragDropEnabled: this.options.get('empire_military_drag_drop', true)
        });
    }

    unitLabel(type) {
        return LANGUAGE.getLocalizedString(`empire.unit_${type}`);
    }

    onDestroy() {
        this.$parent.off('.empireMilitaryDragDrop');
    }

}

export default Module;
