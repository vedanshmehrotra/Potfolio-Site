const {test,expect}=require('@playwright/test');
const ready=async(page,query='')=>{await page.goto(`/qa/cat-review.html${query}`);await page.waitForFunction(()=>window.catReview?.inspect().ready);};
const state=page=>page.evaluate(()=>window.catReview.inspect());
const room=page=>page.frameLocator('#review-studio');
const alpha=page=>page.evaluate(()=>{
  const c=window.catReview.canvas,p=c.getContext('2d').getImageData(0,0,80,68).data;
  let count=0;for(let i=3;i<p.length;i+=4)if(p[i])count++;return count;
});

test('Approved cat loads in the main studio; its review reuses one idle-transparent instance',async({page})=>{
  const requests=[];page.on('request',request=>requests.push(request.url()));
  await page.goto('/?qa=1');await expect(page.locator('#app')).toHaveAttribute('data-parrot','ready');
  await expect(page.locator('#app')).toHaveAttribute('data-cat','ready');
  expect(requests.filter(url=>url.includes('/qa/cat/'))).toEqual([]);await expect(page.locator('#studio-cat-reaction')).toHaveCount(1);
  await ready(page);await expect(room(page).locator('#studio-cat-reaction')).toHaveCount(1);await expect(room(page).locator('#studio-cat-reaction')).toHaveCSS('pointer-events','none');
  expect(await alpha(page)).toBe(0);await page.waitForTimeout(300);expect(await alpha(page)).toBe(0);
});

test('Actual lamp transition triggers a bounded eight-FPS notice and returns to the original cat',async({page})=>{
  await ready(page);await page.locator('#lamp').click();
  await expect.poll(async()=> (await state(page)).phase).toBe('notice');
  await expect.poll(()=>alpha(page)).toBeGreaterThan(100);
  await expect(room(page).locator('#app')).toHaveAttribute('data-lamp','lit');
  await expect.poll(async()=> (await state(page)).phase).toBe('idle');expect(await alpha(page)).toBe(0);
  const poses=(await state(page)).history.filter(item=>item.phase==='notice');
  expect(poses).toHaveLength(20);expect(poses.map(p=>p.frame)).toContain(5);
  const gaps=poses.slice(1).map((p,i)=>p.time-poses[i].time),mean=gaps.reduce((a,b)=>a+b,0)/gaps.length;
  expect(mean).toBeGreaterThan(112);expect(mean).toBeLessThan(145);
});

test('Real pet hotspot keeps the purr and prevents stacked visual reactions',async({page})=>{
  await ready(page);await room(page).locator('#sound-settings-toggle').click();await room(page).locator('#sound-settings-toggle').click();
  await expect.poll(()=>room(page).locator('body').evaluate(()=>window.studioAudio.inspect().loaded.length)).toBe(2);
  await page.locator('#pet').click();await expect.poll(async()=> (await state(page)).phase).toBe('pet');
  await page.waitForTimeout(400);const before=await state(page);
  await room(page).locator('#cat-hotspot').dispatchEvent('click');const after=await state(page);
  expect(after.frame).toBeGreaterThanOrEqual(before.frame);expect(after.history.filter(p=>p.frame===0 && p.phase==='pet')).toHaveLength(1);
  expect(await room(page).locator('body').evaluate(()=>window.studioAudio.inspect().events.filter(event=>event.name==='purr').length)).toBe(1);
  await expect.poll(async()=> (await state(page)).phase).toBe('idle');expect(await alpha(page)).toBe(0);
});

