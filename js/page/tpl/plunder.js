import Parent from './dummy.js';
import { getInt } from '../../utils.js';
import {
    consumeBarbarianLoot,
    getTransportShipCapacity,
    getTransportShipsRequired
} from '../../helper/transportShips.js';

class Page extends Parent {

    init() {
        if ($('#ikaeasy_max_ships').length) {
            return;
        }

        this.prefillBarbarianCargoShips();

        let $el = $('<div class="ikaeasy_max_btn" id="ikaeasy_max_ships"></div>');
        $('#plusminus').append($el);

        $el.click(() => {
            const remainingShips = getInt($('#transporterCount').text());
            this.setCargoShips($('#extraTransporter'), this._data.ships - remainingShips);
        });

        this.addButtons();
    }

    prefillBarbarianCargoShips() {
        const loot = consumeBarbarianLoot();
        if (!loot || !this.options.get('barbarian_auto_select_cargo_ships', true)) {
            return;
        }

        const $input = $('#extraTransporter');
        if (!$input.length) {
            return;
        }

        const availableShips = getInt($('#transporterCount').text()) || this._data.ships || 0;
        const capacity = getTransportShipCapacity();
        const requiredShips = getTransportShipsRequired(loot);
        const selectedShips = availableShips > 0 ? Math.min(requiredShips, availableShips) : requiredShips;

        this.setCargoShips($input, selectedShips);
        $('#totalFreight').text(selectedShips * capacity);
    }

    setCargoShips($input, count) {
        count = Math.max(0, parseInt(count) || 0);
        $input.val(count);
        $('#totalFreight').text(count * getTransportShipCapacity());
    }

    addButtons() {
        if (!this.options.get('units_to_ship', true)) {
            return;
        }

        if ($('#ikaeasy_attack_btns_div').length) {
            return;
        }

        let $allBtnDiv = $('<div class="ikaeasy_attack_btns_div ikaeasy-fix-button" id="ikaeasy_attack_btns_div"></div>');

        $allBtnDiv.append(this._nothingButton());
        $allBtnDiv.append(this._halfButton());
        $allBtnDiv.append(this._allButton());

        $allBtnDiv.insertBefore('div.newSummary');
    }

    _allButton() {
        let $allBtn = $(`<a class="button">${LANGUAGE.getLocalizedString('attack_btn_all')}</a>`);
        $allBtn.click(() => {
            _.each($('ul.assignUnits li'), (el) => {
                let $el = $(el);
                let count = getInt($('.amount', $el).text());
                $('input.textfield', $el).val(count).click();
            });
        });

        return $allBtn;
    }

    _halfButton() {
        //Half button
        let $halfBtn = $(`<a class="button">${LANGUAGE.getLocalizedString('attack_btn_half')}</a>`);
        $halfBtn.click(() => {
            _.each($('ul.assignUnits li'), (el) => {
                let $el = $(el);
                let count = getInt($('.amount', $el).text());
                $('input.textfield', $el).val(Math.floor(count / 2)).click();
            });
        });

        return $halfBtn;
    }

    _nothingButton() {
        //Half button
        let $nothingBtn = $(`<a class="button">${LANGUAGE.getLocalizedString('attack_btn_nope')}</a>`);
        $nothingBtn.click(() => {
            _.each($('ul.assignUnits li'), (el) => {
                let $el = $(el);
                $('input.textfield', $el).val('0').click();
            });
        });

        return $nothingBtn;
    }

}

export default Page;
