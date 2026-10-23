const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ready = async page => {
  await page.goto('/?qa=1');
  await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
};
const enter = async page => {
  await page.locator('#monitor-hotspot').click({position:{x:284,y:134}});
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
};
const settleVideo = async page => {
  await page.evaluate(async () => {
    const video = document.querySelector('.room-video.is-active');
    if (video.readyState < 2) await new Promise(resolve=>video.addEventListener('loadeddata',resolve,{once:true}));
    video.pause();
    if (Math.abs(video.currentTime-.125) > .001) {
      video.currentTime=.125;
      await new Promise(resolve=>video.addEventListener('seeked',resolve,{once:true}));
    }
  });
};

test('locked video bytes are unchanged', async () => {
  const records=JSON.parse(fs.readFileSync('qa/asset-hashes.json','utf8').replace(/^\uFEFF/,''));
  for (const record of records) {
    const hash=crypto.createHash('sha256').update(fs.readFileSync(path.basename(record.Path))).digest('hex').toUpperCase();
    expect(hash).toBe(record.Hash);
  }
});

test('lamp plays the supplied clip, hands off to lit loop, and survives Projects', async ({page}) => {
  await ready(page);
  await page.locator('#lamp-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lighting');
  await expect(page.locator('#lighting-video')).toHaveClass(/is-active/);
  expect(await page.locator('#lighting-video').getAttribute('src')).toBe('./after_hours_transition_clean_2s.mp4');
  await expect(page.locator('#monitor-hotspot')).toBeDisabled();
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
  await expect(page.locator('#lit-video')).toHaveClass(/is-active/);
  expect(await page.locator('#lit-video').evaluate(v=>!v.paused && v.loop)).toBe(true);
  await enter(page);
  await page.getByRole('button',{name:'Back to studio',exact:true}).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
  await expect(page.locator('#lit-video')).toHaveClass(/is-active/);
  expect(await page.locator('#lit-video').evaluate(v=>!v.paused)).toBe(true);
});

test('three shared cards, carousel selection, details and browser Back', async ({page}) => {
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await ready(page);
  const originalVideo=await page.locator('#dark-video').elementHandle();
  expect(await page.locator('#monitor-live .card-title').allTextContents()).toEqual(['TrailMap','PixelJournal','DevTools']);
  await enter(page);
  await expect(page.locator('#expanded-stage .pixel-card')).toHaveCount(3);
  expect(await page.locator('#expanded-stage .card-title').allTextContents()).toEqual(await page.locator('#monitor-live .card-title').allTextContents());
  await page.getByRole('button',{name:'Next project',exact:true}).click();
  await expect(page.locator('#monitor-live .pixel-card.is-selected .card-title')).toHaveText('PixelJournal');
  await expect(page.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText('PixelJournal');
  await page.getByRole('button',{name:'Open PixelJournal, sample project preview',exact:true}).click();
  await expect(page).toHaveURL(/project=pixeljournal-preview/);
  await expect(page.locator('#project-detail h1')).toHaveText('PixelJournal');
  await page.goBack();
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.goBack();
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await expect(page.locator('#monitor-hotspot')).toBeFocused();
  expect(await originalVideo.evaluate(v=>v===document.querySelector('#dark-video'))).toBe(true);
  expect(errors).toEqual([]);
});

test('keyboard focus stays in Projects and Escape returns detail then room', async ({page}) => {
  await ready(page);
  await page.keyboard.press('Tab');
  await expect(page.locator('#monitor-hotspot')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await expect(page.locator('#projects-title')).toBeFocused();
  expect(await page.locator('#scene-viewport').evaluate(el=>el.inert)).toBe(true);
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#sound-settings-toggle')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.locator('#sound-toggle')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button',{name:'Next project',exact:true})).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#sound-toggle')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#sound-settings-toggle')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button',{name:'Back to studio',exact:true})).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText('PixelJournal');
  await page.getByRole('button',{name:'Open PixelJournal, sample project preview',exact:true}).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#app')).toHaveAttribute('data-state','detail');
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await expect(page.locator('#monitor-hotspot')).toBeFocused();
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','dark');
});

test('deep link refresh, unknown project and direct-entry Back', async ({page}) => {
  await page.goto('/?project=pixeljournal-preview');
  await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#project-detail h1')).toHaveText('PixelJournal');
  await page.reload();
  await expect(page.locator('#project-detail h1')).toHaveText('PixelJournal');
  await page.locator('[data-back-list]').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.getByRole('button',{name:'Back to studio',exact:true}).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await page.goto('/?project=missing');
  await expect(page.locator('#project-detail h1')).toHaveText('Project not found');
});

test('reduced motion has no camera rush, paused ambient and accessible lamp handoff', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'}); await ready(page);
  expect(await page.locator('#dark-video').evaluate(v=>v.paused)).toBe(true);
  await page.locator('#lamp-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
  await enter(page);
  expect(await page.evaluate(()=>document.querySelector('#world').getAnimations().length)).toBe(0);
  expect(await page.evaluate(()=>window.__studioDiagnostics.cameraRuns.length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
});

test('changing motion preference during lighting and entry settles safely', async ({page}) => {
  await ready(page);
  await page.locator('#lamp-hotspot').click();
  await expect(page.locator('#lighting-video')).toHaveClass(/is-active/);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
  expect(await page.locator('#lighting-video').evaluate(v=>v.paused)).toBe(true);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.locator('#monitor-hotspot').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  expect(await page.locator('#world').evaluate(el=>el.getAnimations().length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
});

test('duplicate activation, Back during entry and resize cannot strand the controller', async ({page}) => {
  await ready(page);
  const historyLength=await page.evaluate(()=>history.length);
  await page.evaluate(()=>{for(let i=0;i<12;i++)document.querySelector('#monitor-hotspot').click();});
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  expect(await page.evaluate(()=>history.length)).toBe(historyLength+1);
  await page.keyboard.press('Escape'); await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await page.locator('#monitor-hotspot').click(); await page.goBack();
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await expect(page.locator('#monitor-hotspot')).toBeEnabled();
  await page.locator('#monitor-hotspot').click(); await page.setViewportSize({width:768,height:1024});
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.keyboard.press('Escape'); await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  const coverage=await page.locator('#world').boundingBox();
  expect(coverage.width).toBeGreaterThanOrEqual(767); expect(coverage.height).toBeGreaterThanOrEqual(1023);
});

test('mobile fills the screen, pans the room, swipes cards and returns', async ({page},testInfo) => {
  await page.setViewportSize({width:390,height:844}); await ready(page);
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled',{enabled:true});
  const world=await page.locator('#world').boundingBox(); expect(world.height).toBeGreaterThanOrEqual(844);
  await page.mouse.move(160,700); await page.mouse.down(); await page.mouse.move(300,700,{steps:8}); await page.mouse.up();
  await expect(page.locator('#app')).toHaveClass(/has-panned/);
  await page.locator('#mobile-projects').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await expect(page.locator('#expanded-stage .pixel-card')).toHaveCount(3);
  const cardBox = await page.locator('#expanded-stage .pixel-card').first().boundingBox();
  const swipeY = cardBox.y + cardBox.height / 2;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:320,y:swipeY}]});
  for (let i=1;i<=12;i++) {
    await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:320-i*21,y:swipeY}]});
    await page.waitForTimeout(16);
  }
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await expect(page.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText('PixelJournal');
  await expect.poll(async()=>{
    const box=await page.locator('#expanded-stage .pixel-card.is-selected').boundingBox(); return Math.abs(box.x+box.width/2-195);
  }).toBeLessThan(15);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({path:testInfo.outputPath('mobile-projects.png')});
  await page.keyboard.press('Escape'); await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await page.screenshot({path:testInfo.outputPath('mobile-room.png')});
});

