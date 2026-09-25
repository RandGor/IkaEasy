// A labelled animated contact sheet for review, not an in-game asset.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'docs/mascot/walk-v2');
const directions = ['N','NO','O','SO','S','SW','W','NW'];
async function main() {
    const sprites = await Promise.all(directions.map(d=>loadImage(path.join(dir,d+'.png'))));
    const width=876, height=454, frames=[];
    for(let f=0;f<12;f++) {
        const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
        ctx.fillStyle='#202b32';ctx.fillRect(0,0,width,height);
        for(let i=0;i<8;i++) {
            const x=i%4*219,y=Math.floor(i/4)*227;
            ctx.fillStyle='#cbbb91';ctx.fillRect(x+2,y+25,215,200);
            ctx.font='bold 14px sans-serif';ctx.fillStyle='#f1d798';ctx.textAlign='center';
            ctx.fillText(directions[i],x+109,y+18);
            ctx.imageSmoothingEnabled=false;
            ctx.drawImage(sprites[i],f*73,0,73,67,x,y+25,219,201);
        }
        frames.push(Buffer.from(ctx.getImageData(0,0,width,height).data));
    }
    await sharp(Buffer.concat(frames),{raw:{width,height:height*12,channels:4,pageHeight:height}})
        .gif({loop:0,delay:[80,80,90,80,80,90,80,80,90,80,80,90],colours:256,dither:0})
        .toFile(path.join(root,'docs/mascot/walk-preview.gif'));
    console.log('Saved docs/mascot/walk-preview.gif (12 frames, 1000 ms, magnification x3)');
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});
