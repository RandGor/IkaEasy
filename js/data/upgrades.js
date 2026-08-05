class UpgradesModule {
    constructor() {
        this._data = {};
    }

    updateData(data) {
        this._data = data || {};
    }

    updateFromWorkshop($root) {
        let changed = false;

        $root.find('a[href*="StartWorkshopUpgrade"][href*="upgradeType=cargo"]').each((index, element) => {
            const $link = $(element);
            const href = $link.attr('href') || '';
            const unitIdMatch = href.match(/[?&]unitId=(\d+)/);
            const upgradeTypeMatch = href.match(/[?&]upgradeType=([^&]+)/);
            if (!unitIdMatch || !upgradeTypeMatch) {
                return;
            }

            const $upgrade = $link.closest('.highlightbox');
            const description = $upgrade.find('.upgrade_desc').first().text();
            const effect = $upgrade.find('.upgrade_desc .smallFont').first().text();
            const nextLevelMatch = description.match(/\((\d+)\)/);
            const bonusMatch = effect.match(/([+-]?\s*[\d.,]+)/);
            if (!nextLevelMatch || !bonusMatch) {
                return;
            }

            const unitId = parseInt(unitIdMatch[1]);
            const upgradeType = upgradeTypeMatch[1];
            const upgrade = {
                level: Math.max(0, parseInt(nextLevelMatch[1]) - 1),
                bonus: parseInt(bonusMatch[1].replace(/[^\d-]/g, '')) || 0
            };

            if (!this._data[unitId]) {
                this._data[unitId] = {};
            }

            if (!_.isEqual(this._data[unitId][upgradeType], upgrade)) {
                this._data[unitId][upgradeType] = upgrade;
                changed = true;
            }
        });

        if (changed) {
            Front.ikaeasyData.save();
        }

        return changed;
    }

    get(unitId, upgradeType) {
        return this._data[unitId] && this._data[unitId][upgradeType] || null;
    }

    getLevel(unitId, upgradeType) {
        const upgrade = this.get(unitId, upgradeType);
        return upgrade ? upgrade.level : 0;
    }

    getBonus(unitId, upgradeType) {
        const upgrade = this.get(unitId, upgradeType);
        return upgrade ? upgrade.bonus : 0;
    }

    toJSON() {
        return this._data;
    }
}

export default new UpgradesModule();