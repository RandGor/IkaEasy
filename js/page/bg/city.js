import Db from '../../helper/db.js';
import BuildingUpgrade from '../../helper/buildingUpgrade.js';
import Parent from './dummy.js';
import { executePageCommand, setItem } from '../../utils.js';

class City extends Parent {
    init() {
        if ((!this.buildings) || (this.buildings.cityId !== this.getCityId())) {

        }

        this.premium();
        this.updateBuilds();
        this.watcher();
        this.freeBuildingSpeedup();
    }

    freeBuildingSpeedup() {
        if (!this.options.get('one_click_free_building_speedup') || this._freeSpeedupObserver) {
            return;
        }

        this._freeSpeedup = null;
        this._freeSpeedupClickHandler = (event) => {
            const button = event.target.closest('.buildingSpeedupButton.free');
            if (!button || this._freeSpeedup) {
                return;
            }

            const cityButtonMatch = /^js_CityPosition(\d+)SpeedupButton$/.exec(button.id);
            const action = [
                button.getAttribute('onclick'),
                button.getAttribute('href'),
                button.closest('a')?.getAttribute('href')
            ].filter(Boolean).join('&');
            const actionPosition = /[?&]position=(\d+)/.exec(action);
            const position = Number(actionPosition?.[1] || cityButtonMatch?.[1]);
            const buildingLink = Number.isInteger(position) &&
                document.getElementById(`js_CityPosition${position}Link`);
            const linkCity = buildingLink && /[?&]cityId=(\d+)/.exec(buildingLink.getAttribute('href') || '');
            const actionCity = /[?&]cityId=(\d+)/.exec(action);
            const cityId = Number(actionCity?.[1] || linkCity?.[1]);
            if (!Number.isInteger(position) || cityId !== this.getCityId()) {
                return;
            }

            this._freeSpeedup = {
                cityId,
                position,
                remaining: 2,
                confirming: false
            };
        };
        document.addEventListener('click', this._freeSpeedupClickHandler, true);

        this._freeSpeedupObserver = new MutationObserver(() => this.confirmFreeBuildingSpeedup());
        this._freeSpeedupObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    confirmFreeBuildingSpeedup() {
        const speedup = this._freeSpeedup;
        const activate = document.getElementById('js_buildingSpeedupActivateBtn');
        if (!speedup || speedup.confirming || !activate) {
            return;
        }

        const cost = activate.querySelector('.ambrosiaIcon')?.textContent.trim();
        const href = activate.getAttribute('href');
        const url = href && new URL(href, window.location.origin);
        const isFreeBuildingSpeedup = cost === '0' && url.origin === window.location.origin &&
            url.searchParams.get('action') === 'Premium' &&
            url.searchParams.get('function') === 'buildingSpeedup' &&
            Number(url.searchParams.get('cityId')) === speedup.cityId &&
            Number(url.searchParams.get('position')) === speedup.position;

        if (!isFreeBuildingSpeedup || speedup.remaining <= 0) {
            this._freeSpeedup = null;
            return;
        }

        speedup.remaining -= 1;
        speedup.confirming = true;
        executePageCommand('ajaxHandlerCall', { url: href });

        setTimeout(() => {
            if (this._freeSpeedup !== speedup) {
                return;
            }

            const button = document.querySelector(
                `.buildingSpeedupButton.free[id="js_CityPosition${speedup.position}SpeedupButton"], ` +
                `.buildingSpeedupButton.free[onclick*="position=${speedup.position}"]`
            );
            speedup.confirming = false;
            if (button?.classList.contains('free') && speedup.remaining > 0) {
                button.click();
            } else {
                this._freeSpeedup = null;
            }
        }, 2500);
    }

    async premium() {
        return;
    }

    premiumUpdated() {
        this.premium();
    }

    getCityId() {
        return parseInt(this._data.city.id);
    }

    getBuildLevel(name) {
        if (!this._builds[name]) {
            return 0;
        }

        return this._builds[name][0].level || 0;
    }

    updateBuilds() {
        this._builds = this._city.buildings;

        if ((this._city.isOwn) && (this._builds['embassy'])) {
            let b = this._builds['embassy'][0];
            let emb = { title: b.name, pos_id: b.position, city_id: this.getCityId() };
            setItem('embassy', emb);
        }
    }

    async watcher() {
        this.__watcher_is_updating = true;
        this._fillWatcherMinus();

        $('#ikaeasy_builds').remove();

        if (!this.options.get('city_details', true)) {
            console.log('watcher return');
            return;
        }

        const db = Db.db();
        let $worldmap = $('#worldmap');
        let $parent = $('<div id="ikaeasy_builds"></div>');
        let location = $('#locations');
        $worldmap.append($parent);

        $parent.css({
            top: $(location).css('top'),
            left: $(location).css('left'),
            width: $(location).width(),
            height: $(location).height()
        });

        const buildKeys = Object.keys(this._builds);
        for(let i = 0; i < buildKeys.length; i++) {
            const name = buildKeys[i];
            const builds = this._builds[name];

            for(let j = 0; j < builds.length; j++) {
                const build = builds[j];

                if (typeof build.level === "undefined") {
                    return;
                }

                let b_coord = (build.completed) ? db.pos.constructionSite : db.pos[name];
                if (!b_coord) {
                    console.warn(`IKAEASY: Unknown building ${name}`);
                    continue;
                }
                let $position = $(`#position${build.position}`);

                // Создаем у каждого здания табличку для уровня, а так же блок с ресами
                const tpl = await this.render('city-buildingInfo', { build });
                let $block = $(tpl);
                $block.css({
                    left: parseInt($position.css('left')) + b_coord[0].x,
                    top: parseInt($position.css('top')) + b_coord[0].y
                });

                $parent.append($block);

                if (!this._city.isOwn) {
                    $(`#ikaeasy_watcher_${build.position}`).attr('class', 'ikaeasy_watcher build_gray');
                    $(`#ikaeasy_watcher_${build.position} .ikaeasy_watcher_buttons`).remove();
                }
            }
        }

        if (!this.options.get('city_building_tooltip')) {
            $parent.addClass('ikaeasy_watcher_no_tooltip');
        }

        this.__watcher_is_updating = false;
        this.updateWatcher();
    }

    updateWatcher() {
        if ((!this._city.isOwn) || (this.__watcher_is_updating)) {
            return;
        }

        if (!this.options.get('city_details', true)) {
            return;
        }

        this.__watcher_is_updating = true;

        this.updateBuilds();
        const db = Db.db();

        // Узнаем кол-во ресурсов в городе
        let sourceOnCity = this._city.resources;
        let production = this._city.production;

        // Проверяем, нет ли строящихся зданий?
        let bb_icon = ($('#locations .constructionSite').length > 0) ? 'build_blue' : 'build_green';

        _.each(this._builds, (builds, name) => {
            _.each(builds, async (build) => {
                if (typeof build.level === "undefined") {
                    return;
                }

                let $block = $(`#ikaeasy_watcher_${build.position}`);
                let b_source = db.source[name];
                let b_coord = db.pos[name];
                let b_lvl = parseInt(build.level);

                if ((!b_coord) || (!b_source)) {
                    console.warn(`IKAEASY: Unknown building ${name}`);
                    return;
                }

                if (build.completed) {
                    b_coord = db.pos.constructionSite;
                    b_lvl++;
                }

                const $tooltip = $('.ikaeasy_watcher_tooltip', $block);

                let sources_ok = true;
                let class_icon = 'build_red';

                if (b_source[b_lvl]) {
                    const resourcesTypesCount = Object.values(b_source[b_lvl]).length;
                    let enoughPercent = 0;
                    let tooltipData = [];
                    _.each(b_source[b_lvl], (v, k) => {
                        if (v === 0) {
                            return;
                        }

                        let cost = Math.floor(v * this.__watcher_minus[k]);
                        const currentRes = sourceOnCity[k];
                        let need = currentRes - cost;
                        const percentAdded= currentRes < cost ? currentRes / cost * 100 : 100;
                        enoughPercent += percentAdded / resourcesTypesCount;
                        tooltipData.push({
                            resource: k,
                            cost: cost,
                            need: need,
                            production: (need >= 0) ? 0 : production[k]
                        });

                        if (need < 0) {
                            sources_ok = false;
                        }
                    });

                    if (this.options.get('city_building_tooltip')) {
                        const tpl = await this.render('city-watcherTooltip', {
                            list: tooltipData,
                            ok: sources_ok,
                            build: build
                        });

                        let $line = $(tpl);
                        $tooltip.empty().append($line);
                    }

                    if (sources_ok) {
                        class_icon = (build.completed) ? 'build_gray' : bb_icon;
                    }

                    if (enoughPercent < 100 && enoughPercent > 0){
                        const circumference = 81.6814;
                        const progressStroke = circumference - enoughPercent / 100 * circumference;
                        $('.ikaeasy_watcher_circle-progress__circle', $block)
                          .attr('style',`stroke-dashoffset: ${progressStroke}`)
                          .addClass("ikaeasy_watcher_circle-progress-active");
                    }
                } else {
                    class_icon = 'build_gray';
                }

                if (build.completed) {
                    b_coord = db.pos.constructionSite;
                    let $position = $(`#position${build.position}`);
                    $block.css({
                        left: parseInt($position.css('left')) + b_coord[0].x,
                        top: parseInt($position.css('top')) + b_coord[0].y
                    });

                    class_icon += ' ikaeasy_watcher_construction';
                }
                // progress bar inspired by:
                // @link https://css-tricks.com/building-progress-ring-quickly/
                $(`#ikaeasy_watcher_${build.position}`).attr('class', `ikaeasy_watcher ${class_icon}`).show();
                $block.off('click.ikaeasy-watcher');
                $block.on('click.ikaeasy-watcher', '.watche_down', (e) => {
                    if ($(e.currentTarget).css('cursor') === 'default') {
                        return;
                    }

                    executePageCommand('confirmBuildingDemolition', {
                        text: LANGUAGE.getLocalizedString('city_confirm_downgrade'),
                        url: `/index.php?action=CityScreen&function=demolishBuilding&actionRequest=${this._data.actionRequest}&currentCityId=${this.getCityId()}&cityId=${this.getCityId()}&position=${build.position}&level=${build.level}&backgroundView=city`
                    });
                });

                $block.on('click.ikaeasy-watcher', '.watche_up', async (e) => {
                    if ($(e.currentTarget).css('cursor') === 'default') {
                        return;
                    }

                    const cityId = this.getCityId();

                    try {
                        let upgradeUrl = $block.data('ikaeasy-upgrade-url');
                        if (!upgradeUrl) {
                            const upgrade = await BuildingUpgrade.get(cityId, build);
                            if (!upgrade || !upgrade.url || !$block.closest('html').length ||
                                this.getCityId() !== cityId) {
                                return;
                            }

                            upgradeUrl = upgrade.url;
                            $block.data('ikaeasy-upgrade-url', upgradeUrl);
                        }

                        executePageCommand('ajaxHandlerCall', { url: upgradeUrl });
                    } catch (error) {
                        console.warn('IkaEasy building upgrade request failed:', error);
                    }
                });

                $block.on('click.ikaeasy-watcher', '.ikaeasy_watcher_title', () => {
                    this.openBuilding({
                        cityId: this.getCityId(),
                        building: build.building,
                        position: build.position
                    });
                });
            });
        });

        this.__watcher_is_updating = false;
    }

    async updateBuildingUpgradeData($block, build) {
        try {
            const upgrade = await BuildingUpgrade.get(this.getCityId(), build);
            if (!upgrade || !$block.closest('html').length) {
                return;
            }

            if (upgrade.url) {
                $block.data('ikaeasy-upgrade-url', upgrade.url);
            } else {
                $block.removeData('ikaeasy-upgrade-url');
            }

            const resources = this._city.resources;
            const production = this._city.production;
            let sourcesOk = true;
            const tooltipData = Object.keys(upgrade.costs).map((resource) => {
                const cost = upgrade.costs[resource];
                const need = (resources[resource] || 0) - cost;
                if (need < 0) {
                    sourcesOk = false;
                }

                return {
                    resource: resource,
                    cost: cost,
                    need: need,
                    production: need >= 0 ? 0 : production[resource]
                };
            });

            if (this.options.get('city_building_tooltip')) {
                const tpl = await this.render('city-watcherTooltip', {
                    list: tooltipData,
                    ok: sourcesOk,
                    build: build
                });
                $('.ikaeasy_watcher_tooltip', $block).empty().append($(tpl));
            }

            let classIcon = 'build_gray';
            if (!build.completed && upgrade.url) {
                if (!sourcesOk) {
                    classIcon = 'build_red';
                } else {
                    classIcon = ($('#locations .constructionSite').length > 0)
                        ? 'build_blue'
                        : 'build_green';
                }
            }

            if (build.completed) {
                classIcon += ' ikaeasy_watcher_construction';
            }

            $block.attr('class', `ikaeasy_watcher ${classIcon}`).show();
        } catch (error) {
            console.warn('IkaEasy building upgrade data request failed:', error);
        }
    }

    _fillWatcherMinus() {
        this.__watcher_minus = this._city.getBuildingsCostDiscount();
    }

    destroy() {
        document.removeEventListener('click', this._freeSpeedupClickHandler, true);
        this._freeSpeedupClickHandler = null;
        this._freeSpeedupObserver?.disconnect();
        this._freeSpeedupObserver = null;
        this._freeSpeedup = null;
    }
}

export default City;
