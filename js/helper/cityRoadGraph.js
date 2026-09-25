// Roads are learned only from consecutive samples of native ambient citizens.
// This module has no DOM access, timers, game commands or keyboard handlers.
const distance = (a, b) => Math.hypot(a.x-b.x, a.y-b.y);
const DIRECTIONS = ['O', 'SO', 'S', 'SW', 'W', 'NW', 'N', 'NO'];
const opposite = direction => DIRECTIONS[(DIRECTIONS.indexOf(direction)+4)%8];
const validPoint = point => Number.isFinite(point.x) && Number.isFinite(point.y);

export function directionFor(dx, dy, previous = null) {
    if (Math.hypot(dx,dy)<.001) return previous || 'S';
    const angle = (Math.atan2(dy,dx)*180/Math.PI+360)%360;
    if (previous && DIRECTIONS.includes(previous)) {
        const center = DIRECTIONS.indexOf(previous)*45;
        const difference = Math.abs((angle-center+540)%360-180);
        if (difference <= 26.5) return previous;
    }
    return DIRECTIONS[Math.round(angle/45)%8];
}

export class CityRoadGraph {
    constructor({mergeRadius = 1.5, maxNodes = 5000} = {}) {
        this.mergeRadius = mergeRadius;
        this.maxNodes = maxNodes;
        this.nodes = new Map();
        this.edges = new Map();
        this.tracks = new Map();
        this.buckets = new Map();
        this.speeds = [];
        this.nextId = 1;
    }

    get speed() {
        if(this.speeds.length<8) return 15;
        const values=[...this.speeds].sort((a,b)=>a-b);
        return Math.min(20,Math.max(8,values[Math.floor(values.length/2)]));
    }

    clearTracks() { this.tracks.clear(); }

    clear() {
        this.nodes.clear(); this.edges.clear(); this.tracks.clear();
        this.buckets.clear(); this.speeds.length=0; this.nextId=1;
    }

    nodeAt(point) {
        const size=this.mergeRadius*2;
        const bx=Math.floor(point.x/size), by=Math.floor(point.y/size);
        let found=null, best=this.mergeRadius;
        for(let x=bx-1;x<=bx+1;x++) for(let y=by-1;y<=by+1;y++) {
            for(const id of this.buckets.get(`${x},${y}`)||[]) {
                const node=this.nodes.get(id), d=distance(node,point);
                if(d<=best){found=node;best=d;}
            }
        }
        if(found) return found;
        if(this.nodes.size>=this.maxNodes) return null;
        const node={id:this.nextId++,x:point.x,y:point.y,links:new Map()};
        this.nodes.set(node.id,node);
        const key=`${bx},${by}`;
        if(!this.buckets.has(key)) this.buckets.set(key,[]);
        this.buckets.get(key).push(node.id);
        return node;
    }

    connect(a,b,sample) {
        if(!a||!b||a.id===b.id) return;
        const key=a.id<b.id?`${a.id}:${b.id}`:`${b.id}:${a.id}`;
        let edge=this.edges.get(key);
        if(!edge) {
            edge={a:a.id,b:b.id,length:distance(a,b),visits:0,z:sample.z||310,directions:new Map()};
            this.edges.set(key,edge);a.links.set(b.id,edge);b.links.set(a.id,edge);
        }
        edge.visits++;
        // Keep an observed native heading when available, not tiny coordinate noise.
        const observed=DIRECTIONS.includes(sample.direction)?sample.direction:directionFor(b.x-a.x,b.y-a.y);
        const heading=edge.a===a.id?observed:opposite(observed);
        edge.directions.set(heading,(edge.directions.get(heading)||0)+1);
        edge.z=sample.z||edge.z;
    }

    observe(samples, now) {
        if(!Number.isFinite(now)) return;
        const seen=new Set();
        for(const sample of samples) {
            if(!validPoint(sample)) continue;
            seen.add(sample.key);
            const previous=this.tracks.get(sample.key);
            const track={...sample,time:now,node:null};
            this.tracks.set(sample.key,track);
            if(!previous) continue;
            const seconds=(now-previous.time)/1000;
            const span=distance(sample,previous);
            // Never bridge disappearance, teleports, long sampling gaps or hidden tabs.
            if(seconds<=0||seconds>.8||span>12||span/seconds>35) continue;
            if(span<.1){track.node=previous.node;continue;}
            const a=previous.node||this.nodeAt(previous);
            const b=this.nodeAt(sample);
            track.node=b;
            // A turn sample can straddle a junction; derive that very short edge geometrically.
            const direction=previous.direction===sample.direction?sample.direction:null;
            this.connect(a,b,{...sample,direction});
            const speed=span/seconds;
            if(speed>=8&&speed<=25) {
                this.speeds.push(speed);
                if(this.speeds.length>160) this.speeds.shift();
            }
        }
        for(const key of this.tracks.keys()) if(!seen.has(key)) this.tracks.delete(key);
    }

