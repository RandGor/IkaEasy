'use strict';

import Parent from './dummy.js';
import { Buildings } from '../../../const.js';
import HttpClient from '../../../helper/httpClient.js';
import Storage from '../../../helper/storage.js';
import SyncLock from '../../../helper/syncLock.js';
import { execute_js, getInt } from '../../../utils.js';

const ESPIONAGE_STORAGE_KEY = 'empire_espionage';
const ESPIONAGE_AUTO_SYNC_INTERVAL = 10 * 60 * 1000;

class Module extends Parent {
    constructor(parent) {
        super(parent, 'espionage.ejs');
    }

    afterRender() {
        this.autoSync();
    }

    onRegisterClickHandlers() {
        this.onClick('#empire_espionage_sync', (event) => {
            event.preventDefault();
            this.syncAll(true);
        });

        this.onClick('.empire-espionage-target[data-target-city-id]', (event) => {
            event.preventDefault();
            const $target = $(event.currentTarget);
            this.openSpyMissions(
                parseInt($target.data('source-city-id')),
                parseInt($target.data('target-city-id')),
                parseInt($target.data('position'))
            );
        });
    }

    async autoSync() {
        const state = await Storage.get(ESPIONAGE_STORAGE_KEY);
        const lastUpdate = state && parseInt(state.sync_completed_at || state.update_time) || 0;
        if (lastUpdate + ESPIONAGE_AUTO_SYNC_INTERVAL > Date.now()) {
            return;
        }
        this.syncAll(false);
    }

    async syncAll(force = false) {
        if (this.syncing) {
            return;
        }

        this.syncing = true;
        this.stopDrawTimer();
        this.$parent.find('#empire_espionage_sync').addClass('rotate');

        try {
            const result = await SyncLock.run(ESPIONAGE_STORAGE_KEY, {
                force: force,
                interval: ESPIONAGE_AUTO_SYNC_INTERVAL
            }, async () => {
                const stored = await Storage.get(ESPIONAGE_STORAGE_KEY, true);
                const cities = stored && stored.cities ? { ...stored.cities } : {};

                for (const city of this._cities) {
                    const model = Front.ikaeasyData.getCity(city.id);
                    if (!model || !model.buildings) {
                        continue;
                    }
                    const safehouse = model && model.getBuildingByType(Buildings.HIDEOUT);
                    if (!safehouse) {
                        cities[city.id] = { updatedAt: Date.now(), hasSafehouse: false };
                        continue;
                    }

                    const response = await HttpClient.ikariam('/', {
                        view: 'safehouse',
                        cityId: city.id,
                        position: safehouse.position,
                        backgroundView: 'city',
                        currentCityId: city.id
                    });
                    const espionage = this.parseSafehouseResponse(response);
                    if (!espionage) {
                        throw new Error(`Could not update espionage data for city ${city.id}`);
                    }

                    cities[city.id] = {
                        ...espionage,
                        hasSafehouse: true,
                        level: safehouse.level,
                        position: safehouse.position,
                        updatedAt: Date.now()
                    };
                }

                const latest = await Storage.get(ESPIONAGE_STORAGE_KEY, true) || {};
                const saved = await Storage.set(ESPIONAGE_STORAGE_KEY, { ...latest, cities: cities });
                if (!saved) {
                    throw new Error('Could not save espionage overview data');
                }
            });

            if (result.status === 'completed') {
                await this.draw();
            }
        } catch (error) {
            console.error('IkaEasy espionage overview refresh failed:', error);
        } finally {
            this.syncing = false;
            this.$parent.find('#empire_espionage_sync').removeClass('rotate');
            this.startDrawTimer();
        }
    }

