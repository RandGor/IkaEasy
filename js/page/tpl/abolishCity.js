import Parent from './dummy.js';import {executePageCommand} from '../../utils.js';

class Page extends Parent {

    init() {
        this.checkAllow();
    }

    checkAllow() {
        if (!this.options.get('prevent_accidental_colony_destruction', true)) {
            return;
        }

        let cityId = this.getCityId();
        let palace = _.find(this._data.city.position, (v) => {
            if (v.name) {
                let building = v.building.replace('constructionSite', '').trim();
                if (['palace', 'palaceColony'].indexOf(building) > -1) {
                    return true;
                }
            }
        });

        if (palace) {
            executePageCommand('destroyTemplateAndShowTip', {
                text: LANGUAGE.getLocalizedString('alert.destroy_non_mobile_colony_prompt')
            });
        }
    }

}

export default Page;
