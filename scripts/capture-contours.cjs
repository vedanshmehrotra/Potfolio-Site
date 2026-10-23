const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const regions={lamp:{x:380,y:335,width:145,height:135},resume:{x:235,y:645,width:335,height:130},books:{x:120,y:100,width:185,height:140},journey:{x:525,y:20,width:485,height:295}};
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    if(process.argv.includes('--source') || process.argv.includes('--trace')) {
      let outlines={};
      if(process.argv.includes('--trace')) {
        await page.goto('http://127.0.0.1:4173/?reference=1');await page.waitForFunction(()=>document.querySelector('#app').dataset.ready==='true');
        outlines=await page.evaluate(()=>Object.fromEntries(['lamp','resume','bookshelf','journey'].map(name=>{
          const svg=document.querySelector(`#${name}-outline`);
          return [name,{x:parseFloat(svg.style.left),y:parseFloat(svg.style.top),contour:svg.querySelector('.hotspot-contour').outerHTML}];
        })));
      }
      for(const [name,r] of Object.entries(regions)) {
        const lines=[];
        for(let x=Math.ceil(r.x/10)*10;x<r.x+r.width;x+=10)lines.push(`<path d="M${x} ${r.y}v${r.height}"/><text x="${x+1}" y="${r.y+5}">${x}</text>`);
        for(let y=Math.ceil(r.y/10)*10;y<r.y+r.height;y+=10)lines.push(`<path d="M${r.x} ${y}h${r.width}"/><text x="${r.x+1}" y="${y-1}">${y}</text>`);
        const width=r.width*3,height=r.height*3;
        await page.setViewportSize({width,height});
        const outline=outlines[name==='books'?'bookshelf':name];
        const overlay=outline?`<g transform="translate(${outline.x},${outline.y})" fill="none" stroke="#f1d9a3" stroke-width=".7">${outline.contour}</g>`:lines.join('');
        await page.setContent(`<style>body{margin:0}svg{display:block;image-rendering:pixelated}path:not(.hotspot-contour){stroke:#efdd9f;stroke-width:.2;opacity:.4}.hotspot-contour{stroke:#f1d9a3;stroke-width:.7;opacity:1}text{fill:#fff0be;font:4px monospace;paint-order:stroke;stroke:#03111a;stroke-width:1}</style><svg width="${width}" height="${height}" viewBox="${r.x} ${r.y} ${r.width} ${r.height}"><image href="http://127.0.0.1:4173/assets/studio-lit.png" width="1672" height="941"/>${overlay}</svg>`);
        await page.waitForFunction(()=>document.querySelector('image').getBBox().width>0);await page.waitForTimeout(150);
        await page.screenshot({path:`qa/${name}-${outline?'traced-detail':'source-grid'}.png`});
      }
    } else {
      await page.goto('http://127.0.0.1:4173/?qa=1&reference=1');
      await page.waitForFunction(()=>document.querySelector('#app').dataset.ready==='true');
      await page.mouse.move(1400,850);await page.screenshot({path:'qa/lamp-first-visit.png'});
      for(const name of ['lamp','resume','bookshelf','journey']) {
        await page.locator(`#${name}-hotspot`).hover();await page.screenshot({path:`qa/${name}-contour.png`});
      }
      await page.locator('#lamp-hotspot').click();await page.waitForFunction(()=>document.querySelector('#app').dataset.lamp==='lit');
      await page.mouse.move(1400,850);await page.screenshot({path:'qa/lamp-lit-no-cue.png'});
      await page.locator('#lamp-hotspot').click();await page.waitForFunction(()=>document.querySelector('#app').dataset.lamp==='dark');
      await page.locator('#lamp-hotspot').hover();await page.screenshot({path:'qa/lamp-manually-dark-no-cue.png'});
      fs.writeFileSync('qa/contours-review.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lamp and object contours</title><style>@font-face{font-family:pixel;src:url('../assets/Tiny5-Regular.ttf')}body{margin:24px auto;padding:0 20px;max-width:1200px;background:#0c1923;color:#e6dec7;font:20px pixel,monospace}h1,h2{font-weight:400}a{color:#b1dfcf}img{width:100%;image-rendering:pixelated}section{margin:36px 0}p{max-width:850px;line-height:1.4}</style></head><body><h1>Lamp / traced object contours</h1><a href="../">Open studio</a><p>The room starts dark. The lamp shade has one faint discovery contour per page load. After its first activation, only the small action caption remains on hover; the contour does not return when the light is manually switched off. Keyboard focus keeps a separate small marker for accessibility.</p>${[['First visit / before hovering','lamp-first-visit'],['Lamp / first hover','lamp-contour'],['Journal / full page edge','resume-contour'],['Books / individual spine silhouette','bookshelf-contour'],['Journey / board frame','journey-contour'],['Lit / discovery contour removed','lamp-lit-no-cue'],['Manually dark / contour stays removed','lamp-manually-dark-no-cue']].map(([label,file])=>`<section><h2>${label}</h2><img src="${file}.png" alt="${label}"></section>`).join('')}</body></html>`);
    }
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
