import options from './options.js';
import Win from './win.js';
import Render from './templater.js';

const LATEST_RELEASE_URL = 'https://api.github.com/repos/RandGor/IkaEasy/releases/latest';
const CHROME_WEB_STORE_ID = 'dkngcffbmbolplchpfbgjieihfdinnaf';
const STORE_KEY_SHOWN_VERSION = 'github_update_shown_version';

class UpdateChecker {
    async init(currentVersion) {
        if (
            chrome.runtime.id === CHROME_WEB_STORE_ID ||
            !currentVersion ||
            !options.get('check_github_updates', true)
        ) {
            return;
        }

        try {
            const latestRelease = await this.getLatestVersion();
            console.info('IkaEasy update check:', {
                currentVersion: currentVersion,
                latestRelease: latestRelease
            });

            if (!latestRelease || this.compareVersions(latestRelease.version, currentVersion) <= 0) {
                return;
            }

            const stored = await chrome.storage.local.get(STORE_KEY_SHOWN_VERSION);
            if (stored[STORE_KEY_SHOWN_VERSION] === latestRelease.version) {
                return;
            }

            await chrome.storage.local.set({
                [STORE_KEY_SHOWN_VERSION]: latestRelease.version
            });

            this.show(latestRelease);
        } catch (error) {
            console.error('IkaEasy update check failed:', error);
        }
    }

    async getLatestVersion() {
        const releaseResponse = await this.githubRequest(LATEST_RELEASE_URL, true);
        if (releaseResponse) {
            const release = await releaseResponse.json();
            const parsed = this.parseVersion(release.tag_name);
            if (parsed) {
                return { ...parsed, url: release.html_url };
            }
        }

        return null;
    }

    async githubRequest(url, allowNotFound = false) {
        const response = await fetch(url, {
            headers: {'Accept': 'application/vnd.github+json'}
        });
        if (allowNotFound && response.status === 404) {
            return null;
        }
        if (!response.ok) {
            throw new Error('GitHub returned ' + response.status);
        }
        return response;
    }

    show(tag) {
        const win = new Win({
            title: LANGUAGE.getLocalizedString('update.available_title')
        });

        win.on('ready', async () => {
            try {
                const html = await Render('update-notification', {
                    version: tag.version,
                    url: tag.url
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

    parseVersion(name) {
        if (!/^v?\d+(\.\d+)*$/.test(name || '')) {
            return null;
        }
        return {name: name, version: name.replace(/^v/, '')};
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
