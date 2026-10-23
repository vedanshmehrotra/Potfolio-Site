const {test,expect}=require('@playwright/test');
const ready=async(page,query='')=>{
  await page.goto(`/qa/parrot-review.html${query}`);
  await page.waitForFunction(()=>window.parrotReview?.inspect().ready);
};
const state=page=>page.evaluate(()=>window.parrotReview.inspect());
const room=page=>page.frameLocator('#review-studio');

test('Approved parrot loads in the main studio and the review reuses exactly one instance',async({page})=>{
  const requests=[];page.on('request',request=>requests.push(request.url()));
  await page.goto('/?qa=1&reference=1');await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#app')).toHaveAttribute('data-parrot','ready');
  await expect(page.locator('#studio-parrot')).toHaveCount(1);
  expect(requests.filter(url=>url.includes('/qa/parrot/'))).toEqual([]);
  expect(requests.some(url=>url.includes('/assets/parrot/parrot-atlas-v1.png'))).toBe(true);
  await ready(page);await expect(room(page).locator('#studio-parrot')).toHaveCount(1);
  await expect(room(page).locator('#studio-parrot')).toHaveCSS('pointer-events','none');
  await expect(room(page).locator('#studio-parrot')).toHaveAttribute('aria-hidden','true');
  expect((await state(page)).frameCount).toBe(16);
});

test('Breathing advances at eight ticks per second and a complete preen returns to rest',async({page})=>{
  await ready(page);await page.locator('#preen').click();
  await expect.poll(async()=> (await state(page)).phase).toBe('preen');
  await expect.poll(async()=> (await state(page)).phase,{timeout:6000}).toBe('idle');
  const preening=(await state(page)).history.filter(item=>item.phase==='preen');
  const frames=preening.map(item=>item.frame);
  expect(frames).toContain(8);expect(frames).toContain(12);expect(frames.at(-1)).toBe(0);
  const gaps=preening.slice(1).map((item,i)=>item.time-preening[i].time);
  expect(gaps.length).toBeGreaterThanOrEqual(22);
  expect(gaps.reduce((sum,gap)=>sum+gap,0)/gaps.length).toBeGreaterThan(113);
  expect(gaps.reduce((sum,gap)=>sum+gap,0)/gaps.length).toBeLessThan(140);
  expect(Math.min(...gaps)).toBeGreaterThan(85);
  await page.waitForTimeout(2500);
  expect((await state(page)).history.filter(item=>item.phase==='idle').map(item=>item.frame)).toContain(1);
});

test('Transparent poses keep the gripping feet registered on the bezel without a rectangular patch',async({page})=>{
  await ready(page);
  const samples=await page.evaluate(()=>{
    const result=[];
    for(let frame=0;frame<16;frame++) {
      window.parrotReview.frame(frame);
      const canvas=window.parrotReview.canvas,ctx=canvas.getContext('2d');
      const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data,feet=[];
      let alpha=0;
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++) {
        const i=(y*canvas.width+x)*4;if(pixels[i+3])alpha++;
        // The bottom toe region excludes tail/belly and works in both lamp states.
        if(y>=74 && x>=35 && pixels[i+3])feet.push([x,y]);
      }
      result.push({frame,alpha,corners:[pixels[3],pixels[(canvas.width-1)*4+3],pixels[(canvas.width*(canvas.height-1))*4+3]],
        feetX:feet.reduce((sum,p)=>sum+p[0],0)/feet.length,feetY:Math.max(...feet.map(p=>p[1]))});
    }
    return result;
  });
  for(const sample of samples){expect(sample.corners).toEqual([0,0,0]);expect(sample.alpha).toBeGreaterThan(1000);expect(sample.alpha).toBeLessThan(3500);expect(Number.isFinite(sample.feetX)).toBe(true);}
  const xs=samples.map(s=>s.feetX),ys=samples.map(s=>s.feetY);
  expect(Math.max(...xs)-Math.min(...xs)).toBeLessThan(2);
  expect(Math.max(...ys)-Math.min(...ys)).toBeLessThanOrEqual(1);
});

