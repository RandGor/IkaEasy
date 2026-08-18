import Storage from './storage.js';
import { getThisKey } from '../utils.js';

const DEFAULT_LEASE_TIME = 5 * 60 * 1000;

class SyncLock {
    running = {};

    run(storageKey, options, callback) {
        if (this.running[storageKey]) {
            return this.running[storageKey];
        }

        const promise = this.runLocked(storageKey, options, callback)
            .finally(() => {
                if (this.running[storageKey] === promise) {
                    delete this.running[storageKey];
                }
            });
        this.running[storageKey] = promise;
        return promise;
    }

    async runLocked(storageKey, options, callback) {
        const lockName = `ikaeasy-sync:${getThisKey(storageKey)}`;
        if (navigator.locks && navigator.locks.request) {
            return navigator.locks.request(lockName, { ifAvailable: true }, (lock) => {
                if (!lock) {
                    return { status: 'locked' };
                }
                return this.runWithLease(storageKey, options, callback);
            });
        }

        return this.runWithLease(storageKey, options, callback);
    }

    async runWithLease(storageKey, options, callback) {
        const now = Date.now();
        const interval = options.interval || 0;
        const leaseTime = options.leaseTime || DEFAULT_LEASE_TIME;
        const storedState = await Storage.get(storageKey, true);
        const state = storedState && typeof storedState === 'object' ? storedState : {};
        const completedAt = parseInt(state.sync_completed_at || state.update_time) || 0;
        const startedAt = parseInt(state.sync_started_at) || 0;

        if (!options.force && completedAt + interval > now) {
            return { status: 'fresh' };
        }
        if (state.sync_id && startedAt + leaseTime > now) {
            return { status: 'locked' };
        }

        const syncId = `${now}-${Math.random().toString(36).slice(2)}`;
        const acquired = await Storage.set(storageKey, {
            ...state,
            sync_id: syncId,
            sync_started_at: now
        });
        if (!acquired) {
            throw new Error(`Could not acquire the ${storageKey} sync lock`);
        }

        // chrome.storage has no compare-and-swap operation. Re-reading the claim
        // prevents stale fallback contenders from continuing in nearly all cases;
        // Web Locks provides the atomic path in supported browsers.
        const claimedValue = await Storage.get(storageKey, true);
        const claimedState = claimedValue && typeof claimedValue === 'object' ? claimedValue : {};
        if (claimedState.sync_id !== syncId) {
            return { status: 'locked' };
        }

        try {
            const result = await callback();
            const latestValue = await Storage.get(storageKey, true);
            const latest = latestValue && typeof latestValue === 'object' ? latestValue : {};
            if (latest.sync_id !== syncId) {
                throw new Error(`Lost the ${storageKey} sync lock`);
            }

            const completed = Date.now();
            const saved = await Storage.set(storageKey, {
                ...latest,
                sync_id: null,
                sync_started_at: 0,
                sync_completed_at: completed,
                update_time: completed
            });
            if (!saved) {
                throw new Error(`Could not save the ${storageKey} sync completion time`);
            }
            return { status: 'completed', result: result };
        } finally {
            const latestValue = await Storage.get(storageKey, true);
            const latest = latestValue && typeof latestValue === 'object' ? latestValue : {};
            if (latest.sync_id === syncId) {
                await Storage.set(storageKey, {
                    ...latest,
                    sync_id: null,
                    sync_started_at: 0
                });
            }
        }
    }
}

export default new SyncLock();
