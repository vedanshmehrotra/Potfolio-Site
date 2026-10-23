const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const origin='http://127.0.0.1:4173';
const ready=async(page,query='')=>{await page.goto(`${origin}/?qa=1${query}`);await page.waitForFunction(()=>document.querySelector('#app').dataset.ready==='true');};
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true}),errors=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'qa/recordings',size:{width:1440,height:900}}});
    const live=await context.newPage();live.on('pageerror',error=>errors.push(error.message));await ready(live);
    await live.screenshot({path:'qa/lamp-hint-before.png'});
    await live.waitForFunction(()=>document.querySelector('#app').dataset.lamp==='lighting');
    await live.waitForTimeout(500);await live.screenshot({path:'qa/lamp-hint-glow.png'});
    await live.waitForFunction(()=>document.querySelector('#app').dataset.lamp==='lit');
    await live.screenshot({path:'qa/lamp-hint-dismissed.png'});
    const video=live.video();await context.close();await video.saveAs('qa/lamp-automatic-lighting.webm');
    const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',error=>errors.push(error.message));await ready(page,'&reference=1');
    await page.locator('#contact-hotspot').click();await page.waitForFunction(()=>document.querySelector('#app').dataset.state==='contact');
    let sends=0;await page.route('**/api/contact',route=>{sends++;return route.fulfill({status:503,json:{error:'Preview only'}});});
    await page.locator('[type=submit]').click();await page.locator('#contact-message-error').scrollIntoViewIfNeeded();
    await page.screenshot({path:'qa/contact-inline-desktop.png'});
    await page.setViewportSize({width:320,height:568});await ready(page,'&view=contact');
    await page.locator('#contact-email').fill('invalid');await page.locator('[type=submit]').click();await page.locator('#contact-message-error').scrollIntoViewIfNeeded();
    await page.screenshot({path:'qa/contact-inline-mobile.png'});
    if(sends)throw new Error('Invalid preview submitted a request');
    fs.writeFileSync('qa/audio-lamp-review.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Audio levels, lamp hint and validation</title><style>@font-face{font-family:pixel;src:url('../assets/Tiny5-Regular.ttf')}body{margin:24px auto;padding:0 20px;max-width:1100px;background:#0c1923;color:#ecdec3;font:21px pixel,monospace}h1,h2{font-weight:400}a{color:#b5ddc3}p{line-height:1.4;max-width:900px}img,video{width:100%;margin:16px 0}audio{display:block;width:min(100%,460px);margin:16px 0}.mobile{max-width:320px}</style></head><body><h1>Audio / bulb hint / inline validation</h1><a href="../">Open studio</a><p>The mix has more headroom. Start around the middle of the sliders and adjust for your speakers. Sound defaults ON, starts on interaction, and keeps your mute preference.</p><h2>Current browser mix</h2><p>Indoor rain, a purr, then Projects entry and return. Recorded from the actual browser audio graph.</p><audio controls preload="metadata" src="room-sound-preview.webm"></audio><h2>Previous mix</h2><p>The earlier, quieter rain/purr preview for comparison.</p><audio controls preload="none" src="room-sound-before-levels.webm"></audio><h2>Automatic lamp lighting</h2><p>The studio waits 3.5 seconds after readiness, then plays the supplied lamp activation clip. Manual switching takes priority. The timer pauses inside sections or hidden tabs. Reduced motion lights the room directly.</p><video controls muted playsinline preload="metadata" src="lamp-automatic-lighting.webm"></video><h2>Dark / transition / lit</h2><img src="lamp-hint-before.png" alt="Dark room before bulb cue"><img src="lamp-hint-glow.png" alt="Supplied lamp transition playing"><img src="lamp-hint-dismissed.png" alt="Warm room after automatic lighting"><h2>Contact errors inside the app</h2><p>Reply email remains optional. Invalid fields are labelled below their inputs, with focus on the first invalid field. These previews sent no message.</p><img src="contact-inline-desktop.png" alt="Pixel-styled message validation"><img class="mobile" src="contact-inline-mobile.png" alt="Inline errors on a 320-pixel phone"><p><a href="feedback-review.html">Cursor and sound controls review</a></p></body></html>`);
    if(errors.length)throw new Error(errors.join('\n'));
    console.log('Captured automatic lighting, inline validation, and review page.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
