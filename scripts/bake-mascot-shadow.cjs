// Composite an ImageGen shadow texture UNDER the approved pixels at native size.
// Never resample, recrop, realign or regenerate a body frame.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const directions = ['N','NO','O','SO','S','SW','W','NW'];
const placement = { left:32, top:48, width:25, height:14 };
async function main() {
    const source = path.join(root,'docs/mascot/shadow-source.png');
    // Fixed crop removes the empty generation canvas, not any character artwork.
    const shadow = await sharp(source).extract({left:340,top:465,width:660,height:380})
        .resize(placement.width,placement.height).ensureAlpha().raw().toBuffer();
    for(let i=0;i<shadow.length;i+=4) {
        shadow[i]=shadow[i+1]=shadow[i+2]=0;
        shadow[i+3]=Math.round(shadow[i+3]*.5); // native reference: ~25–30% black
    }
    const out=path.join(root,'docs/mascot/walk-v2');
    fs.mkdirSync(out,{recursive:true});
    for(const direction of directions) {
        const {data,info}=await sharp(path.join(root,'docs/mascot/walk-v1',direction+'.png'))
            .ensureAlpha().raw().toBuffer({resolveWithObject:true});
        if(info.width!==876||info.height!==67)throw Error('Invalid source strip '+direction);
        for(let frame=0;frame<12;frame++)for(let y=0;y<placement.height;y++)for(let x=0;x<placement.width;x++) {
            const i=((y+placement.top)*876+frame*73+x+placement.left)*4;
            const sa=shadow[(y*placement.width+x)*4+3]/255, fa=data[i+3]/255;
            if(!sa||fa===1)continue;
            const alpha=fa+sa*(1-fa);
            for(let c=0;c<3;c++)data[i+c]=Math.round(data[i+c]*fa/alpha);
            data[i+3]=Math.round(alpha*255);
        }
        await sharp(data,{raw:{width:876,height:67,channels:4}}).png().toFile(path.join(out,direction+'.png'));
    }
    await sharp(shadow,{raw:{width:placement.width,height:placement.height,channels:4}})
        .png().toFile(path.join(out,'shadow.png'));
    fs.writeFileSync(path.join(out,'shadow.json'),JSON.stringify({
        source:'../shadow-source.png',bodySource:'../walk-v1',frame:[73,67],frames:12,
        placement,opacityMultiplier:.5,lightDirection:'bottom-right',
        method:'One ground-fixed ImageGen shadow composited behind unchanged approved body frames'
    },null,2)+'\n');
    console.log('Baked shadows into all 8 strips; approved foregrounds unchanged.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
