import options from './options.js';
import Win from './win.js';
import Render from './templater.js';

const LATEST_RELEASE_URL = 'https://api.github.com/repos/RandGor/IkaEasy/releases/latest';
const TAGS_URL = 'https://api.github.com/repos/RandGor/IkaEasy/tags?per_page=100';
const TAG_PAGE_URL = 'https://github.com/RandGor/IkaEasy/tree/';
const STORE_KEY_SHOWN_VERSION = 'github_update_shown_version';

class UpdateChecker {
    async init(currentVersion) {
        if (!currentVersion || !options.get('check_github_updates', true)) {
            return;
        }

        try {
            const latestTag = await this.getLatestVersion();
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

    async getLatestVersion() {
        const releaseResponse = await this.githubRequest(LATEST_RELEASE_URL, true);
        if (releaseResponse) {
            const release = await releaseResponse.json();
            const parsed = this.parseVersion(release.tag_name);
            if (parsed) {
                return { ...parsed, url: release.html_url || TAG_PAGE_URL + encodeURIComponent(parsed.name) };
            }
        }

        const tagsResponse = await this.githubRequest(TAGS_URL);
        return this.getLatestTag(await tagsResponse.json());
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
                    url: tag.url || TAG_PAGE_URL + encodeURIComponent(tag.name)
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
            .map((name) => this.parseVersion(name))
            .filter(Boolean)
            .sort((a, b) => this.compareVersions(a.version, b.version))
            .pop() || null;
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
