import Event from './event.js';
import { getServerDomain, getServerWorld } from '../utils.js';

class IkalogsRu extends Event {
    constructor() {
        super();

        this.email = null;
        this.checkIsAuth();

        setTimeout(() => {
            this.checkIsAuth();
        }, 300000);
    }

    checkIsAuth(callback) {
        let setEmail = (email) => {
            if (email !== this.email) {
                this.email = email;
                this.emit('online', [email !== null]);
            }
        };

        chrome.runtime.sendMessage({ cmd: 'ajax', url: 'layout/user/isAuth/' }, (data) => {
            if (data && data.auth && data.email) {
                setEmail(data.email);
                callback && callback(data.email);
            } else {
                setEmail(null);
                callback && callback(null);
            }
        });
    }

    sendWorld(body) {
        chrome.runtime.sendMessage({ cmd: 'ajax', url: 'common/world/', method: 'post', body: body });
    }

    sendWorldEmptyIslands(islands) {
        chrome.runtime.sendMessage({ cmd: 'ajax', url: 'common/world/empty', method: 'post', body: {
                server: getServerDomain(),
                world: getServerWorld().substring(1),
                islands: islands.join(','),
            }
        });
    }

    getMines() {
        const server = getServerDomain();
        const world = getServerWorld().substring(1);

        // getServerWorld() falls back to "s?" outside an Ikariam game world.
        // Do not send "world=?" to IkaLogs: its API expects a numeric WorldId.
        if (!/^\d+$/.test(world)) {
            return Promise.resolve(null);
        }

        return new Promise(resolve => {
            chrome.runtime.sendMessage({ cmd: 'ajax', url: `common/world/mines?server=${server}&world=${world}` }, (result) => {
                resolve(result);
            });
        });
    }

    getBattleInfo(battleId) {
        return new Promise(resolve => {
            chrome.runtime.sendMessage(
                { cmd: 'ajax', url: `user/report/get/?id=${battleId}`, headers: { e: true } },
                response => resolve(response)
            )
        });
    }
}

export default new IkalogsRu();
