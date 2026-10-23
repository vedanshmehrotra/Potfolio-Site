const {test,expect}=require('@playwright/test');
const ready=async(page,query='')=>{
  await page.goto(`/?qa=1${query}`);await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
};
const contour=page=>page.locator('#lamp-outline .hotspot-contour');
test('Reference captures stay dark without a discovery glow or shade contour',async({page},testInfo)=>{
  await ready(page,'&reference=1');await page.mouse.move(1400,850);
  await expect(page.locator('#app')).toHaveAttribute('data-lamp-discovery','false');
  await expect(contour(page)).toHaveCSS('opacity','0');
  await expect(page.locator('#lamp-discovery-glow')).toBeHidden();
  expect(await contour(page).getAttribute('d')).toContain('C');
  await page.waitForTimeout(3800);await expect(page.locator('#app')).toHaveAttribute('data-lamp','dark');
  await page.screenshot({path:testInfo.outputPath('lamp-reference-dark.png')});
});

test('Lamp switches off in the click task and never restores its discovery contour after use',async({page})=>{
  await ready(page);await page.locator('#lamp-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lighting');
  await expect(page.locator('#lamp-hotspot')).toBeDisabled();
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
  await expect(page.locator('#lamp-hotspot')).toBeEnabled();
  await expect(page.locator('#lamp-hotspot')).toHaveAttribute('aria-pressed','true');
  await page.locator('#lamp-hotspot').hover();await expect(page.locator('#object-hint')).toHaveText('Turn off lamp');
  await expect(contour(page)).toHaveCSS('opacity','0');
  const off=await page.evaluate(()=>{
    const clip=document.querySelector('#lighting-video');window.__lampClipPlays=0;
    clip.addEventListener('play',()=>window.__lampClipPlays++);
    const clipTime=clip.currentTime;
    document.querySelector('#lamp-hotspot').click();
    return {lamp:document.querySelector('#app').dataset.lamp,active:document.querySelector('.room-video.is-active').id,clipTime,discovery:document.querySelector('#app').dataset.lampDiscovery};
  });
  expect(off).toMatchObject({lamp:'dark',active:'dark-video',discovery:'false'});
  await expect(page.locator('#frozen-room')).toBeHidden();
  await expect(page.locator('#dark-video')).toHaveCSS('visibility','visible');
  await expect(page.locator('#lit-video')).toHaveCSS('visibility','hidden');
  await expect.poll(()=>page.locator('#dark-video').evaluate(video=>!video.paused)).toBe(true);
  await page.locator('#lamp-hotspot').hover();await expect(page.locator('#object-hint')).toHaveText('Turn on lamp');
  await expect(contour(page)).toHaveCSS('opacity','0');
  expect(await page.evaluate(()=>window.__lampClipPlays)).toBe(0);
  expect(await page.locator('#lighting-video').evaluate(video=>video.currentTime)).toBe(off.clipTime);
  await page.keyboard.press('Tab');await page.locator('#lamp-hotspot').focus();
  await expect(page.locator('.lamp-focus-marker')).toHaveCSS('opacity','1');
  await expect(contour(page)).toHaveCSS('opacity','0');
  await page.locator('#lamp-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-lamp','lighting');
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
  expect(await page.evaluate(()=>window.__lampClipPlays)).toBe(1);
  await page.mouse.move(1400,850);await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#app')).toHaveAttribute('data-lamp-discovery','false');
});

test('Portrait touch can toggle the visible lamp and does not restore its contour',async({browser},testInfo)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try {
    const page=await context.newPage();await page.goto('http://127.0.0.1:4173/?qa=1');
    await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
    await expect(contour(page)).toHaveCSS('opacity','0');
    await expect(page.locator('#lamp-discovery-glow')).toBeHidden();
    await page.screenshot({path:testInfo.outputPath('lamp-mobile-first-visit.png')});
    await page.locator('#lamp-hotspot').tap();await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
    await page.locator('#lamp-hotspot').tap();await expect(page.locator('#app')).toHaveAttribute('data-lamp','dark');
    await expect(contour(page)).toHaveCSS('opacity','0');
    await expect(page.locator('#object-hint')).toBeHidden();
    await page.screenshot({path:testInfo.outputPath('lamp-mobile-manually-dark.png')});
  } finally {await context.close();}
});

test('Reduced motion keeps both lamp directions immediate and the cue stays absent after activation',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
  for(const expected of ['lit','dark','lit','dark']) {
    const result=await page.evaluate(()=>{document.querySelector('#lamp-hotspot').click();return document.querySelector('#app').dataset.lamp;});
    // Turning on still resolves its preloaded media promise asynchronously.
    if(expected==='dark')expect(result).toBe('dark');
    await expect(page.locator('#app')).toHaveAttribute('data-lamp',expected);
    await expect(page.locator('#app')).toHaveAttribute('data-lamp-discovery','false');
    await expect(contour(page)).toHaveCSS('opacity','0');
  }
  expect(await page.locator('#lighting-video').evaluate(video=>video.currentTime)).toBe(0);
  expect(await page.evaluate(()=>Object.values({dark:document.querySelector('#dark-video'),lit:document.querySelector('#lit-video')}).every(video=>video.paused))).toBe(true);
});

test('Journal includes the right page and the books follow their uneven tops without clipped strokes',async({page},testInfo)=>{
  await ready(page,'&reference=1');
  const hit=async(x,y)=>page.evaluate(({x,y})=>{
    const m=new DOMMatrix(getComputedStyle(document.querySelector('#world')).transform);
    return document.elementFromPoint(m.e+x*m.a,m.f+y*m.a)?.closest('.hotspot')?.id || null;
  },{x,y});
  expect(await hit(500,690)).toBe('resume-hotspot'); // The page beyond the pen.
  expect(await hit(550,680)).toBeNull();
  expect(await hit(220,125)).toBeNull(); // Gap above a shorter book.
  expect(await hit(165,117)).toBe('bookshelf-hotspot'); // Taller adjacent spine.
  expect(await hit(455,400)).toBe('lamp-hotspot');
  expect(await hit(396,345)).toBeNull();
  for(const name of ['resume','bookshelf','journey']) {
    await page.locator(`#${name}-hotspot`).hover();
    const outline=page.locator(`#${name}-outline`);
    expect(await outline.evaluate(el=>el.parentElement.id)).toBe('world');
    await expect(outline).toHaveCSS('pointer-events','none');
    await expect(outline).toHaveCSS('overflow','visible');
    await page.screenshot({path:testInfo.outputPath(`${name}-contour.png`)});
  }
});
