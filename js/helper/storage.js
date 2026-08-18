import Events from './event.js';
import { getThisKey } from '../utils.js';

class Storage extends Events {
    cache = {};
    constructor() {
        super();

        chrome.storage.onChanged.addListener((changes, namespace) => {
            _.each(changes, (val, key) => {
                val.oldValue = this.parse(val.oldValue, key);
                val.newValue = this.parse(val.newValue, key);

                if (namespace === 'local') {
                    this.cache[key] = val.newValue;
                }

                this.emit(key, [val, key, namespace]);
            });
        });
    }

    on(key, callback) {
        return super.on(getThisKey(key), callback);
    }

    off(key) {
        return super.off(getThisKey(key));
    }

    parse(value, key) {
        if (typeof value !== 'string') {
            return typeof value === 'undefined' ? null : value;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.error(`IkaEasy storage: invalid JSON in ${key}`, error);
            return null;
        }
    }

    get(key, fresh = false) {
        return new Promise(resolve => {
            key = getThisKey(key);
            if(!fresh && key in this.cache){
                return resolve(this.cache[key]);
            }

            chrome.storage.local.get(key, (result) => {
                if (chrome.runtime.lastError) {
                    console.error('IkaEasy storage: read failed', chrome.runtime.lastError);
                    return resolve(null);
                }

                const val = this.parse(result[key], key);
                this.cache[key] = val;
                resolve(val);
            });
        })
    }

    set(key, value) {
        return new Promise(resolve => {
            const _key = getThisKey(key);
            let data = {};
            data[_key] = JSON.stringify(value);

            try {
                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {
                        console.error('IkaEasy storage: write failed', chrome.runtime.lastError);
                        return resolve(false);
                    }

                    this.cache[_key] = value;
                    resolve(true);
                });
            } catch (e) {
                console.log(e, data);
                resolve(false);
            }
        })
    }
}

export default new Storage();
