import Parent from './dummy.js';

class Page extends Parent {
    init() {
        const $shipsTab = $('#tabShips');
        if ($shipsTab.length) {
            this._ieData.getUpgrades().updateFromWorkshop($shipsTab);
        }
    }
}

export default Page;