import { execute_js } from '../utils.js';

const EVENT_KEY = 'ikaeasy_cinema_player_event';
const SESSION_KEY = 'ikaeasy_cinema_session';
const RETRY_TIMEOUT = 8000;

class CinemaSession {
    init(navigation) {
        if (this.initialized) {
            return;
        }

        this.initialized = true;
        this.navigation = navigation;
        this.lastEventNonce = null;

        window.addEventListener('storage', (event) => {
            if (event.key === EVENT_KEY && event.newValue) {
                this.handleStoredEvent(event.newValue);
            }
        });

        setInterval(() => {
            const storedEvent = localStorage.getItem(EVENT_KEY);
            if (storedEvent) {
                this.handleStoredEvent(storedEvent);
            }
        }, 500);

        navigation.on('ajax.ikaeasy-cinema-session', (request) => this.handleAjax(request));
    }

    handleStoredEvent(storedEvent) {
        try {
            const message = JSON.parse(storedEvent);
            if (!message.nonce || message.nonce === this.lastEventNonce) {
                return;
            }

            this.lastEventNonce = message.nonce;
            this.handleMessage(message);
        } catch (error) {
            console.warn('IkaEasy Cinema event parsing failed:', error);
        }
    }

    handleMessage(message) {
        let session = this.getSession();

        if (!session || session.sessionId !== message.sessionId) {
            session = {
                sessionId: message.sessionId,
                bonusId: parseInt(message.bonusId),
                videoId: parseInt(message.videoId),
                registered: false,
                ended: false,
                completed: false,
                requestBonusSentAt: 0,
                watchVideoSentAt: 0,
                updatedAt: Date.now()
            };
        }

        if (message.playerState === 'playing') {
            this.requestBonus(session);
        } else if (message.playerState === 'ended') {
            session.ended = true;
            this.saveSession(session);
            if (session.registered) {
                this.watchVideo(session);
            }
        }

        if (!session.registered &&
            session.requestBonusSentAt &&
            Date.now() - session.requestBonusSentAt > RETRY_TIMEOUT) {
            session.requestBonusSentAt = 0;
            this.requestBonus(session);
        }

        if (session.ended && session.registered && !session.completed &&
            session.watchVideoSentAt &&
            Date.now() - session.watchVideoSentAt > RETRY_TIMEOUT) {
            session.watchVideoSentAt = 0;
            this.watchVideo(session);
        }
    }

    requestBonus(session) {
        if (session.registered || session.requestBonusSentAt || session.error) {
            return;
        }

        session.requestBonusSentAt = Date.now();
        session.updatedAt = Date.now();
        this.saveSession(session);

        execute_js(
            `ajaxHandlerCall('index.php?view=noViewChange&action=AdVideoRewardAction&function=requestBonus&bonusId=${session.bonusId}&videoId=${session.videoId}');`
        );
    }

    watchVideo(session) {
        if (session.completed || session.watchVideoSentAt || session.error) {
            return;
        }

        session.watchVideoSentAt = Date.now();
        session.updatedAt = Date.now();
        this.saveSession(session);

        execute_js(
            `ajaxHandlerCall('index.php?view=noViewChange&action=AdVideoRewardAction&function=watchVideo&videoId=${session.videoId}');`
        );
    }

    handleAjax(request) {
        if (!request.url || !/AdVideoRewardAction/i.test(request.url)) {
            return;
        }

        const session = this.getSession();
        if (!session) {
            return;
        }

        if (/function=requestBonus/i.test(request.url)) {
            if (this.hasServerError(request.data)) {
                session.error = this.getServerError(request.data);
                session.requestBonusSentAt = 0;
            } else {
                session.registered = true;
                session.error = null;
            }
        } else if (/function=watchVideo/i.test(request.url)) {
            if (this.hasServerError(request.data)) {
                session.error = this.getServerError(request.data);
                session.watchVideoSentAt = 0;
            } else {
                session.completed = true;
                session.error = null;
            }
        }

        session.updatedAt = Date.now();
        this.saveSession(session);
    }

    hasServerError(response) {
        return !!this.getServerError(response);
    }

    getServerError(response) {
        try {
            const commands = typeof response === 'string' ? JSON.parse(response) : response;
            const feedback = commands.find((command) => command[0] === 'provideFeedback');
            const messages = feedback && Array.isArray(feedback[1]) ? feedback[1] : [];
            const error = messages.find((message) => parseInt(message.type) === 11);
            return error ? error.text : null;
        } catch (error) {
            return 'Invalid server response';
        }
    }

    getSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY));
        } catch (error) {
            return null;
        }
    }

    saveSession(session) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
}

export default new CinemaSession();
