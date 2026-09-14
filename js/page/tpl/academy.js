import Parent from './dummy.js';
import { getFloat } from '../../utils.js';
import AcademyPayback from '../modules/academyPayback.js';

class Page extends Parent {

    init() {
        const scientists = getFloat($('#js_academy_research_tooltip_basic_production').text());
        if (Number.isFinite(scientists) && scientists >= 0) {
            this._city.set('scientists', Math.floor(scientists));
        }
        this.ikariamPremiumToggle(['.experiment:eq(1)']);
        const host = document.getElementById('academy');
        if (!host || !this.options.get('academy_payback')) {
            this.destroy();
            return;
        }
        let edited;
        if (this.payback && (this.payback.host !== host || this.payback.cityId !== this._city.id ||
            (this.payback.element && !this.payback.element.isConnected))) {
            if (this.payback.cityId === this._city.id) {
                edited = this.payback.getEditedInputs();
            }
            this.destroy();
        }
        if (!this.payback) {
            this.payback = new AcademyPayback(host, this._city, edited);
        } else {
            this.payback.update(this._city);
        }
    }

    destroy() {
        this.payback?.destroy();
        this.payback = null;
    }

}

export default Page;
