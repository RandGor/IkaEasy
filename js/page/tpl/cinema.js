import Parent from './dummy.js';

const TEMPLATE_DATA_KEY = 'ikaeasy_cinema_template_data';

class Page extends Parent {
    init() {
        if (!this.options.get('cinema_floating_player', true)) {
            return;
        }

        this.submitHandler = (event) => {
            const form = event.target;
            if (!(form instanceof HTMLFormElement) ||
                !form.matches('.bonusForm') ||
                !form.closest('#VideoRewards')) {
                return;
            }

            const bonusId = parseInt(form.querySelector('input[name="bonusId"]')?.value);
            const videoId = parseInt(form.querySelector('input[name="videoId"]')?.value);
            const youtubeVideoId = this.getYoutubeVideoId(videoId);

            if (!bonusId || !videoId || !youtubeVideoId ||
                !this.openPlayer(bonusId, videoId, youtubeVideoId)) {
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
        };

        document.addEventListener('submit', this.submitHandler, true);
    }

    getYoutubeVideoId(videoId) {
        try {
            const templateData = JSON.parse(localStorage.getItem(TEMPLATE_DATA_KEY));
            if (!templateData || parseInt(templateData.videoId) !== videoId) {
                return null;
            }

            const videos = Array.isArray(templateData.videos) ? templateData.videos : [];
            const video = videos.find((item) => item.videoID && !['fyber', 'supersonicJS'].includes(item.videoID));
            return video ? video.videoID : null;
        } catch (error) {
            return null;
        }
    }

    openPlayer(bonusId, videoId, youtubeVideoId) {
        const sessionId = crypto.randomUUID();
        const width = 430;
        const height = 330;
        const left = Math.max(0, window.screen.availLeft + window.screen.availWidth - width - 20);
        const top = Math.max(0, window.screen.availTop + window.screen.availHeight - height - 60);
        const popup = window.open(
            '',
            `ikaeasyCinemaPlayer_${sessionId}`,
            `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes`
        );

        if (!popup) {
            return null;
        }

        localStorage.setItem('ikaeasy_cinema_session', JSON.stringify({
            sessionId: sessionId,
            bonusId: bonusId,
            videoId: videoId,
            registered: false,
            ended: false,
            completed: false,
            requestBonusSentAt: 0,
            watchVideoSentAt: 0,
            updatedAt: Date.now()
        }));

        const stylesheet = chrome.runtime.getURL('css/cinema-player.css');
        const controller = chrome.runtime.getURL('js/cinema-player.js');
        popup.document.open();
        popup.document.write(
            '<!doctype html><html><head>' +
                '<meta charset="utf-8">' +
                '<meta name="viewport" content="width=device-width,initial-scale=1">' +
                '<title>IkaEasy Cinema</title>' +
                '<link rel="stylesheet" href="' + stylesheet + '">' +
            '</head><body' +
                ' data-session-id="' + sessionId + '"' +
                ' data-bonus-id="' + bonusId + '"' +
                ' data-video-id="' + videoId + '"' +
                ' data-youtube-video-id="' + youtubeVideoId + '">' +
                '<header><span>Video bonus</span>' +
                    '<button id="close" type="button" aria-label="Close">&times;</button>' +
                '</header>' +
                '<main><iframe id="player" title="Gameforge video"' +
                    ' allow="autoplay; encrypted-media; picture-in-picture"' +
                    ' referrerpolicy="origin"></iframe>' +
                    '<div id="status">Starting video…</div>' +
                '</main><script src="' + controller + '"><\/script>' +
            '</body></html>'
        );
        popup.document.close();
        popup.focus();

        return popup;
    }

    destroy() {
        if (this.submitHandler) {
            document.removeEventListener('submit', this.submitHandler, true);
        }
    }
}

export default Page;
