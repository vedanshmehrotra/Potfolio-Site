const {chromium}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      const Native=window.AudioContext;
      window.AudioContext=class extends Native {
        createAnalyser(){const node=super.createAnalyser();window.__recordDestination=this.createMediaStreamDestination();node.connect(window.__recordDestination);return node;}
      };
    });
    await page.goto('http://127.0.0.1:4173/?qa=1&reference=1');
    await page.waitForFunction(()=>document.querySelector('#app').dataset.ready==='true');
    await page.locator('#cat-hotspot').hover();await page.waitForFunction(()=>!document.querySelector('#studio-cursor').hidden);await page.screenshot({path:'qa/cursor-cat.png'});
    if(!(await page.evaluate(()=>window.studioAudio.inspect().enabled)))await page.locator('#sound-toggle').click();
    else {await page.locator('#sound-settings-toggle').click();await page.locator('#sound-settings-toggle').click();}
    await page.waitForFunction(()=>window.studioAudio.inspect().loaded.length===2 && window.studioAudio.inspect().rain);
    await page.locator('#sound-settings-toggle').click();await page.screenshot({path:'qa/sound-controls.png'});
    // Record the actual browser mix, including its room filtering and volumes.
    await page.evaluate(()=> {
      window.__audioChunks=[];window.__recorder=new MediaRecorder(window.__recordDestination.stream);
      window.__recorder.ondataavailable=event=>window.__audioChunks.push(event.data);window.__recorder.start();
    });
    await page.waitForTimeout(1500);await page.locator('#cat-hotspot').click();await page.waitForTimeout(2600);
    await page.locator('#monitor-hotspot').click();await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='projects');
    await page.locator('#expanded-stage [data-back-room]').click();await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='room');
    const capture=await page.evaluate(()=>new Promise(resolve=>{
      window.__recorder.onstop=async()=> {const bytes=new Uint8Array(await new Blob(window.__audioChunks).arrayBuffer());let result='';for(let i=0;i<bytes.length;i++)result+=String.fromCharCode(bytes[i]);resolve(btoa(result));};window.__recorder.stop();
    }));
    fs.writeFileSync('qa/room-sound-preview.webm',Buffer.from(capture,'base64'));
    fs.writeFileSync('qa/feedback-diagnostics.json',JSON.stringify({errors,audio:await page.evaluate(()=>window.studioAudio.inspect())},null,2));
    await page.locator('#contact-hotspot').click();await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='contact');
    await page.evaluate(()=>window.contactRepository.send=()=>new Promise(resolve=>window.__finishSend=resolve));
    await page.locator('#contact-message').fill('Cursor preview only; no real message is sent.');
    await page.locator('[type=submit]').click();await page.locator('[type=submit]').hover();await page.waitForFunction(()=>!document.querySelector('#studio-cursor').hidden);
    await page.screenshot({path:'qa/cursor-hourglass.png'});await page.evaluate(()=>window.__finishSend({ok:true}));
    await page.waitForFunction(()=>!document.querySelector('[aria-busy=true]'));
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa/sound-mobile-contact.png'});
    const names=['arrow','point','grab','closed','pet-sheet','wait-sheet'];
    fs.writeFileSync('qa/feedback-review.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio sound and cursor review</title><link rel="stylesheet" href="../feedback.css"><style>@font-face{font-family:pixel;src:url('../assets/Tiny5-Regular.ttf')}body{background:#0c1923;color:#ecdec3;max-width:1100px;margin:24px auto;padding:0 20px;font:21px pixel,monospace;--pixel:pixel}h1,h2{font-weight:400}a{color:#b5ddc3}.sprites{display:flex;gap:30px;flex-wrap:wrap}.sample{width:120px;padding:14px;border:1px solid #586769}.sprite{width:32px;height:32px;background-repeat:no-repeat;image-rendering:pixelated;position:static}img.shot{width:100%;margin-bottom:24px}audio{display:block;width:min(100%,420px);margin:16px 0}p{line-height:1.4}</style><h1>Sound / contextual cursor prototype</h1><a href="../">Open interactive studio</a><p>Sound defaults ON and starts with your first interaction. Mute and volume preferences are remembered. The preview below was recorded from the actual browser mix: indoor rain, one cat purr, then Projects entry and return. The revised mix has substantially more volume headroom.</p><audio controls preload="none" src="room-sound-preview.webm"></audio><a href="../assets/audio/CREDITS.md">Recording sources and licenses</a><p><a href="audio-lamp-review.html">Revised levels, lamp hint and inline validation review</a></p><h2>Cursor family / actual size</h2><div class="sprites">${names.map(name=>`<div class="sample"><div class="sprite ${name.includes('sheet')?'studio-cursor':''}" ${name.includes('sheet')?`data-kind="${name==='pet-sheet'?'pet':'wait'}"`:`style="background-image:url('../assets/cursors/${name}.svg')"`}></div><p>${name}</p></div>`).join('')}</div><h2>Petting hand / original cat artwork</h2><img class="shot" src="cursor-cat.png" alt="Petting hand cursor over the existing cat"><h2>Sound controls</h2><img class="shot" src="sound-controls.png" alt="Compact sound controls with independent volumes"><h2>Hourglass / pending demo send</h2><p>This screenshot uses a controlled test promise. No email was sent.</p><img class="shot" src="cursor-hourglass.png" alt="Hourglass while a demo message waits"><h2>Portrait controls</h2><img style="max-width:390px;width:100%" src="sound-mobile-contact.png" alt="Sound control in portrait contact interface"></html>`);
    await page.goto('http://127.0.0.1:4173/qa/feedback-review.html');await page.setViewportSize({width:1100,height:900});await page.screenshot({path:'qa/cursor-family-review.png'});
    if(errors.length)throw new Error(errors.join('\n'));
    console.log('Captured cursor screenshots, browser audio mix and feedback review.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
