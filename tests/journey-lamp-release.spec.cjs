const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const bundle=require('../content/portfolio.cjs');
const app=page=>page.locator('#app');
const ready=async(page,query='')=>{await page.goto('/?qa=1'+query);await expect(app(page)).toHaveAttribute('data-ready','true');};
async function clocked(page,query=''){
  const start=new Date('2026-10-23T10:00:00Z');
  await page.clock.install({time:start});await page.clock.pauseAt(start);await ready(page,query);
}
async function supplyJourney(page,records=bundle.journey){
  const source=fs.readFileSync('content.js','utf8');
  await page.route('**/content.js',route=>route.fulfill({contentType:'application/javascript',body:source+'\nwindow.journeyRepository={listPublished:async()=>'+JSON.stringify(records)+'};'}));
}

test('Automatic lamp uses the supplied clip 3.5 seconds after readiness and leaves sound locked until interaction',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    window.__lampTimes={};new MutationObserver(()=>{
      const a=document.querySelector('#app');if(!a)return;
      if(a.dataset.ready==='true')window.__lampTimes.ready??=performance.now();
      if(a.dataset.lamp==='lighting')window.__lampTimes.lighting??=performance.now();
    }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-ready','data-lamp']});
  });
  await ready(page);await expect(app(page)).toHaveAttribute('data-auto-lamp','waiting');
  await expect(page.locator('#lamp-discovery-glow')).toBeHidden();
  await expect(page.locator('#lamp-outline .hotspot-contour')).toHaveCSS('opacity','0');
  await expect(app(page)).toHaveAttribute('data-lamp','lighting',{timeout:6000});
  const times=await page.evaluate(()=>window.__lampTimes);
  expect(times.lighting-times.ready).toBeGreaterThanOrEqual(3450);
  expect(times.lighting-times.ready).toBeLessThan(5000);
  await expect(page.locator('#lighting-video')).toHaveClass(/is-active/);
  await expect(page.locator('#lamp-hotspot')).toBeDisabled();
  await page.screenshot({path:testInfo.outputPath('automatic-lamp-transition.png')});
  await expect(app(page)).toHaveAttribute('data-lamp','lit');
  await expect(page.locator('#lit-video')).toHaveClass(/is-active/);
  expect(await page.locator('#lit-video').evaluate(v=>v.loop&&!v.paused)).toBe(true);
  expect(await page.evaluate(()=>window.studioAudio.inspect().state)).not.toBe('running');
  await page.screenshot({path:testInfo.outputPath('automatic-lamp-lit.png')});
  await page.locator('#lamp-hotspot').click();await expect(app(page)).toHaveAttribute('data-lamp','dark');
  await page.waitForTimeout(3800);await expect(app(page)).toHaveAttribute('data-lamp','dark');
  expect(errors).toEqual([]);
});

test('Readiness starts the full delay; hover and keyboard focus do not cancel it',async({page})=>{
  const source=fs.readFileSync('projects.js','utf8');
  await page.route('**/projects.js',route=>route.fulfill({contentType:'application/javascript',body:source+'\nconst baseList=window.projectRepository.listPublished;window.projectRepository.listPublished=async()=>{await new Promise(resolve=>setTimeout(resolve,2000));return baseList();};'}));
  const start=new Date('2026-10-23T10:00:00Z');await page.clock.install({time:start});await page.clock.pauseAt(start);
  await page.goto('/?qa=1');await expect(app(page)).not.toHaveAttribute('data-ready','true',{timeout:300});
  await page.clock.runFor(2000);await expect(app(page)).toHaveAttribute('data-ready','true');
  await page.locator('#lamp-hotspot').hover();await page.locator('#lamp-hotspot').focus();
  await page.clock.runFor(3499);await expect(app(page)).toHaveAttribute('data-lamp','dark');
  await page.clock.runFor(1);await expect(app(page)).toHaveAttribute('data-lamp','lighting');
});

test('Manual switching cancels automatic activation and never relights after switching off',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await clocked(page);
  await page.clock.runFor(1000);await page.locator('#lamp-hotspot').click();await expect(app(page)).toHaveAttribute('data-lamp','lit');
  const off=await page.locator('#lamp-hotspot').evaluate(button=>{button.click();return document.querySelector('#app').dataset.lamp;});expect(off).toBe('dark');
  await page.clock.fastForward(15000);await expect(app(page)).toHaveAttribute('data-lamp','dark');
  await expect(app(page)).toHaveAttribute('data-auto-lamp','complete');
  await expect(page.locator('#lamp-discovery-glow')).toBeHidden();
});