test('Reaction pixels stay inside the head and leave the room, paws, body and tail unchanged',async({page},testInfo)=>{
  await ready(page,'?reference=1');await room(page).locator('#lamp-hotspot').dispatchEvent('pointerdown',{pointerType:'mouse'});
  // An iframe element screenshot also captures parent panels above it. Exclude
  // the magnifier so this comparison measures the room, not its enlarged copy.
  await page.locator('#show-closeup').click();await expect(page.locator('#closeup')).toBeHidden();
  await expect(room(page).locator('#lamp-discovery-glow')).toBeHidden();await page.mouse.move(1,1);
  await page.evaluate(()=>window.catReview.pose('notice',5));
  const bounds=await room(page).locator('#studio-cat-reaction').boundingBox(),iframeBounds=await page.locator('#review-studio').boundingBox();
  // Compare with the cleared resting overlay in the same compositing tree.
  // display:none would also re-rasterize unrelated scaled CRT edge pixels.
  const before=await page.locator('#review-studio').screenshot();await page.evaluate(()=>window.catReview.reset());
  const after=await page.locator('#review-studio').screenshot();
  const comparison=await page.evaluate(async({before,after,box})=>{
    const load=async data=>{const image=new Image();image.src=`data:image/png;base64,${data}`;await image.decode();return image;};
    const a=await load(before),b=await load(after),c=document.createElement('canvas');c.width=a.width;c.height=a.height;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(a,0,0);const ap=ctx.getImageData(0,0,c.width,c.height).data;
    ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(b,0,0);const bp=ctx.getImageData(0,0,c.width,c.height).data;
    let changed=0,outside=0,protectedPixels=0;const outsideSamples=[];
    for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++) {
      const i=(y*c.width+x)*4;if(ap[i]===bp[i] && ap[i+1]===bp[i+1] && ap[i+2]===bp[i+2])continue;
      changed++;if(x<Math.floor(box.x)-1 || x>Math.ceil(box.x+box.width)+1 || y<Math.floor(box.y)-1 || y>Math.ceil(box.y+box.height)+1){outside++;if(outsideSamples.length<10)outsideSamples.push({x,y,a:Array.from(ap.slice(i,i+3)),b:Array.from(bp.slice(i,i+3))});}
      const sx=(x-box.x)/box.width*80,sy=(y-box.y)/box.height*68;
      if(sx>=72 || sy>=60 || sy<10)protectedPixels++;
    }
    return {changed,outside,protectedPixels,outsideSamples,box};
  },{before:before.toString('base64'),after:after.toString('base64'),box:{x:bounds.x-iframeBounds.x,y:bounds.y-iframeBounds.y,width:bounds.width,height:bounds.height}});
  await testInfo.attach('cat-rendered-pixel-check',{body:JSON.stringify(comparison),contentType:'application/json'});
  expect(comparison.changed).toBeGreaterThan(30);expect(comparison.outside).toBe(0);expect(comparison.protectedPixels).toBe(0);
});

test('Both sequences clear all local pixels after completion and pause over the Projects zoom',async({page})=>{
  await ready(page);await page.locator('#notice').click();await page.waitForTimeout(300);
  await room(page).locator('#monitor-hotspot').click();await expect(room(page).locator('#app')).toHaveAttribute('data-state','projects');
  const before=await state(page);await page.waitForTimeout(350);expect((await state(page)).history).toHaveLength(before.history.length);
  await page.keyboard.press('Escape');await expect(room(page).locator('#app')).toHaveAttribute('data-state','room');
  await expect.poll(async()=> (await state(page)).phase).toBe('idle');expect(await alpha(page)).toBe(0);
  await page.locator('#pet').click();await expect.poll(async()=> (await state(page)).phase).toBe('pet');
  await expect.poll(async()=> (await state(page)).phase).toBe('idle');expect(await alpha(page)).toBe(0);
});

test('Reduced motion, keyboard review controls and narrow layouts remain usable',async({page},testInfo)=>{
  await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
  await expect(page.locator('#notice')).toBeDisabled();await expect(page.locator('#pet')).toBeDisabled();
  await page.locator('#lamp').click();await expect(room(page).locator('#app')).toHaveAttribute('data-lamp','lit');
  expect((await state(page)).phase).toBe('idle');expect(await alpha(page)).toBe(0);
  await page.locator('#show-closeup').focus();await page.keyboard.press('Enter');await expect(page.locator('#closeup')).toBeHidden();
  await page.keyboard.press('Enter');await expect(page.locator('#closeup')).toBeVisible();
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const width of [320,390]) {
    await page.setViewportSize({width,height:844});await page.locator('#scrub').fill('5');
    expect((await state(page)).paused).toBe(true);expect(await alpha(page)).toBeGreaterThan(100);
    const bounds=await page.locator('#closeup').boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({path:testInfo.outputPath(`cat-${width}.png`)});
  }
});