    parseSafehouseResponse(response) {
        const commands = typeof response === 'string' ? JSON.parse(response) : response;
        if (!Array.isArray(commands)) {
            return null;
        }

        const changeView = commands.find((command) =>
            Array.isArray(command) && command[0] === 'changeView' &&
            Array.isArray(command[1]) && command[1][0] === 'safehouse'
        );
        if (!changeView || typeof changeView[1][1] !== 'string') {
            return null;
        }

        const $html = $('<div>').append($.parseHTML(changeView[1][1]));
        const $stats = $html.find('#tabSafehouse .spy_stats_content');
        const $statItems = $stats.find('.disc-list > li');
        if (!$stats.length || $statItems.length < 3) {
            return null;
        }

        const missions = [];
        $html.find('#tabSafehouse .spyinfo').each((index, element) => {
            const $mission = $(element);
            const $target = $mission.find('li.city a').first();
            const targetHref = $target.attr('href') || '';
            const targetIdMatch = targetHref.match(/cityId=([0-9]+)/);
            missions.push({
                targetCityId: targetIdMatch ? parseInt(targetIdMatch[1]) : null,
                targetCity: $target.text().trim(),
                targetPlayer: $mission.find('li.user a').first().text().trim(),
                spies: getInt($mission.find('ul > li').eq(2).text()),
                status: $mission.find('li.status').text().trim()
            });
        });

        return {
            capacity: getInt($stats.children('b').first().text()),
            defending: getInt($statItems.eq(1).text()),
            assigned: getInt($statItems.eq(2).text()),
            missions: missions
        };
    }

    async getRenderData(callback) {
        const state = await Storage.get(ESPIONAGE_STORAGE_KEY) || {};
        const storedCities = state.cities || {};
        const rows = this._cities.map((city) => {
            const model = Front.ikaeasyData.getCity(city.id);
            const safehouse = model && model.getBuildingByType(Buildings.HIDEOUT);
            const stored = storedCities[city.id] || null;

            return {
                id: city.id,
                name: city.name,
                coords: city.coords,
                tradegood: city.tradegood,
                level: safehouse ? safehouse.level : 0,
                hasSafehouse: model && model.buildings ? !!safehouse : null,
                data: stored && stored.hasSafehouse ? stored : null
            };
        });

        await callback({ rows: rows, selectedCityId: this._data.cities.selectedCityId });
    }

    async openSpyMissions(sourceCityId, targetCityId, position) {
        if (this.spyMissionsOpening || !sourceCityId || !targetCityId || isNaN(position)) {
            return;
        }

        this.spyMissionsOpening = true;
        this.$parent.addClass('empire-espionage-switching-city');

        try {
            await this.silentChangeCity(sourceCityId);
            this.parent.close();

            const query = `/index.php?view=spyMissions&targetCityId=${targetCityId}` +
                `&position=${position}&currentCityId=${sourceCityId}` +
                `&actionRequest=${encodeURIComponent(Front.data.actionRequest)}&ajax=1`;
            execute_js(`
                $.ajax({
                    url: ${JSON.stringify(query)},
                    method: 'GET',
                    dataType: 'text'
                }).done(function(response) {
                    ajax.Responder.parseResponse(response);
                }).fail(function(request, status, error) {
                    console.error('IkaEasy spy mission request failed', status, error);
                });
            `);
        } catch (error) {
            console.error('IkaEasy espionage overview: could not switch source city', error);
        } finally {
            this.spyMissionsOpening = false;
            this.$parent.removeClass('empire-espionage-switching-city');
        }
    }

    async silentChangeCity(cityId) {
        const $form = $('#changeCityForm');
        const $cityInput = $form.find('#js_cityIdOnChange');
        if (!$form.length || !$cityInput.length || !$cityInput.attr('name')) {
            throw new Error('IkaEasy espionage overview: change city form was not found');
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

        execute_js(`
            if (ikariam.model.relatedCityData) {
                ikariam.model.relatedCityData.selectedCity = ${JSON.stringify(selectedCity)};
                ikariam.model.relatedCityData.selectedCityId = ${cityId};
            }
            if (ikariam.model.headerData && ikariam.model.headerData.cityDropdownMenu) {
                ikariam.model.headerData.cityDropdownMenu.selectedCity = ${JSON.stringify(selectedCity)};
                ikariam.model.headerData.cityDropdownMenu.selectedCityId = ${cityId};
            }
            var ikaeasyCityInput = document.getElementById('js_cityIdOnChange');
            if (ikaeasyCityInput) {
                ikaeasyCityInput.value = ${cityId};
            }
        `);
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
            execute_js(`ikariam.model.actionRequest=${JSON.stringify(actionRequest)};`);
        }
    }
}

export default Module;
