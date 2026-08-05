import Parent from './dummy.js';
import {
    clearBarbarianLoot,
    getTransportShipsRequired,
    rememberBarbarianLoot
} from '../../helper/transportShips.js';

class Page extends Parent {

    async init() {
        let list = ['resource', 'tradegood1', 'tradegood2', 'tradegood3', 'tradegood4'];
        let sum = 0;
        _.each(list, (v) => {
            sum += this.getGoods(v);
        });

        const ships = getTransportShipsRequired(sum);
        rememberBarbarianLoot(sum);
        const tpl = await this.render('barbarianVillage', {sum: sum, ships: ships});
        $('.barbarianCityKingSpeech').html(tpl);
    }

    destroy() {
        // Keep the value only for the raid form opened directly from this view.
        if (Front.tpl !== 'plunder') {
            clearBarbarianLoot();
        }
    }

    getGoods(id) {
        return parseInt($(`#js_islandBarbarianResource${id}`).html().replace(/[^0-9]+/g, ''));
    }

}

export default Page;
