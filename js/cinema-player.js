'use strict';

const EVENT_KEY = 'ikaeasy_cinema_player_event';
const SESSION_KEY = 'ikaeasy_cinema_session';
const bodyData = document.body.dataset;
const session = {
    sessionId: bodyData.sessionId,
    bonusId: parseInt(bodyData.bonusId),
    videoId: parseInt(bodyData.videoId),
    youtubeVideoId: bodyData.youtubeVideoId
};

const player = document.getElementById('player');
const status = document.getElementById('status');
let playerState = 'loading';
let registered = false;
let completed = false;
let closeScheduled = false;
let resumeTimer = null;

player.src = 'https://www.youtube.com/embed/' +
    encodeURIComponent(session.youtubeVideoId) +
    '?enablejsapi=1&autoplay=1&mute=1&controls=1&disablekb=0&rel=0&fs=0' +
    '&origin=' + encodeURIComponent(location.origin) +
    '&widget_referrer=' + encodeURIComponent(location.origin);

function playerCommand(func) {
    if (!player.contentWindow) {
        return;
    }

    player.contentWindow.postMessage(JSON.stringify({
        event: 'command',
        func: func,
        args: []
    }), '*');
}

function keepPlaying() {
    if (playerState === 'ended' || completed) {
        return;
    }

    playerCommand('mute');
    playerCommand('playVideo');
}

function scheduleResume() {
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(keepPlaying, 250);
}

function applyControlState() {
    let control;
    try {
        control = JSON.parse(localStorage.getItem(SESSION_KEY));
    } catch (error) {
        return;
    }

    if (!control || control.sessionId !== session.sessionId) {
        return;
    }

    registered = !!control.registered;
    completed = !!control.completed;

    if (control.error) {
        status.textContent = control.error;
        return;
    }

    if (registered && playerState !== 'ended') {
        status.textContent = 'Playing';
    }

    if (completed && !closeScheduled) {
        closeScheduled = true;
        status.textContent = 'Reward activated. Closing...';
        setTimeout(() => window.close(), 3000);
    }
}

function notifyGame() {
    localStorage.setItem(EVENT_KEY, JSON.stringify({
        nonce: Date.now() + ':' + Math.random(),
        sessionId: session.sessionId,
        bonusId: session.bonusId,
        videoId: session.videoId,
        playerState: playerState
    }));
}

function listenToPlayer() {
    if (!player.contentWindow) {
        return;
    }

    player.contentWindow.postMessage(JSON.stringify({
        event: 'listening',
        id: 'player'
    }), '*');

    playerCommand('mute');
    if (playerState === 'loading') {
        playerCommand('playVideo');
    }
}

window.addEventListener('message', (event) => {
    if (event.origin !== 'https://www.youtube.com') {
        return;
    }

    let data = event.data;
    try {
        data = typeof data === 'string' ? JSON.parse(data) : data;
    } catch (error) {
        return;
    }

    const state = data.event === 'onStateChange'
        ? data.info
        : data.event === 'infoDelivery' && data.info
            ? data.info.playerState
            : undefined;

    if (state === 1) {
        playerState = 'playing';
        status.textContent = registered ? 'Playing' : 'Registering bonus...';
        notifyGame();
    } else if (state === 2) {
        playerState = 'paused';
        status.textContent = 'Resuming video...';
        scheduleResume();
    } else if (state === 0) {
        playerState = 'ended';
        clearTimeout(resumeTimer);
        status.textContent = 'Confirming reward...';
        notifyGame();
    }
});

document.getElementById('close').addEventListener('click', () => window.close());
player.addEventListener('load', listenToPlayer);
window.addEventListener('focus', keepPlaying);
document.addEventListener('visibilitychange', keepPlaying);

setInterval(() => {
    if (playerState === 'loading') {
        listenToPlayer();
    }
    notifyGame();
    applyControlState();
}, 500);
