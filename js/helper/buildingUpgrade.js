import { getInt } from '../utils.js';

const RESOURCE_CLASSES = {
    wood: 'wood',
    wine: 'wine',
    marble: 'marble',
    crystal: 'glass',
    glass: 'glass',
    sulfur: 'sulfur'
};

class BuildingUpgrade {
    constructor() {
        this.cache = new Map();
    }

    get(cityId, build) {
        const key = [cityId, build.position, build.level].join(':');
        if (!this.cache.has(key)) {
            const request = this.load(cityId, build).catch((error) => {
                this.cache.delete(key);
                throw error;
            });
            this.cache.set(key, request);
        }

        return this.cache.get(key);
    }

    findUpgradeElement(value) {
        if (typeof value === 'string') {
            if (!value.includes('buildingUpgrade')) {
                return null;
            }

            const document = new DOMParser().parseFromString(value, 'text/html');
            return document.querySelector('#buildingUpgrade');
        }

        if (!value || typeof value !== 'object') {
            return null;
        }

        for (const child of Object.values(value)) {
            const upgrade = this.findUpgradeElement(child);
            if (upgrade) {
                return upgrade;
            }
        }

        return null;
    }

    async load(cityId, build) {
        const params = new URLSearchParams({
            view: build.building,
            cityId: cityId,
            currentCityId: cityId,
            position: build.position,
            backgroundView: 'city',
            actionRequest: Front.data.actionRequest,
            ajax: 1
        });
        const response = await fetch('/index.php?' + params.toString(), {
            credentials: 'include',
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error('Ikariam returned ' + response.status);
        }

        const responseText = await response.text();
        let responseData = responseText;
        try {
            responseData = JSON.parse(responseText);
        } catch (error) {
            // A full HTML response is also supported.
        }

        const upgrade = this.findUpgradeElement(responseData);
        if (!upgrade) {
            throw new Error('Building upgrade data is missing in the Ikariam response');
        }

        const button = upgrade.querySelector('#js_buildingUpgradeButton');
        const costs = {};

        upgrade.querySelectorAll('ul.resources > li').forEach((element) => {
            const resourceClass = Object.keys(RESOURCE_CLASSES)
                .find((name) => element.classList.contains(name));
            if (!resourceClass) {
                return;
            }

            costs[RESOURCE_CLASSES[resourceClass]] = getInt(
                element.getAttribute('title') || element.textContent
            );
        });

        return {
            costs: costs,
            url: button ? button.getAttribute('href') : null
        };
    }
}

export default new BuildingUpgrade();