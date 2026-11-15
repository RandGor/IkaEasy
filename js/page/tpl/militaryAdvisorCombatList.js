import Parent from './dummy.js';
import { getItem } from '../../utils.js';

class Page extends Parent {

    init() {
        this.ikariamPremiumToggle([$('#militaryAdvisor .premiumAccount').closest('.contentBox01h')]);

        this.addIkalogIcons();
    }

    addIkalogIcons() {
        const $combatList = $('#combatList');
        if ($combatList.data('updated')) {
            return;
        }

        const battles = getItem('battles') || {};

        _.each($combatList.find('tbody tr'), (row) => {
            const $tr = $(row);
            const $td = $tr.find('.subject').first();
            const onclick = $td.attr('onclick');
            const match = onclick && onclick.match(/combatId=([0-9]+)/);

            // Some rows do not represent combat reports.
            if (!match) {
                return;
            }

            const repId = match[1];
            const battle = battles[repId];
            if (!battle || !battle.ikalogs || $td.find('.ikaeasy_icon_ikalogs').length) {
                return;
            }

            const repDate = $tr.find('.date').text().trim();
            const $link = $('<a>', {
                href: battle.ikalogs,
                target: '_blank',
                rel: 'noopener noreferrer',
                class: 'ikaeasy_icon_ikalogs'
            });
            if (repDate !== battle.date) {
                $link.addClass('ikaeasy_icon_ikalogs_old');
            }
            $td.prepend($link);
        });

        $combatList.data('updated', true);
    }
}

export default Page;
