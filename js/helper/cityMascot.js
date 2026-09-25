import { CityRoadGraph, RoadWalker } from './cityRoadGraph.js';

const DIRECTIONS = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
const QUOTES = [
    'Hypothesis: even Archimedes would run less with IkaEasy!',
    'IkaEasy is not magic — just well-tested science!',
    'IkaEasy saves time. I checked twice, for science!',
    'Eureka! IkaEasy shortened the path to discovery again.',
    'IkaEasy and I found a constant: there is never enough marble!',
    'With IkaEasy, even my shadow follows the scientific method.',
    'IkaEasy checked the calculations. The gods asked for a copy.',
    'The IkaEasy theorem: a full warehouse, but never the resource you need!',
    'IkaEasy reduced entropy. The storekeeper has yet to notice.',
    'With IkaEasy, I calculated infinity: it is the upgrade queue.'
];

export default class CityMascot {
    constructor(host, cityId, { phrases = QUOTES, random = Math.random } = {}) {
        this.host = host;
        this.cityId = Number(cityId);
        this.phrases = phrases.length >= 3 ? phrases : QUOTES;
        this.random = random;
        this.graph = new CityRoadGraph();
        this.walker = new RoadWalker(this.graph, { random });
        this.destroyed = false;
        this.frame = null;
        this.timer = null;
        this.lastFrame = null;
        this.pointer = null;
        this.hovered = false;
        this.quoteIndex = -1;
        this.loads = new Set();
        this.onPointer = event => {
            // Passive observation only: city hit testing, dragging and clicks remain native.
            this.pointer = event.target.closest?.('#worldmap') && event.buttons === 0
                ? { x: event.clientX, y: event.clientY } : null;
            this.updateTooltip();
        };
        this.onLeave = () => { this.pointer = null; this.hideTooltip(); };
        this.onVisibility = () => {
            this.stop();
            if (!document.hidden && this.isCurrentScene()) this.start();
        };
        this.onPageHide = () => this.destroy();
        this.ready = this.mount();
    }

    isCurrentScene() {
        if (this.destroyed || !this.host.isConnected || document.getElementById('locations') !== this.host) return false;
        const href = this.host.querySelector('#js_CityPosition0Link')?.getAttribute('href');
        return !!href && Number(new URL(href, location.href).searchParams.get('cityId')) === this.cityId;
    }

    load(element, url, valid = () => true) {
        return new Promise(resolve => {
            const finish = success => {
                element.onload = element.onerror = null;
                this.loads.delete(cancel);
                resolve(success && !this.destroyed);
            };
            const cancel = () => finish(false);
            this.loads.add(cancel);
            element.onload = () => finish(valid());
            element.onerror = () => finish(false);
            if (element.tagName === 'LINK') element.href = url;
            else element.src = url;
        });
    }

    async mount() {
        if (!this.isCurrentScene()) { this.destroy(); return false; }
        this.stylesheet = document.createElement('link');
        this.stylesheet.rel = 'stylesheet';
        this.stylesheet.dataset.ikaeasyCityMascot = '';
        const styles = this.load(this.stylesheet, new URL('../../css/city-mascot.css?v=2', import.meta.url).href);
        document.head.append(this.stylesheet);
        const sprites = DIRECTIONS.map(direction => {
            const image = new Image();
            return this.load(image, new URL(`../../images/city-mascot/${direction}.png?v=2`, import.meta.url).href,
                () => image.naturalWidth === 876 && image.naturalHeight === 67);
        });
        const loaded = await Promise.all([styles, ...sprites]);
        if (!loaded.every(Boolean) || !this.isCurrentScene()) { this.destroy(); return false; }

        this.element = document.createElement('div');
        this.element.className = 'ikaeasy-city-mascot';
        this.element.id = 'ikaeasy-city-mascot';
        this.element.dataset.cityId = String(this.cityId);
        this.element.dataset.state = 'learning';
        this.element.dataset.direction = 'S';
        this.element.setAttribute('role', 'img');
        this.element.setAttribute('aria-label', 'IkaEasy');
        this.element.hidden = true;
        this.host.append(this.element);

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'ikaeasy-city-mascot-tooltip';
        this.tooltip.setAttribute('role', 'tooltip');
        this.tooltip.hidden = true;
        document.body.append(this.tooltip);

        document.addEventListener('pointermove', this.onPointer, { capture: true, passive: true });
        document.addEventListener('pointerleave', this.onLeave, { passive: true });
        document.addEventListener('visibilitychange', this.onVisibility);
        window.addEventListener('pagehide', this.onPageHide);
        // Observe removal/replacement only, never native citizens' changing style attributes.
        this.observer = new MutationObserver(() => {
            if (!this.isCurrentScene()) this.destroy();
        });
        this.observer.observe(document.body, { childList: true, subtree: true });
        if (!document.hidden) this.start();
        return true;
    }

    start() {
        if (this.destroyed || this.timer !== null) return;
        this.sample();
        if (this.destroyed) return;
        this.timer = setInterval(() => this.sample(), 250);
        if (this.walker.ready) this.requestFrame();
    }

