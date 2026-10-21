const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'qa/recordings',size:{width:1440,height:900}}});
    const page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const state=value=>page.waitForFunction(value=>document.querySelector('#app').dataset.state===value,value);
    await page.goto('http://127.0.0.1:4173/?qa=1&reference=1');
    await page.waitForFunction(()=>document.querySelector('#app').dataset.ready==='true');
    const sections=await page.evaluate(()=>Object.keys(window.studioSections.targets));
    await page.screenshot({path:'qa/sections-room.png'});
    for(const section of sections) {
      await page.locator(`#${section}-hotspot`).click();
      await page.waitForFunction(()=>document.querySelector('#world').getAnimations().length>0);
      for(const time of [170,330,470]) {
        await page.evaluate(time=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=time;}),time);
        await page.screenshot({path:`qa/${section}-entry-${time}ms.png`});
      }
      await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));await state(section);
      await page.screenshot({path:`qa/${section}-desktop.png`});
      await page.waitForTimeout(500);
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='leaving');
      await page.waitForFunction(()=>document.querySelector('#world').getAnimations().length>0);
      await page.evaluate(()=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=250;}));
      await page.screenshot({path:`qa/${section}-return-250ms.png`});
      await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));await state('room');
    }
    // Uninterrupted entrance and return footage follows the sampled frames.
    for(const section of sections) {
      await page.locator(`#${section}-hotspot`).click();await state(section);
      await page.waitForTimeout(600);await page.keyboard.press('Escape');await state('room');
    }
    await page.locator('#about-hotspot').click();await state('about');
    await page.screenshot({path:'qa/about-personal-desktop.png'});
    console.log('About bounds',await page.locator('#about-stage').evaluate(el=>({stageBottom:el.getBoundingClientRect().bottom,footerBottom:el.querySelector('.about-footer').getBoundingClientRect().bottom})));
    await page.keyboard.press('Escape');await state('room');
    await page.locator('#monitor-hotspot').click();await state('projects');
    await page.locator('#expanded-stage .pixel-card').first().click();await state('detail');
    await page.screenshot({path:'qa/project-file-desktop.png'});
    await page.keyboard.press('Escape');await state('projects');await page.keyboard.press('Escape');await state('room');
    await page.setViewportSize({width:390,height:844});
    for(const section of sections) {
      await page.locator(`#mobile-${section}`).click();await state(section);
      await page.screenshot({path:`qa/${section}-mobile.png`});
      await page.keyboard.press('Escape');await state('room');
    }
    const recording=await page.video().path();await context.close();
    fs.copyFileSync(recording,'qa/sections-review.webm');
    const titles={journey:'Journey / pinned memories',resume:'Journal / resume chapters',contact:'Phone / contact composer',bookshelf:'Bookshelf / reading and notes'};
    fs.writeFileSync('qa/sections-review.html',`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio sections / browser review</title><style>
@font-face{font-family:pixel;src:url('../assets/Tiny5-Regular.ttf')}*{box-sizing:border-box}body{margin:0;padding:24px;background:#0c1923;color:#dfdcc9;font:20px/1.4 pixel,monospace}main{max-width:1200px;margin:auto}h1,h2{font-weight:400}h1{font-size:36px}a{color:#a9ddc8}nav{display:flex;gap:18px;flex-wrap:wrap}video{width:100%;background:#030b15}figure{margin:20px 0}img{width:100%;image-rendering:pixelated}figcaption,p{color:#b9bdad}.shots{display:grid;grid-template-columns:2fr 1fr;gap:20px;align-items:start}.frames{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}section{margin-top:48px;border-top:1px solid #52615e;padding-top:12px}@media(max-width:650px){body{padding:16px}.shots{grid-template-columns:1fr}.shots img.phone{max-width:390px}.frames{grid-template-columns:1fr 1fr}}
</style></head><body><main><h1>Studio / interaction review</h1>
<p>Working frontend prototype. Original room artwork and ambient clips are unchanged. Sample content is labelled. Physical objects change from the baked artwork into their interactive view at the end of the zoom.</p>
<nav><a href="../">Enter studio</a>${sections.map(name=>`<a href="../?view=${name}">${titles[name].split(' / ')[0]}</a>`).join('')}<a href="../?view=projects">Projects</a><a href="../?view=about">About</a></nav>
<h2>Entrance and return recording</h2><p>The recording first pauses at sampled times, then repeats each entrance and return uninterrupted.</p><video controls preload="metadata" src="sections-review.webm"></video>
${sections.map(name=>`<section><h2>${titles[name]}</h2><div class="shots"><figure><img src="${name}-desktop.png" alt="${titles[name]} on desktop"><figcaption>Desktop / 1440 × 900</figcaption></figure><figure><img class="phone" src="${name}-mobile.png" alt="${titles[name]} on a phone"><figcaption>Phone / 390 × 844</figcaption></figure></div><div class="frames">${[170,330,470].map(time=>`<figure><img src="${name}-entry-${time}ms.png" alt="${name} entrance at ${time} milliseconds"><figcaption>Entrance / ${time} ms</figcaption></figure>`).join('')}<figure><img src="${name}-return-250ms.png" alt="${name} return at 250 milliseconds"><figcaption>Return / 250 ms</figcaption></figure></div></section>`).join('')}
<section><h2>Project files / personal About</h2><img src="project-file-desktop.png" alt="Project case study with Overview, Engineering, Evidence and Stack navigation"><img src="about-personal-desktop.png" alt="Personal About page with GitHub and LinkedIn links"></section>
<section><h2>Connections to configure later</h2><p>The PDF is replaceable independently of the resume chapters. The supplied CV is not copied into public assets while its contact details await your choice.</p><p>The contact form validates input and preserves failed drafts. The Vercel mail handler is prepared; real delivery remains disabled until server settings and abuse controls are configured. Tests use mocked delivery. Database persistence and admin authentication are still to be integrated.</p></section></main></body></html>`);
    console.log(JSON.stringify({sections,errors}));
    if(errors.length)process.exitCode=1;
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
