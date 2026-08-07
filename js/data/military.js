class Military {
    constructor(city) {
        this.city = city;
        this.units = {};

        this.training = [];
        this.updatedAt = { units: 0, ships: 0 };
    }

    load(data) {
        this.units    = data.units || {};
        this.training = data.training || [];
        this.updatedAt = data.updatedAt || { units: 0, ships: 0 };
    }

    setCount(type, cnt) {
        if (cnt === 0) {
            if (Object.prototype.hasOwnProperty.call(this.units, type)) {
                delete this.units[type];
                this.city.save();
            }
            return;
        }

        if (this.units[type] !== cnt) {
            this.units[type] = cnt;
            this.city.save();
        }
    }

    setTraining(type, list) {
        this.training = _.filter(this.training, (u) => {
            return u.type !== type;
        });

        this.training = this.training.concat(list);
        this.city.save();
    }

    markUpdated(type) {
        if (!['units', 'ships'].includes(type)) {
            return;
        }

        this.updatedAt[type] = Date.now();
        this.city.save();
    }

    toSave() {
        return {
            units: this.units,
            training: this.training,
            updatedAt: this.updatedAt
        };
    }
}

export default Military;