    sample() {
        if (!this.isCurrentScene()) { this.destroy(); return; }
        if (document.hidden) return;
        const samples = [];
        for (const element of this.host.querySelectorAll('#walkers [id^="walkerAmbience"]')) {
            const match = /(?:^|\s)citizen\d+(NO|NW|SO|SW|N|O|S|W)(?:\s|$)/.exec(element.className);
            if (!match || element.classList.contains('invisible')) continue;
            const style = getComputedStyle(element);
            if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
            // Only the measured 73x67 native family; do not infer footprints for other actors.
            if (Math.abs(parseFloat(style.width)-73) > .1 || Math.abs(parseFloat(style.height)-67) > .1) continue;
            const x = parseFloat(element.style.left), y = parseFloat(element.style.top);
            if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
            samples.push({ key: element, x: x+36, y: y+52, direction: match[1], z: parseInt(style.zIndex, 10) || 310 });
        }
        this.graph.observe(samples, performance.now());
        this.element.dataset.roadNodes = String(this.graph.nodes.size);
        this.element.dataset.roadEdges = String(this.graph.edges.size);
        this.element.dataset.speed = this.graph.speed.toFixed(2);
        if (!this.walker.ready) this.walker.start();
        if (this.walker.ready) this.requestFrame();
    }

    requestFrame() {
        if (this.frame === null && !this.destroyed) this.frame = requestAnimationFrame(now => this.render(now));
    }

    render(now) {
        this.frame = null;
        if (!this.isCurrentScene()) { this.destroy(); return; }
        if (document.hidden) return;
        const seconds = this.lastFrame === null ? 0 : (now-this.lastFrame)/1000;
        this.lastFrame = now;
        this.walker.advance(seconds);
        this.element.hidden = !this.walker.ready;
        this.element.style.transform = `translate(${(this.walker.x-36).toFixed(3)}px, ${(this.walker.y-52).toFixed(3)}px)`;
        this.element.style.zIndex = String(this.walker.z);
        // Changing only the image preserves the CSS animation's phase on a turn.
        if (this.element.dataset.direction !== this.walker.direction) this.element.dataset.direction = this.walker.direction;
        const state = this.walker.walking ? 'walking' : 'paused';
        if (this.element.dataset.state !== state) this.element.dataset.state = state;
        this.updateTooltip();
        this.requestFrame();
    }

    updateTooltip() {
        if (!this.tooltip || !this.pointer || !this.element || this.element.hidden || this.destroyed) {
            this.hideTooltip(); return;
        }
        const rect = this.element.getBoundingClientRect();
        // Use the whole sprite cell, with a comfortable minimum even on a zoomed-out city.
        // This is passive hit testing; the sprite still cannot intercept city clicks.
        const halfWidth = Math.max(rect.width, 64)/2;
        const halfHeight = Math.max(rect.height, 60)/2;
        const x = this.pointer.x-(rect.left+rect.width/2);
        const y = this.pointer.y-(rect.top+rect.height/2);
        if (Math.abs(x)>halfWidth || Math.abs(y)>halfHeight || !rect.width || !rect.height ||
            !document.elementFromPoint(this.pointer.x, this.pointer.y)?.closest('#worldmap')) {
            this.hideTooltip(); return;
        }
        if (!this.hovered) {
            const next = Math.floor(this.random()*(this.phrases.length-1));
            this.quoteIndex = this.quoteIndex < 0 ? next : (this.quoteIndex+1+next)%this.phrases.length;
            this.tooltip.textContent = this.phrases[this.quoteIndex];
            this.tooltip.hidden = false;
            this.hovered = true;
        }
        const width = this.tooltip.offsetWidth, height = this.tooltip.offsetHeight;
        const left = Math.max(8, Math.min(innerWidth-width-8, rect.left+rect.width/2-width/2));
        const top = Math.max(8, Math.min(innerHeight-height-8, rect.top+rect.height*16/67-height-8));
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    hideTooltip() {
        if (this.tooltip) this.tooltip.hidden = true;
        this.hovered = false;
    }

    stop() {
        if (this.timer !== null) clearInterval(this.timer);
        if (this.frame !== null) cancelAnimationFrame(this.frame);
        this.timer = this.frame = this.lastFrame = null;
        this.graph.clearTracks();
        this.pointer = null;
        this.hideTooltip();
        if (this.element) this.element.dataset.state = 'paused';
    }

    destroy() {
        if (this.destroyed) return;
        this.destroyed = true;
        this.stop();
        this.observer?.disconnect();
        this.observer = null;
        document.removeEventListener('pointermove', this.onPointer, true);
        document.removeEventListener('pointerleave', this.onLeave);
        document.removeEventListener('visibilitychange', this.onVisibility);
        window.removeEventListener('pagehide', this.onPageHide);
        for (const cancel of [...this.loads]) cancel();
        this.element?.remove();
        this.tooltip?.remove();
        this.stylesheet?.remove();
        this.graph.clear();
        this.element = this.tooltip = this.stylesheet = null;
    }
}
