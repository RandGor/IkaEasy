// Render an in-place walk from the approved raster model with a shared 2D mesh rig.
// Requires @napi-rs/canvas and sharp (bundled Codex runtime is supported via NODE_PATH).
// There is exactly ONE artwork-to-game scale. Never normalize individual frames.
const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/mascot/walk-v1');
const W = 73, H = 67, FRAMES = 12, SS = 4;
const SCALE = 34 / 476;
const GROUND = 52;
// Crop windows only exclude captions. They never determine rendering scale.
const views = [
    { name: 'N', crop: [0, 0, 328, 546], heading: [0, -1], side: 1 },
    { name: 'NO', crop: [328, 0, 327, 546], heading: [.5, -.8660254], side: 1 },
    { name: 'O', crop: [655, 0, 327, 546], heading: [1, 0], side: 1 },
    { name: 'SO', crop: [982, 0, 328, 546], heading: [.5, .8660254], side: -1 },
    { name: 'S', crop: [0, 610, 328, 500], heading: [0, 1], side: -1 },
    { name: 'SW', crop: [328, 610, 327, 500], heading: [-.5, .8660254], side: -1 },
    { name: 'W', crop: [655, 610, 327, 500], heading: [-1, 0], side: -1 },
    { name: 'NW', crop: [982, 610, 328, 500], heading: [-.5, -.8660254], side: 1 }
];
const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x*x*(3-2*x); };

// Stance moves backward at constant ground speed for half a cycle.
// Swing uses a smooth return with a raised foot. Opposite legs differ by 1/2 cycle.
function step(t) {
    t = (t % 1 + 1) % 1;
    if (t < .5) return { travel: 3.75 - 15*t, lift: 0 };
    const u = (t-.5)*2;
    return { travel: -3.75 + 7.5*smooth(u), lift: Math.sin(Math.PI*u)*1.15 };
}

function deform(x, y, phase, model) {
    const t = phase/FRAMES;
    const bob = -.35*(1-Math.cos(4*Math.PI*t)); // rigid torso bob: 0.7 px total
    const left = step(t), right = step(t+.5);
    const legSide = smooth((x-model.center+1.3)/2.6);
    const near = model.view.side > 0 ? left : right;
    const far = model.view.side > 0 ? right : left;
    const travel = near.travel*(1-legSide)+far.travel*legSide;
    const lift = near.lift*(1-legSide)+far.lift*legSide;
    const leg = smooth((y-(GROUND-6.8))/5.4);
    const lateral = Math.abs(x-model.center);
    const arm = smooth((lateral-model.halfWidth*.57)/(model.halfWidth*.29)) *
        smooth((y-(GROUND-21))/5) * (1-smooth((y-(GROUND-10))/2.2));
    const armSign = (x < model.center ? -1 : 1) * model.view.side;
    const armSwing = Math.cos(2*Math.PI*t)*1.25*armSign;
    const [dx, dy] = model.view.heading;
    // One shared orthographic depth foreshortening for all directions.
    const sx = dx*travel*leg + dx*armSwing*arm;
    const restDepth = model.footRestDepth[0]*(1-legSide)+model.footRestDepth[1]*legSide;
    const sy = (dy*.32*travel-lift-restDepth)*leg + dy*.32*armSwing*arm;
    return [(x+sx)*SS, (y+bob*(1-leg)+sy)*SS];
}

function triangle(ctx, texture, source, target) {
    const [[x0,y0],[x1,y1],[x2,y2]] = source;
    const [[u0,v0],[u1,v1],[u2,v2]] = target;
    const det = x0*(y1-y2)+x1*(y2-y0)+x2*(y0-y1);
    if (Math.abs(det) < 1e-8) return;
    const a = (u0*(y1-y2)+u1*(y2-y0)+u2*(y0-y1))/det;
    const c = (u0*(x2-x1)+u1*(x0-x2)+u2*(x1-x0))/det;
    const e = (u0*(x1*y2-x2*y1)+u1*(x2*y0-x0*y2)+u2*(x0*y1-x1*y0))/det;
    const b = (v0*(y1-y2)+v1*(y2-y0)+v2*(y0-y1))/det;
    const d = (v0*(x2-x1)+v1*(x0-x2)+v2*(x1-x0))/det;
    const f = (v0*(x1*y2-x2*y1)+v1*(x2*y0-x0*y2)+v2*(x0*y1-x1*y0))/det;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(u0,v0); ctx.lineTo(u1,v1); ctx.lineTo(u2,v2); ctx.closePath();
    ctx.clip(); ctx.transform(a,b,c,d,e,f); ctx.drawImage(texture,0,0); ctx.restore();
}

