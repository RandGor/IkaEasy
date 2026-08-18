import Parent from './dummy.js';
import Tooltip from '../../../helper/tooltip.js';
import Storage from '../../../helper/storage.js';
import SyncLock from '../../../helper/syncLock.js';

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
            manager: Front.ikaeasyData
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
        if (this.syncing) {
            return;
        }

        const lastUpdateStorage = await Storage.get(RESOURCE_SYNC_STORAGE_KEY);
        const nowTime = _.now();
        const oneMinute = 1 * 60000;
        let syncInterval = RESOURCE_AUTO_SYNC_INTERVAL;
        if(lastUpdateStorage && !force){
            const lastUpdate = parseInt(lastUpdateStorage.sync_completed_at || lastUpdateStorage.update_time) || 0;
            if(this.firstRender){
                this.firstRender = false;
                syncInterval = oneMinute;
                if(lastUpdate + oneMinute > nowTime){ return; }
            }else{
                if(lastUpdate + RESOURCE_AUTO_SYNC_INTERVAL > nowTime){ return;}
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
        } catch (error) {
            console.error('IkaEasy empire resources refresh failed:', error);
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
    }

    onDestroy() {
        Tooltip.hide();
    }
}

export default Module;
