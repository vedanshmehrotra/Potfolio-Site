const {test,expect}=require('@playwright/test');
const ready=async page=>{await page.goto('/?qa=1');await expect(page.locator('#app')).toHaveAttribute('data-ready','true');};
const inspect=page=>page.evaluate(()=>window.studioAudio.inspect());

test('Fresh sound preference is ON but playback waits for a real keyboard interaction',async({page})=>{
  const requests=[];page.on('request',request=>{if(request.url().includes('/assets/audio/'))requests.push(request.url());});
  await ready(page);await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed','true');
  expect(await inspect(page)).toMatchObject({enabled:true,state:'uncreated',rain:false});expect(requests).toEqual([]);
  await page.locator('#lamp-hotspot').focus();await page.keyboard.press('Enter');
  await expect.poll(async()=> (await inspect(page)).state).toBe('running');
  await expect.poll(async()=> (await inspect(page)).rain).toBe(true);
  expect((await inspect(page)).loaded.sort()).toEqual(['purr','rain']);expect(requests).toHaveLength(2);
  await expect.poll(async()=> (await inspect(page)).rms).toBeGreaterThan(.001);
});

test('Muting as the first action never starts audio and the explicit preference survives reload',async({page})=>{
  const requests=[];page.on('request',request=>{if(request.url().includes('/assets/audio/'))requests.push(request.url());});
  await ready(page);await page.locator('#sound-toggle').click();
  expect(await inspect(page)).toMatchObject({enabled:false,state:'uncreated',rain:false});
  await page.locator('#lamp-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');expect(requests).toEqual([]);
  await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  expect(await inspect(page)).toMatchObject({enabled:false,state:'uncreated'});
  await page.locator('#sound-toggle').click();await expect.poll(async()=> (await inspect(page)).rain).toBe(true);
  await page.reload();await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  expect(await inspect(page)).toMatchObject({enabled:true,state:'uncreated',rain:false});
});

test('The very first cat pet still purrs once when recording decode finishes late',async({page})=>{
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/assets/audio/cat-purr.wav',async route=>{await gate;await route.continue();});
  await ready(page);await expect(page.locator('#app')).toHaveAttribute('data-cat','ready');
  await page.locator('#cat-hotspot').click();await expect.poll(()=>page.evaluate(()=>window.studioCat.inspect().phase)).toBe('pet');
  expect((await inspect(page)).events.filter(event=>event.name==='purr')).toHaveLength(0);
  release();await expect.poll(async()=> (await inspect(page)).events.filter(event=>event.name==='purr').length).toBe(1);
  expect((await inspect(page)).voices.filter(name=>name==='purr')).toHaveLength(1);
});

test('Muting cancels a queued first-pet purr before the recording becomes ready',async({page})=>{
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/assets/audio/cat-purr.wav',async route=>{await gate;await route.continue();});
  await ready(page);await expect(page.locator('#app')).toHaveAttribute('data-cat','ready');
  await page.locator('#cat-hotspot').click();await page.locator('#sound-toggle').click();release();
  await expect.poll(async()=> (await inspect(page)).loaded.length).toBe(2);
  expect(await inspect(page)).toMatchObject({enabled:false,rain:false,voices:[]});
  expect((await inspect(page)).events.filter(event=>event.name==='purr')).toHaveLength(0);
});

test('Approved cat works in the public studio without QA controls or QA asset requests',async({page})=>{
  const requests=[];page.on('request',request=>requests.push(request.url()));await page.goto('/');
  await expect(page.locator('#app')).toHaveAttribute('data-cat','ready');await expect(page.locator('#studio-cat-reaction')).toHaveCount(1);
  expect(await page.evaluate(()=>window.studioCat)).toBeUndefined();expect(requests.filter(url=>url.includes('/qa/cat/'))).toEqual([]);
  await page.locator('#cat-hotspot').click();
  const opaque=()=>page.locator('#studio-cat-reaction').evaluate(c=>c.getContext('2d').getImageData(0,0,80,68).data.some((value,i)=>i%4===3 && value>0));
  await expect.poll(opaque).toBe(true);await expect.poll(opaque).toBe(false);
});

test('A missing cat expression leaves the original cat and section navigation usable',async({page})=>{
  await page.route('**/assets/cat/sleepy-eyes-v1.png',route=>route.abort());await page.goto('/');
  await expect(page.locator('#app')).toHaveAttribute('data-cat','unavailable');await expect(page.locator('#studio-cat-reaction')).toHaveCount(0);
  await page.locator('#monitor-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.keyboard.press('Escape');await expect(page.locator('#app')).toHaveAttribute('data-state','room');
});