test('Lighting follows the real lamp and sprites share the room transform on desktop and mobile',async({page},testInfo)=>{
  await ready(page);await page.locator('#pause').click();
  expect((await state(page)).light).toBeCloseTo(.38,2);
  await page.locator('#lamp').click();await expect.poll(async()=> (await state(page)).lamp).toBe('lit');
  await expect.poll(async()=> (await state(page)).light).toBe(1);
  for(const [width,height] of [[1440,960],[390,844],[320,568],[768,1024]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(120);
    const bounds=await room(page).locator('#studio-parrot').boundingBox();
    const world=await room(page).locator('#world').evaluate(el=>{
      const rect=el.getBoundingClientRect(),matrix=new DOMMatrix(getComputedStyle(el).transform);
      return {x:rect.x,y:rect.y,scale:matrix.a};
    });
    const iframe=await page.locator('#review-studio').boundingBox();
    expect(bounds.x).toBeCloseTo(iframe.x+world.x+580*world.scale,0);
    expect(bounds.y).toBeCloseTo(iframe.y+world.y+239*world.scale,0);
    expect(bounds.x+48*world.scale).toBeGreaterThan(0);
    expect(bounds.x+48*world.scale).toBeLessThan(width);
    await page.screenshot({path:testInfo.outputPath(`parrot-${width}.png`)});
  }
  await page.locator('#lamp').click();await expect.poll(async()=> (await state(page)).lamp).toBe('dark');
  await expect.poll(async()=> (await state(page)).light).toBeCloseTo(.38,2);
});

test('Project zoom freezes the current pose and reverse navigation resumes it',async({page})=>{
  await ready(page);await page.locator('#preen').click();
  await room(page).locator('#monitor-hotspot').click();
  await expect(room(page).locator('#app')).toHaveAttribute('data-state','projects');
  const before=await state(page);await page.waitForTimeout(400);
  expect((await state(page)).frame).toBe(before.frame);
  expect((await state(page)).history).toHaveLength(before.history.length);
  await page.keyboard.press('Escape');await expect(room(page).locator('#app')).toHaveAttribute('data-state','room');
  await expect.poll(async()=> (await state(page)).history.length).toBeGreaterThan(before.history.length);
});

test('Pause, keyboard controls, reduced motion and comparison remain usable',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await ready(page);
  await expect(page.locator('#preen')).toBeDisabled();
  const before=await state(page);await page.waitForTimeout(400);
  expect((await state(page)).history).toHaveLength(before.history.length);
  expect((await state(page)).frame).toBe(0);
  await page.locator('#show-closeup').focus();await page.keyboard.press('Enter');await expect(page.locator('#closeup')).toBeVisible();
  await page.locator('#compare').click();await expect(room(page).locator('#studio-parrot')).toBeHidden();
  await page.locator('#compare').click();await expect(room(page).locator('#studio-parrot')).toBeVisible();
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#pause').click();
  const paused=await state(page);await page.waitForTimeout(400);expect((await state(page)).history).toHaveLength(paused.history.length);
  await page.locator('#scrub').fill('8');expect((await state(page)).frame).toBe(8);
  await page.locator('#pause').click();await expect.poll(async()=> (await state(page)).history.length).toBeGreaterThan(paused.history.length+1);
});

test('Matched room frames have no changed pixels outside the isolated parrot canvas',async({page},testInfo)=>{
  await ready(page,'?reference=1');await page.locator('#pause').click();
  await room(page).locator('#lamp-hotspot').dispatchEvent('pointerdown',{pointerType:'mouse'});
  await expect(room(page).locator('#lamp-discovery-glow')).toBeHidden();
  await page.mouse.move(1,1);
  await page.evaluate(()=>window.parrotReview.frame(0));
  const canvas=room(page).locator('#studio-parrot'),bounds=await canvas.boundingBox();
  const iframeBounds=await page.locator('#review-studio').boundingBox();
  const before=await page.locator('#review-studio').screenshot();
  await page.evaluate(()=>window.parrotReview.show(false));
  const after=await page.locator('#review-studio').screenshot();
  // Decode PNGs through the browser; this checks rendered pixels, not DOM existence.
  const comparison=await page.evaluate(async({before,after,box})=>{
    const load=async encoded=>{const img=new Image();img.src=`data:image/png;base64,${encoded}`;await img.decode();return img;};
    const a=await load(before),b=await load(after),surface=document.createElement('canvas');surface.width=a.width;surface.height=a.height;
    const ctx=surface.getContext('2d',{willReadFrequently:true});ctx.drawImage(a,0,0);const ap=ctx.getImageData(0,0,a.width,a.height).data;
    ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(b,0,0);const bp=ctx.getImageData(0,0,a.width,a.height).data;
    let changed=0,outside=0;
    for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++) {
      const i=(y*a.width+x)*4;
      if(ap[i]!==bp[i] || ap[i+1]!==bp[i+1] || ap[i+2]!==bp[i+2]) {
        changed++;if(x<Math.floor(box.x)-1 || x>Math.ceil(box.x+box.width)+1 || y<Math.floor(box.y)-1 || y>Math.ceil(box.y+box.height)+1)outside++;
      }
    }
    return {changed,outside};
  },{before:before.toString('base64'),after:after.toString('base64'),box:{x:bounds.x-iframeBounds.x,y:bounds.y-iframeBounds.y,width:bounds.width,height:bounds.height}});
  expect(comparison.changed).toBeGreaterThan(500);expect(comparison.outside).toBe(0);
  await testInfo.attach('rendered-pixel-comparison',{body:JSON.stringify(comparison),contentType:'application/json'});
});