async function main() {
    fs.mkdirSync(out, { recursive: true });
    const file = path.join(root, 'docs/mascot/static-directions-v1.png');
    const sourceImage = await loadImage(file);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const models = [];
    for (const view of views) {
        const [cx,cy,cw,ch] = view.crop;
        let x0=cw, y0=ch, x1=0, y1=0;
        for (let y=0;y<ch;y++) for (let x=0;x<cw;x++) {
            if (data[((cy+y)*info.width+cx+x)*4+3] >= 128) {
                x0=Math.min(x0,x); y0=Math.min(y0,y); x1=Math.max(x1,x); y1=Math.max(y1,y);
            }
        }
        // Translation to a shared support anchor is allowed; scale is global.
        let weight=0, sumX=0;
        for (let y=y1-55;y<=y1;y++) for (let x=x0;x<=x1;x++) {
            const alpha=data[((cy+y)*info.width+cx+x)*4+3];
            if(alpha>=128){ weight+=alpha; sumX+=x*alpha; }
        }
        const groundX=sumX/weight;
        const footY=[y0,y0];
        for(let y=y1-60;y<=y1;y++) for(let x=x0;x<=x1;x++) {
            if(data[((cy+y)*info.width+cx+x)*4+3]>=128) {
                const side=x<groundX?0:1;footY[side]=Math.max(footY[side],y);
            }
        }
        const model = { view, center:36, halfWidth:(x1-x0+1)*SCALE/2,
            footRestDepth:footY.map(y=>(y-y1)*SCALE),
            bounds:[cx+x0,cy+y0,cx+x1+1,cy+y1+1], groundSource:[cx+groundX,cy+y1], scale:SCALE };
        const texture=createCanvas(W*SS,H*SS), tc=texture.getContext('2d');
        // Use only the silhouette rectangle, no labels; same fixed scale for every view.
        const padding=2;
        tc.drawImage(sourceImage,cx+x0-padding,cy+y0-padding,x1-x0+1+padding*2,y1-y0+1+padding*2,
            (36+(x0-padding-groundX)*SCALE)*SS,(GROUND+(y0-padding-y1)*SCALE)*SS,
            (x1-x0+1+padding*2)*SCALE*SS,(y1-y0+1+padding*2)*SCALE*SS);
        const strip=createCanvas(W*FRAMES*SS,H*SS), ctx=strip.getContext('2d');
        for(let frame=0;frame<FRAMES;frame++) {
            ctx.save(); ctx.translate(frame*W*SS,0);
            // Render the rigid head in one draw to avoid antialias seams between triangles.
            const headRows=15, headHeight=headRows*H/34*SS;
            const bob=-.35*(1-Math.cos(4*Math.PI*frame/FRAMES))*SS;
            ctx.drawImage(texture,0,0,W*SS,headHeight,0,bob,W*SS,headHeight);
            // Head/torso interior is rigid; skinning affects only the articulated extremities.
            for(let gy=headRows;gy<34;gy++) for(let gx=0;gx<37;gx++) {
                const x=gx*W/37, y=gy*H/34, xx=(gx+1)*W/37, yy=(gy+1)*H/34;
                const p=[[x,y],[xx,y],[xx,yy],[x,yy]];
                const s=p.map(([a,b])=>[a*SS,b*SS]);
                const d=p.map(([a,b])=>deform(a,b,frame,model));
                triangle(ctx,texture,[s[0],s[1],s[2]],[d[0],d[1],d[2]]);
                triangle(ctx,texture,[s[0],s[2],s[3]],[d[0],d[2],d[3]]);
            }
            ctx.restore();
        }
        // Whole-strip supersampling resolve; never fit, normalize, or resize a single frame.
        await sharp(strip.toBuffer('image/png')).resize(W*FRAMES,H).png().toFile(path.join(out,view.name+'.png'));
        models.push(model);
    }
    fs.writeFileSync(path.join(out,'rig.json'),JSON.stringify({
        source:'../static-directions-v1.png', approvedSource:true, animationApproved:true, frame:[W,H], frames:FRAMES,
        periodMs:1000, scale:SCALE, supersampling:SS, ground:[36,GROUND],
        method:'Shared continuous 2D mesh rig; no per-frame scale or generative poses',
        models
    },null,2)+'\n');
    console.log(`Rendered ${views.length} strips to ${out}`);
}
// Native canvas worker handles can keep this one-shot renderer alive on Windows.
main().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1);});
