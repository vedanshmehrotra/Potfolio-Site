const {test,expect}=require('@playwright/test');
const ready=async(page,query='')=>{await page.goto(`/?qa=1&reference=1${query}`);await expect(page.locator('#app')).toHaveAttribute('data-ready','true');};
const inspect=page=>page.evaluate(()=>window.studioAudio.inspect());
const enable=async page=>{
  if(!(await inspect(page)).enabled)await page.locator('#sound-toggle').click();
  else if((await inspect(page)).state!=='running'){await page.locator('#sound-settings-toggle').click();await page.locator('#sound-settings-toggle').click();}
  await expect.poll(async()=> (await inspect(page)).loaded.sort()).toEqual(['purr','rain']);await expect.poll(async()=> (await inspect(page)).state).toBe('running');
};
const names=async page=>(await inspect(page)).events.map(event=>event.name);
const room=async page=>{await page.locator('[data-back-room]:visible').first().click();await expect(page.locator('#app')).toHaveAttribute('data-state','room');};

test('Sound defaults on, waits for interaction, decodes local recordings and mutes all voices',async({page})=>{
  const requests=[],errors=[];page.on('request',request=>{if(request.url().includes('/assets/audio/'))requests.push(request.url());});page.on('pageerror',error=>errors.push(error.message));
  await ready(page);expect(await inspect(page)).toMatchObject({enabled:true,state:'uncreated',rain:false});
  expect(requests).toHaveLength(0);expect(await names(page)).toEqual([]);
  await enable(page);expect(requests).toHaveLength(2);
  await expect.poll(async()=> (await inspect(page)).rms).toBeGreaterThan(.0001);
  expect((await inspect(page)).rain).toBe(true);
  await page.locator('#cat-hotspot').click();expect(await names(page)).toContain('purr');
  await page.locator('#sound-toggle').click();
  await expect.poll(async()=> (await inspect(page)).state).toBe('suspended');
  expect(await inspect(page)).toMatchObject({enabled:false,rain:false,voices:[]});
  await page.locator('#monitor-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  expect(await names(page)).toEqual(['purr']);
  expect(errors).toEqual([]);
});

test('Each object uses its intended cue; journal turns only on changed chapters; hover is silent',async({page})=>{
  await ready(page);await enable(page);
  await page.locator('#journey-hotspot').hover();await page.locator('#cat-hotspot').hover();expect(await names(page)).toEqual([]);
  await page.locator('#monitor-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.locator('[data-direction=next]').click();await room(page);
  await page.locator('#about-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','about');await room(page);
  await page.locator('#resume-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','resume');
  expect((await names(page)).filter(name=>name==='page')).toHaveLength(0);
  await page.locator('[data-resume-page="1"]').click();expect((await names(page)).filter(name=>name==='page')).toHaveLength(1);
  await page.locator('[data-resume-page="1"]').click();expect((await names(page)).filter(name=>name==='page')).toHaveLength(1);
  await room(page);await page.locator('#bookshelf-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','bookshelf');
  await page.locator('[data-note="reading"]').click();await room(page);
  await page.locator('#journey-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','journey');
  await page.locator('[data-milestone]').nth(1).click();
  const played=await names(page);for(const name of ['click','rush','return','key','crt','page','book','paper'])expect(played).toContain(name);
});

test('Purr has real audio, never stacks, and remains keyboard accessible',async({page})=>{
  await ready(page);await enable(page);
  await page.locator('#sound-settings-toggle').click();await page.locator('#ambience-volume').fill('0');
  await page.locator('#cat-hotspot').focus();await page.keyboard.press('Enter');
  await page.evaluate(()=>{for(let i=0;i<12;i++)document.querySelector('#cat-hotspot').click();});
  expect((await names(page)).filter(name=>name==='purr')).toHaveLength(1);
  expect((await inspect(page)).voices.filter(name=>name==='purr')).toHaveLength(1);
  await expect.poll(async()=> (await inspect(page)).rms).toBeGreaterThan(.0001);
  await expect.poll(async()=> (await inspect(page)).voices.filter(name=>name==='purr').length).toBe(0);
  await expect.poll(async()=> (await inspect(page)).rms).toBeLessThan(.0001);
});

test('Independent volumes and explicit mute persist; quick toggles leave one rain loop',async({page})=>{
  await ready(page);await enable(page);await page.locator('#sound-settings-toggle').click();
  await page.locator('#ambience-volume').fill('0');await page.locator('#effects-volume').fill('0');
  await expect.poll(async()=> (await inspect(page)).rms).toBeLessThan(.0001);
  await page.locator('#cat-hotspot').click();expect(await names(page)).toEqual([]);
  await page.locator('#sound-settings-toggle').click();await page.locator('#effects-volume').fill('65');
  await page.locator('#sound-toggle').click();
  await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  expect(await inspect(page)).toMatchObject({enabled:false,state:'uncreated',volumes:{ambience:0,effects:65}});
  for(let i=0;i<3;i++)await page.locator('#sound-toggle').click();
  await expect.poll(async()=> (await inspect(page)).state).toBe('running');
  await expect.poll(async()=> (await inspect(page)).rain).toBe(true);
  await page.locator('#sound-toggle').click();await expect.poll(async()=> (await inspect(page)).state).toBe('suspended');
  expect((await inspect(page)).rain).toBe(false);
});

test('Pending contact shows an animated hourglass and confirms sound only for accepted sends',async({page})=>{
  await ready(page,'&view=contact');await enable(page);
  await page.evaluate(()=>window.contactRepository.send=()=>new Promise((resolve,reject)=>{window.__accept=resolve;window.__reject=reject;}));
  await page.locator('#contact-message').fill('A controlled test message, never delivered.');await page.locator('[type=submit]').click();
  await page.locator('[type=submit]').hover();await expect(page.locator('#studio-cursor')).toBeVisible();
  await expect(page.locator('#studio-cursor')).toHaveAttribute('data-kind','wait');
  expect(await page.locator('#studio-cursor').evaluate(el=>getComputedStyle(el).animationName)).toBe('cursor-wait');
  expect(await names(page)).not.toContain('sent');
  await room(page);await page.locator('#contact-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','contact');
  await expect(page.locator('#contact-form')).toHaveAttribute('aria-busy','true');
  await page.locator('[type=submit]').hover();await expect(page.locator('#studio-cursor')).toBeVisible();
  await expect(page.locator('#studio-cursor')).toHaveAttribute('data-kind','wait');
  await page.evaluate(()=>window.__reject(new Error('Controlled failure')));await expect(page.locator('#contact-status')).toContainText('Controlled failure');
  await expect(page.locator('#studio-cursor')).toBeHidden();expect(await names(page)).not.toContain('sent');
  await page.locator('[type=submit]').click();await page.evaluate(()=>window.__accept({ok:true}));
  await expect(page.locator('#contact-status')).toContainText('Message sent');
  expect((await names(page)).filter(name=>name==='sent')).toHaveLength(1);
  await expect(page.locator('#studio-cursor')).toBeHidden();
});

test('Pixel cursor sprites track the mouse, switch context, and keep text and reduced-motion fallbacks',async({page})=>{
  await ready(page);await page.mouse.move(700,800);
  expect(await page.locator('html').evaluate(el=>el.classList.contains('pixel-cursors'))).toBe(true);
  expect(await page.locator('#app').evaluate(el=>getComputedStyle(el).cursor)).toContain('arrow.svg');
  await page.locator('#monitor-hotspot').hover();expect(await page.locator('#monitor-hotspot').evaluate(el=>getComputedStyle(el).cursor)).toContain('point.svg');
  await page.locator('#cat-hotspot').hover();await expect(page.locator('#studio-cursor')).toBeVisible();
  await expect(page.locator('#studio-cursor')).toHaveAttribute('data-kind','pet');
  const box=await page.locator('#cat-hotspot').boundingBox();await page.mouse.move(box.x+40,box.y+30);
  const position=await page.locator('#studio-cursor').boundingBox();expect(position.x).toBeCloseTo(box.x+28,0);expect(position.y).toBeCloseTo(box.y+26,0);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#studio-cursor')).toHaveCSS('animation-name','none');
  await page.locator('#contact-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','contact');
  await page.locator('#contact-message').hover();await expect(page.locator('#contact-message')).toHaveCSS('cursor','text');await expect(page.locator('#studio-cursor')).toBeHidden();
  await page.emulateMedia({forcedColors:'active'});expect(await page.locator('html').evaluate(el=>el.classList.contains('pixel-cursors'))).toBe(false);
});

test('Sound controls remain keyboard reachable inside sections and Escape closes settings before leaving',async({page})=>{
  await ready(page,'&view=about');await page.locator('#sound-settings-toggle').focus();await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');await expect(page.locator('#ambience-volume')).toBeFocused();
  await page.keyboard.press('ArrowRight');expect((await inspect(page)).volumes.ambience).toBe(36);
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
  await page.keyboard.press('Tab');await expect(page.locator('#effects-volume')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('#sound-settings')).toBeHidden();
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');await expect(page.locator('#sound-settings-toggle')).toBeFocused();
  await page.keyboard.press('Escape');await expect(page.locator('#app')).toHaveAttribute('data-state','room');
});

test('Touch has no fake cursor and mobile sound controls leave back/download actions usable',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  try {
    const page=await context.newPage();await ready(page,'&view=resume');
    await expect(page.locator('#studio-cursor')).toBeHidden();expect(await page.locator('html').evaluate(el=>el.classList.contains('pixel-cursors'))).toBe(false);
    const control=await page.locator('.sound-controls').boundingBox(),download=await page.locator('.resume-download').boundingBox();
    expect(download.x+download.width).toBeLessThanOrEqual(control.x);
    await page.locator('#sound-settings-toggle').tap();await expect.poll(async()=> (await inspect(page)).rain).toBe(true);
    await expect(page.locator('#sound-settings')).toBeVisible();
    await page.locator('#object-title').tap({position:{x:8,y:12}});await expect(page.locator('#sound-settings')).toBeHidden();
    await page.locator('#object-panel [data-back-room]').tap();await expect(page.locator('#app')).toHaveAttribute('data-state','room');
    await page.locator('#sound-toggle').tap();await expect.poll(async()=> (await inspect(page)).state).toBe('suspended');
  } finally {await context.close();}
});

test('Recording failures and unsupported audio leave room navigation working',async({page,browser})=>{
  await page.route('**/assets/audio/*',route=>route.abort());await ready(page);await page.locator('#sound-settings-toggle').click();
  await expect.poll(async()=> (await inspect(page)).errors.length).toBe(2);
  await page.locator('#monitor-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  expect(await names(page)).toContain('click');
  const fallback=await browser.newPage();await fallback.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
  await ready(fallback);await expect(fallback.locator('#sound-toggle')).toBeDisabled();
  await fallback.locator('#about-hotspot').click();await expect(fallback.locator('#app')).toHaveAttribute('data-state','about');await fallback.close();
});

test('Visibility handler suspends all audio and resumes only when enabled',async({page})=>{
  await ready(page);await enable(page);
  // Controlled visibility events exercise the handler without claiming a native tab switch.
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(async()=> (await inspect(page)).state).toBe('suspended');expect((await inspect(page)).rain).toBe(false);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(async()=> (await inspect(page)).rain).toBe(true);
  await page.locator('#sound-toggle').click();
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect.poll(async()=> (await inspect(page)).state).toBe('suspended');expect((await inspect(page)).rain).toBe(false);
});

test('Missing animated sprites retain a visible fallback pointer',async({page})=>{
  await page.route('**/assets/cursors/*-sheet.svg',route=>route.abort());await ready(page);
  await page.locator('#cat-hotspot').hover();await expect(page.locator('#studio-cursor')).toBeHidden();
  expect(await page.locator('#cat-hotspot').evaluate(el=>getComputedStyle(el).cursor)).toContain('point.svg');
  expect(await page.locator('#cat-hotspot').evaluate(el=>el.classList.contains('cursor-sprite-target'))).toBe(false);
});

test('A mouse on narrow screens uses the grab cursor and clears it when dragging ends or loses focus',async({page})=>{
  await page.setViewportSize({width:390,height:844});await ready(page);
  const point=await page.evaluate(()=>{
    for(const [x,y] of [[30,690],[20,680],[350,680]]) {
      const element=document.elementFromPoint(x,y);
      if(element?.closest('#scene-viewport') && !element.closest('button'))return {x,y};
    }
    return null;
  });
  expect(point).not.toBeNull();await page.mouse.move(point.x,point.y);
  expect(await page.locator('#world').evaluate(el=>getComputedStyle(el).cursor)).toContain('grab.svg');
  const before=await page.locator('#world').evaluate(el=>getComputedStyle(el).transform);
  await page.mouse.down();await expect(page.locator('html')).toHaveClass(/is-dragging/);
  await page.mouse.move(point.x+55,point.y);expect(await page.locator('#world').evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
  await page.mouse.up();await expect(page.locator('html')).not.toHaveClass(/is-dragging/);
  await page.mouse.down();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(page.locator('html')).not.toHaveClass(/is-dragging/);await page.mouse.up();
});