    // Start on the largest *connected* observed component, not a few isolated footsteps.
    startNode(minLength=90) {
        const visited=new Set();let best=null,bestLength=0;
        for(const root of this.nodes.values()) {
            if(visited.has(root.id))continue;
            const queue=[root];visited.add(root.id);let length=0,seed=root;
            for(let i=0;i<queue.length;i++) {
                const node=queue[i];
                if(node.links.size>seed.links.size)seed=node;
                for(const [id,edge] of node.links) {
                    length+=edge.length/2;
                    if(!visited.has(id)){visited.add(id);queue.push(this.nodes.get(id));}
                }
            }
            if(length>bestLength){bestLength=length;best=seed;}
        }
        return bestLength>=minLength?best:null;
    }
}

export class RoadWalker {
    constructor(graph,{random=Math.random,minLength=90,pauses=true}={}) {
        this.graph=graph;this.random=random;this.minLength=minLength;this.pauses=pauses;
        this.node=null;this.previous=null;this.target=null;this.edge=null;this.progress=0;
        this.x=0;this.y=0;this.z=310;this.direction='S';this.pauseRemaining=0;
        this.walking=false;this.ready=false;
    }

    start() {
        const node=this.graph.startNode(this.minLength);
        if(!node)return false;
        this.node=node;this.x=node.x;this.y=node.y;this.ready=true;
        return this.chooseEdge();
    }

    chooseEdge() {
        let choices=[...this.node.links.keys()];
        if(choices.length>1)choices=choices.filter(id=>id!==this.previous);
        const previous=this.graph.nodes.get(this.previous);
        if(previous&&choices.length) {
            const ix=this.node.x-previous.x,iy=this.node.y-previous.y;
            const forward=choices.filter(id=>{
                const candidate=this.graph.nodes.get(id);
                const ox=candidate.x-this.node.x,oy=candidate.y-this.node.y;
                return (ix*ox+iy*oy)/Math.hypot(ix,iy)/Math.hypot(ox,oy)>-.7;
            });
            // Dense observations can make tiny triangles on the same stretch of road.
            // Do not treat their backward edges as a reason to reverse in open road.
            if(forward.length)choices=forward;
            else if(this.node.links.has(this.previous))choices=[this.previous];
        }
        if(!choices.length){this.walking=false;return false;}
        const id=choices[Math.min(choices.length-1,Math.floor(this.random()*choices.length))];
        this.target=this.graph.nodes.get(id);this.edge=this.node.links.get(id);this.progress=0;
        const votes=[...this.edge.directions.entries()].sort((a,b)=>b[1]-a[1]);
        const observed=votes[0]?.[0];
        const heading=this.edge.a===this.node.id?observed:(observed&&opposite(observed));
        // Native headings are stable along a road; fallback uses angular hysteresis.
        this.direction=heading||directionFor(this.target.x-this.node.x,this.target.y-this.node.y,this.direction);
        this.z=this.edge.z;this.walking=true;return true;
    }

    advance(seconds) {
        if(!this.ready&&!this.start())return;
        // A resumed/backgrounded frame never jumps forward to catch up with wall time.
        let time=Math.min(.1,Math.max(0,seconds));
        if(this.pauseRemaining>0) {
            const spent=Math.min(time,this.pauseRemaining);
            this.pauseRemaining-=spent;time-=spent;
            this.walking=this.pauseRemaining===0;
        }
        if(!time)return;
        if(!this.edge&&!this.chooseEdge())return;
        const speed=this.graph.speed;
        let remaining=time*speed;
        for(let steps=0;remaining>1e-8&&steps<32;steps++) {
            const travel=Math.min(remaining,this.edge.length-this.progress);
            this.progress+=travel;remaining-=travel;
            const t=this.edge.length?this.progress/this.edge.length:1;
            this.x=this.node.x+(this.target.x-this.node.x)*t;
            this.y=this.node.y+(this.target.y-this.node.y)*t;
            if(this.progress<this.edge.length-1e-8)break;
            this.previous=this.node.id;this.node=this.target;this.target=null;this.edge=null;
            const junction=this.node.links.size!==2;
            if(!this.chooseEdge())break;
            if(this.pauses&&junction&&this.random()<.12) {
                this.pauseRemaining=.4+this.random()*.8;this.walking=false;break;
            }
        }
    }
}
