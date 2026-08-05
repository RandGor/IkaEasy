const TransportShipType = Object.freeze({
    CARGO_SHIP: 'cargo_ship',
    FREIGHTER: 'freighter'
});

const SHIP_CONFIG = Object.freeze({
    [TransportShipType.CARGO_SHIP]: Object.freeze({
        unitId: 201,
        baseCapacity: 500,
        upgradeType: 'cargo'
    }),
    [TransportShipType.FREIGHTER]: Object.freeze({
        unitId: 204,
        baseCapacity: 50000,
        upgradeType: 'cargo'
    })
});

let barbarianLoot = null;

function getShipConfig(type) {
    const config = SHIP_CONFIG[type];
    if (!config) {
        throw new Error(`Unknown transport ship type: ${type}`);
    }

    return config;
}

export function getTransportShipUpgrade(type = TransportShipType.CARGO_SHIP) {
    const config = getShipConfig(type);
    const upgrades = Front.ikaeasyData && Front.ikaeasyData.getUpgrades();
    return upgrades ? upgrades.get(config.unitId, config.upgradeType) : null;
}

export function getTransportShipCapacity(type = TransportShipType.CARGO_SHIP) {
    const config = getShipConfig(type);
    const upgrade = getTransportShipUpgrade(type);
    return config.baseCapacity + (upgrade ? upgrade.bonus : 0);
}

export function getTransportShipsRequired(resources, type = TransportShipType.CARGO_SHIP) {
    resources = Math.max(0, parseInt(resources) || 0);
    return Math.ceil(resources / getTransportShipCapacity(type));
}

export function rememberBarbarianLoot(resources) {
    barbarianLoot = Math.max(0, parseInt(resources) || 0);
}

export function consumeBarbarianLoot() {
    const resources = barbarianLoot;
    barbarianLoot = null;
    return resources;
}

export function clearBarbarianLoot() {
    barbarianLoot = null;
}

export { TransportShipType };