test('Section navigation and hidden documents pause the remaining automatic delay',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await clocked(page);
  await page.clock.runFor(1000);await page.locator('#monitor-hotspot').click();await expect(app(page)).toHaveAttribute('data-state','projects');
  await page.clock.fastForward(10000);await expect(app(page)).toHaveAttribute('data-lamp','dark');
  await page.keyboard.press('Escape');await expect(app(page)).toHaveAttribute('data-state','room');
  // Controlled Page Visibility events exercise the policy without depending on
  // headless Chrome's window manager treating a second tab as backgrounded.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.fastForward(10000);await expect(app(page)).toHaveAttribute('data-lamp','dark');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(2499);await expect(app(page)).toHaveAttribute('data-lamp','dark');
  await page.clock.runFor(1);await expect(app(page)).toHaveAttribute('data-lamp','lit');
  expect(await page.locator('#lighting-video').evaluate(video=>video.currentTime)).toBe(0);
});

test('Deep links wait until return; narrow reduced-motion visitors get automatic light without a clip',async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.emulateMedia({reducedMotion:'reduce'});await clocked(page,'&view=about');
  await page.clock.fastForward(8000);await expect(app(page)).toHaveAttribute('data-lamp','dark');
  await page.keyboard.press('Escape');await expect(app(page)).toHaveAttribute('data-state','room');
  await page.clock.runFor(3500);await expect(app(page)).toHaveAttribute('data-lamp','lit');
  expect(await page.locator('#lighting-video').evaluate(v=>v.currentTime)).toBe(0);
  expect(await page.evaluate(()=>[...document.querySelectorAll('.room-video')].every(v=>v.paused))).toBe(true);
});

test('Approved career pins use document art; all details and return focus work at desktop and 320px',async({page},testInfo)=>{
  await supplyJourney(page);await page.emulateMedia({reducedMotion:'reduce'});
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:width===1440?900:844});await ready(page,'&view=journey');
    await expect(page.locator('.journey-pin')).toHaveCount(5);
    expect(await page.locator('.journey-pin').evaluateAll(pins=>pins.map(p=>p.dataset.milestone))).toEqual(['university','airbornehrs','robotics-club','think-computers','academic-recognition']);
    await expect(page.locator('.pin-document')).toHaveCount(5);await expect(page.locator('.pin-photo image')).toHaveCount(0);
    await expect(page.locator('.journey-board')).toBeInViewport({ratio:1});
    for(const record of bundle.journey){
      const pin=page.locator(`[data-milestone="${record.id}"]`);await pin.focus();
      await expect(page.locator('#milestone-detail h2')).toHaveText(record.title);await expect(pin).toHaveAttribute('aria-pressed','true');
    }
    await expect(page.locator('.milestone-result')).toHaveText('Top 10 · cohort CGPA');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`journey-${width}.png`)});
    await page.keyboard.press('Escape');await expect(page.locator(width<700?'#mobile-journey':'#journey-hotspot')).toBeFocused();
  }
});

test('Additional CMS chapters paginate without shrinking pins; uploaded photos override document art',async({page})=>{
  const records=Array.from({length:14},(_,i)=>({...bundle.journey[i%5],id:'chapter-'+i,title:'Chapter '+i,sortOrder:i,...(i===6?{imageUrl:'./assets/projects/pathforge-cover.svg',imageAlt:'Owner supplied photo'}:{})}));
  await supplyJourney(page,[...records,{...records[0],id:'draft',title:'Private chapter',status:'draft'}]);
  await ready(page,'&view=journey');await expect(page.locator('.journey-pin')).toHaveCount(6);
  const width=(await page.locator('.journey-pin').first().boundingBox()).width;
  await page.getByRole('button',{name:'Next journey page'}).click();await expect(page.locator('#milestone-detail h2')).toHaveText('Chapter 6');
  await expect(page.getByRole('img',{name:'Owner supplied photo'})).toBeVisible();
  expect(Math.abs((await page.locator('.journey-pin').first().boundingBox()).width-width)).toBeLessThan(1);
  await page.getByRole('button',{name:'Next journey page'}).click();await expect(page.locator('.journey-pin')).toHaveCount(2);
  await expect(page.locator('#object-panel')).not.toContainText('Private chapter');
  await expect(page.getByRole('button',{name:'Next journey page'})).toBeDisabled();
  await page.getByRole('button',{name:'Previous journey page'}).click();await expect(page.locator('#milestone-detail h2')).toHaveText('Chapter 6');
});
