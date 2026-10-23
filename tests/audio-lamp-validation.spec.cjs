const {test,expect}=require('@playwright/test');
const ready=async(page,query='')=>{await page.goto(`/?qa=1&reference=1${query}`);await expect(page.locator('#app')).toHaveAttribute('data-ready','true');};
const inspect=page=>page.evaluate(()=>window.studioAudio.inspect());
const enable=async page=>{
  if(!(await inspect(page)).enabled)await page.locator('#sound-toggle').click();
  else if((await inspect(page)).state!=='running'){await page.locator('#sound-settings-toggle').click();await page.locator('#sound-settings-toggle').click();}
  await expect.poll(async()=> (await inspect(page)).loaded.length).toBe(2);
};
const measure=async(page,cues,duration)=>page.evaluate(({cues,duration})=>new Promise(resolve=>{
  let peak=0,rms=0;const start=performance.now();
  cues.forEach(cue=>window.studioAudio.play(cue));
  const sample=()=>{const current=window.studioAudio.inspect();peak=Math.max(peak,current.peak);rms=Math.max(rms,current.rms);if(performance.now()-start<duration)requestAnimationFrame(sample);else resolve({peak,rms});};sample();
}),{cues,duration});

test('Reference mode keeps lamp discovery glows absent through hover and keyboard focus',async({page})=>{
  await ready(page);await page.locator('#lamp-hotspot').hover();await page.locator('#lamp-hotspot').focus();
  await expect(page.locator('#lamp-discovery-glow')).toBeHidden();
  await expect(page.locator('#lamp-outline .hotspot-contour')).toHaveCSS('opacity','0');
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','dark');
});

test('Lamp remains reachable within portrait crops without a flashing cue',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [width,height] of [[320,568],[390,844],[360,932],[768,1024]]) {
    await page.setViewportSize({width,height});await ready(page);
    const bounds=await page.locator('#lamp-hotspot').boundingBox();
    expect(bounds.x+bounds.width).toBeGreaterThan(0);expect(bounds.x).toBeLessThan(width);
    await expect(page.locator('#lamp-discovery-glow')).toBeHidden();
    await page.locator('#lamp-hotspot').focus();await expect(page.locator('.lamp-focus-marker')).toHaveCSS('opacity','1');
  }
});

test('Contact shows app errors, never invokes native validation popovers, and retains optional email',async({page},testInfo)=>{
  let sent=[];await page.route('**/api/contact',route=>{sent.push(route.request().postDataJSON());return route.fulfill({status:200,json:{ok:true}});});
  await ready(page,'&view=contact');
  await page.evaluate(()=>{window.__nativeInvalid=0;document.addEventListener('invalid',()=>window.__nativeInvalid++,true);});
  expect(await page.locator('#contact-form').evaluate(form=>form.noValidate)).toBe(true);
  await page.locator('[type=submit]').click();expect(sent).toHaveLength(0);
  await expect(page.locator('#contact-message-error')).toHaveText('Write a message of at least 2 characters.');
  await expect(page.locator('#contact-message')).toHaveAttribute('aria-invalid','true');await expect(page.locator('#contact-message')).toBeFocused();
  await expect(page.locator('#contact-message')).toHaveAttribute('aria-describedby',/contact-message-error/);
  await expect(page.locator('#contact-email-error')).toBeHidden();
  await page.screenshot({path:testInfo.outputPath('contact-empty-error.png')});
  await page.locator('#contact-message').fill('   ');await page.locator('[type=submit]').click();expect(sent).toHaveLength(0);
  await page.locator('#contact-message').fill('A valid message.');await expect(page.locator('#contact-message-error')).toBeHidden();
  await page.locator('#contact-email').fill('invalid@example');await page.locator('[type=submit]').click();
  await expect(page.locator('#contact-email-error')).toContainText('valid reply email');await expect(page.locator('#contact-email')).toBeFocused();expect(sent).toHaveLength(0);
  await page.locator('#contact-email').fill('');await expect(page.locator('#contact-email-error')).toBeHidden();
  await page.locator('[type=submit]').click();await expect(page.locator('#contact-status')).toContainText('Message sent');
  expect(sent).toEqual([{name:'',email:'',message:'A valid message.',company:''}]);
  expect(await page.evaluate(()=>window.__nativeInvalid)).toBe(0);
  await expect(page.locator('#contact-message')).toHaveAttribute('aria-invalid','false');
});

test('Inline errors survive navigation and keyboard submission on a narrow viewport',async({page})=>{
  await page.setViewportSize({width:320,height:568});await page.emulateMedia({reducedMotion:'reduce'});await ready(page,'&view=contact');
  await page.locator('#contact-email').fill('bad');await page.keyboard.press('Enter');
  await expect(page.locator('#contact-email-error')).toBeVisible();await expect(page.locator('#contact-message-error')).toBeVisible();
  await page.locator('#object-panel [data-back-room]').click();await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await page.locator('#mobile-contact').click();await expect(page.locator('#app')).toHaveAttribute('data-state','contact');
  await expect(page.locator('#contact-email-error')).toBeVisible();await expect(page.locator('#contact-message')).toHaveAttribute('aria-invalid','true');
  expect(await page.locator('#contact-form').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});

test('Normalized recordings, audible cue levels and full-volume combined output have useful headroom',async({page})=>{
  await ready(page);await enable(page);
  const recordings=(await inspect(page)).recordings;
  expect(recordings.rain.rms).toBeGreaterThan(.09);expect(recordings.rain.peak).toBeLessThanOrEqual(.701);
  expect(recordings.purr.rms).toBeGreaterThan(.09);expect(recordings.purr.peak).toBeLessThanOrEqual(.751);expect(recordings.purr.filtered).toBe(true);
  const rain=await measure(page,[],900);expect(rain.rms).toBeGreaterThan(.025);
  await page.locator('#sound-settings-toggle').click();await page.locator('#ambience-volume').fill('0');
  await page.waitForTimeout(350);
  const zoom=await measure(page,['rush'],450);expect(zoom.rms).toBeGreaterThan(.008);
  const purr=await measure(page,['purr'],2400);expect(purr.rms).toBeGreaterThan(.025);
  const click=await measure(page,['click'],160);expect(click.peak).toBeGreaterThan(.015);
  await page.locator('#ambience-volume').fill('100');await page.locator('#effects-volume').fill('100');
  await page.waitForTimeout(800);
  const combined=await measure(page,['purr','rush','lamp','crt','book','sent','phone'],2400);
  expect(combined.rms).toBeGreaterThan(.08);expect(combined.peak).toBeLessThan(.98);
  await page.locator('#sound-toggle').click();expect((await inspect(page)).voices).toEqual([]);
});
