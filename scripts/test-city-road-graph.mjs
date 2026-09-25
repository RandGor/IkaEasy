import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../js/helper/cityRoadGraph.js',import.meta.url),'utf8');
const {CityRoadGraph,RoadWalker,directionFor}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
let checks=0;
function check(name,fn){fn();checks++;console.log(`OK ${name}`);}
function trace(graph,points,{key='citizen',start=0,direction='O'}={}) {
    points.forEach(([x,y],i)=>graph.observe([{key,x,y,direction,z:310}],start+i*250));
}
const line=()=>{const g=new CityRoadGraph();trace(g,Array.from({length:61},(_,i)=>[i*3.75,0]));return g;};

check('learns only consecutive movement, calibrates native speed',()=>{
    const g=line();assert.equal(g.nodes.size,61);assert.equal(g.edges.size,60);assert.equal(g.speed,15);
    assert(g.startNode());
});
check('does not join different citizens or disconnected streets',()=>{
    const g=new CityRoadGraph();
    trace(g,[[0,0],[4,0]],{key:'a'});trace(g,[[100,100],[104,100]],{key:'b',start:500});
    assert.equal(g.edges.size,2);assert.equal(g.startNode(10),null);
});
check('does not bridge disappearance and reuse of a citizen id',()=>{
    const g=new CityRoadGraph();trace(g,[[0,0],[4,0]]);g.observe([],500);
    trace(g,[[9,0],[13,0]],{start:750});assert.equal(g.edges.size,2);
});
check('rejects teleports, delayed samples and non-finite positions',()=>{
    const g=new CityRoadGraph();trace(g,[[0,0],[500,0]]);assert.equal(g.edges.size,0);
    g.observe([{key:'citizen',x:504,y:0}],2000);assert.equal(g.edges.size,0);
    g.observe([{key:'citizen',x:NaN,y:0}],2250);assert.equal(g.tracks.size,0);
});
check('merges an observed junction without guessing connecting roads',()=>{
    const g=new CityRoadGraph({mergeRadius:1});
    trace(g,[[0,0],[4,0],[8,0]],{key:'east'});
    trace(g,[[4,-4],[4,0],[4,4]],{key:'south',start:1000,direction:'S'});
    assert.equal([...g.nodes.values()].find(n=>n.x===4&&n.y===0).links.size,4);
    assert.equal(g.edges.size,4);
});
check('movement is independent of render frame rate',()=>{
    const g=line();
    const a=new RoadWalker(g,{random:()=>.99,pauses:false});
    const b=new RoadWalker(g,{random:()=>.99,pauses:false});
    for(let i=0;i<600;i++)a.advance(1/60);
    for(let i=0;i<300;i++)b.advance(1/30);
    assert(Math.abs(a.x-b.x)<1e-7);assert(Math.abs(a.x-153.75)<1e-7);
});
check('background resume cannot jump across the city',()=>{
    const w=new RoadWalker(line(),{random:()=>.99,pauses:false});w.start();const x=w.x;
    w.advance(300);assert(Math.abs(w.x-x)<=1.500001);
});
check('no reverse when a forward edge is available',()=>{
    const g=line(),w=new RoadWalker(g,{random:()=>.99,pauses:false});w.start();
    let x=w.x;for(let i=0;i<100;i++){w.advance(1/60);assert(w.x>=x);x=w.x;}
});
check('dead ends allow return on the learned road',()=>{
    const g=new CityRoadGraph();trace(g,[[0,0],[3.75,0],[7.5,0]]);
    const w=new RoadWalker(g,{random:()=>.99,pauses:false,minLength:0});
    for(let i=0;i<20;i++)w.advance(.05);
    assert(w.ready);assert(w.x>=0&&w.x<=7.5);
    assert([...g.nodes.values()].some(n=>n.links.size===1));
});
check('direction hysteresis suppresses boundary jitter',()=>{
    const vector=a=>[Math.cos(a*Math.PI/180),Math.sin(a*Math.PI/180)];
    assert.equal(directionFor(...vector(21),'SO'),'SO');
    assert.equal(directionFor(...vector(24),'O'),'O');
    assert.equal(directionFor(...vector(31),'O'),'SO');
    assert.equal(directionFor(-1,0,'O'),'W');
});
check('no movement until enough connected road has been learned',()=>{
    const g=new CityRoadGraph();trace(g,[[0,0],[4,0],[8,0]]);
    const w=new RoadWalker(g);w.advance(.1);assert.equal(w.ready,false);
});
check('bounded graph and full reset',()=>{
    const g=new CityRoadGraph({maxNodes:10});trace(g,Array.from({length:30},(_,i)=>[i*4,0]));
    assert.equal(g.nodes.size,10);assert.equal(g.edges.size,9);g.clear();
    assert.equal(g.nodes.size+g.edges.size+g.tracks.size+g.buckets.size+g.speeds.length,0);
});
console.log(`${checks} road graph checks passed`);