test('empty and failed data have explicit states; drafts are not shown', async ({page}) => {
  await page.route('**/projects.js',route=>route.fulfill({contentType:'text/javascript',body:'window.projectRepository={listPublished:async()=>[]};'}));
  await ready(page); await expect(page.locator('#monitor-live')).toContainText('No projects yet');
  await enter(page); await expect(page.locator('#expanded-stage')).toContainText('No projects yet');
  await page.unroute('**/projects.js');
  await page.route('**/projects.js',route=>route.fulfill({contentType:'text/javascript',body:'window.projectRepository={listPublished:async()=>{throw new Error("offline")}};'}));
  await ready(page); await expect(page.locator('#monitor-live')).toContainText('Projects unavailable');
  await page.unroute('**/projects.js');
  await page.route('**/projects.js',route=>route.fulfill({contentType:'text/javascript',body:'window.projectRepository={listPublished:async()=>[{id:"p",slug:"published",title:"Published",shortSummary:"Public",status:"published",sortOrder:1,tags:[]},{id:"d",slug:"draft",title:"Secret draft",status:"draft",sortOrder:2,tags:[]}]};'}));
  await ready(page); await expect(page.locator('#monitor-live .card-title')).toHaveText('Published');
  await expect(page.locator('#monitor-live')).not.toContainText('Secret draft');
});

test('save alignment and authored transition frames; measure an uninterrupted entry', async ({page,browser},testInfo) => {
  for(const [width,height] of [[1440,900],[1920,1080],[768,1024]]) {
    await page.setViewportSize({width,height}); await ready(page); await settleVideo(page);
    await page.screenshot({path:testInfo.outputPath(`room-${width}x${height}.png`)});
    const rects=await page.evaluate(()=>{
      const a=document.querySelector('#monitor-live').getBoundingClientRect(),b=document.querySelector('#monitor-hotspot').getBoundingClientRect();
      return {screen:{x:a.x,y:a.y,w:a.width,h:a.height},hotspot:{x:b.x,y:b.y,w:b.width,h:b.height}};
    });
    expect(rects.screen).toEqual(rects.hotspot);
    await enter(page); await page.screenshot({path:testInfo.outputPath(`projects-${width}x${height}.png`)});
  }
  await page.setViewportSize({width:1440,height:900}); await ready(page); await settleVideo(page);
  await page.locator('#monitor-hotspot').click();
  for(const time of [170,330,470]) {
    await page.evaluate(time=>{
      for(const a of document.getAnimations()) {a.pause();a.currentTime=time;}
    },time);
    await page.screenshot({path:testInfo.outputPath(`entry-${time}ms.png`)});
  }
  await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.keyboard.press('Escape');
  for (const time of [160,330]) {
    await page.evaluate(time=>{for(const a of document.getAnimations()) {a.pause();a.currentTime=time;}},time);
    await page.screenshot({path:testInfo.outputPath(`exit-${time}ms.png`)});
  }
  await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await page.screenshot({path:testInfo.outputPath('exit-room.png')});
  await enter(page);
  const runs=await page.evaluate(()=>window.__studioDiagnostics.cameraRuns);
  fs.writeFileSync(testInfo.outputPath('camera-timing.json'),JSON.stringify(runs,null,2));
  expect(runs.at(-1).frameGaps.length).toBeGreaterThan(8);
  expect(await page.locator('#dark-video').evaluate(v=>v.paused)).toBe(true);
  for(const dpr of [1.25,2]) {
    const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:dpr});
    const retina=await context.newPage(); await ready(retina); await settleVideo(retina);
    await retina.screenshot({path:testInfo.outputPath(`monitor-dpr-${dpr}.png`)}); await context.close();
  }
});
