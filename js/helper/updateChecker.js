import options from './options.js';
import Win from './win.js';
import Render from './templater.js';

const TAGS_URL = 'https://api.github.com/repos/RandGor/IkaEasy/tags?per_page=100';
const TAG_PAGE_URL = 'https://github.com/RandGor/IkaEasy/tree/';
const STORE_KEY_SHOWN_VERSION = 'github_update_shown_version';

class UpdateChecker {
    async init(currentVersion) {
        if (!currentVersion || !options.get('check_github_updates', true)) {
            return;
        }

        try {
            const response = await fetch(TAGS_URL, {
                headers: {'Accept': 'application/vnd.github+json'}
            });

            if (!response.ok) {
                throw new Error('GitHub returned ' + response.status);
            }

            const latestTag = this.getLatestTag(await response.json());
            console.info('IkaEasy update check:', {
                currentVersion: currentVersion,
                latestTag: latestTag
            });

            if (!latestTag || this.compareVersions(latestTag.version, currentVersion) <= 0) {
                return;
            }

            const stored = await chrome.storage.local.get(STORE_KEY_SHOWN_VERSION);
            if (stored[STORE_KEY_SHOWN_VERSION] === latestTag.version) {
                return;
            }

            await chrome.storage.local.set({
                [STORE_KEY_SHOWN_VERSION]: latestTag.version
            });

            this.show(latestTag);
        } catch (error) {
            console.error('IkaEasy update check failed:', error);
        }
    }

    show(tag) {
        const win = new Win({
            title: LANGUAGE.getLocalizedString('update.available_title')
        });

        win.on('ready', async () => {
            try {
                const html = await Render('update-notification', {
                    version: tag.version,
                    url: TAG_PAGE_URL + encodeURIComponent(tag.name)
                });

                win.getContent().html(html);
                win.setToCenter();
                win.$el.addClass('ikaeasy-update-notification');
            } catch (error) {
                console.error(error);
                win.remove();
            }
        });
    }

    getLatestTag(tags) {
        return (Array.isArray(tags) ? tags : [])
            .map((tag) => tag && tag.name)
            .filter((name) => /^v?\d+(\.\d+)*$/.test(name || ''))
            .map((name) => ({name: name, version: name.replace(/^v/, '')}))
            .sort((a, b) => this.compareVersions(a.version, b.version))
            .pop() || null;
    }

    compareVersions(a, b) {
        const left = String(a).replace(/^v/, '').split('.').map(Number);
        const right = String(b).replace(/^v/, '').split('.').map(Number);
        const length = Math.max(left.length, right.length);

        for (let i = 0; i < length; i++) {
            const difference = (left[i] || 0) - (right[i] || 0);
            if (difference !== 0) {
                return difference;
            }
        }

        return 0;
    }
}

export default new UpdateChecker();