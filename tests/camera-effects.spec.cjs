const {test,expect} = require('@playwright/test');

const ready = async (page,query='') => {
  await page.goto(`/?qa=1&reference=1${query}`);
  await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
};
const pauseEntrance = async (page,trigger='#monitor-hotspot') => {
  await page.locator(trigger).click();
  await expect.poll(()=>page.locator('#world').evaluate(el=>el.getAnimations().some(a=>a.id==='studio-camera'))).toBe(true);
  await page.evaluate(()=>document.getAnimations().forEach(a=>a.pause()));
};
const scrub = (page,time) => page.evaluate(time=>document.getAnimations().forEach(a=>a.currentTime=time),time);

test('A is the default; retired B links also use the continuous camera',async ({page}) => {
  for (const query of ['', '&camera=stepped']) {
    await ready(page,query);
    await expect(page.locator('#app')).toHaveAttribute('data-camera','smooth');
    await pauseEntrance(page);
    const samples=await page.evaluate(()=>{
      const animations=document.getAnimations(),world=document.querySelector('#world'),scales=[];
      for(let time=160;time<=450;time+=10) {
        animations.forEach(a=>a.currentTime=time);
        scales.push(new DOMMatrix(getComputedStyle(world).transform).a);
      }
      return scales;
    });
    expect(samples.every((scale,i)=>i===0 || scale>samples[i-1])).toBe(true);
    expect(Math.max(...samples.slice(1).map((scale,i)=>scale/samples[i]-1))).toBeLessThan(.08);
    await scrub(page,450);
    await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
    await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
    await expect(page.locator('#projects-title')).toBeFocused();
    await expect(page.locator('#speed-lines')).toHaveCSS('opacity','0');
    await page.keyboard.press('Escape');
    await expect(page.locator('#app')).toHaveAttribute('data-state','room');
    await expect(page.locator('#monitor-hotspot')).toBeFocused();
    expect(await page.locator('#speed-lines').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  }
});

for (const section of ['projects','about']) {
 for (const viewport of [{width:1440,height:900,count:6},{width:390,height:844,count:4}]) {
  test(`${section} rush streaks stay visible, travel outward and fade before landing (${viewport.width}px)`,async ({page},testInfo)=>{
    await page.setViewportSize(viewport);
    await ready(page);
    await pauseEntrance(page,section==='about' ? (viewport.width<=700 ? '#mobile-about' : '#about-hotspot') : '#monitor-hotspot');
    const duration=viewport.width<=700 ? 420 : 560;
    const sample=async progress=>{
      await scrub(page,progress*duration);
      return page.locator('#speed-lines polygon').evaluateAll(streaks=>streaks.map(streak=>{
        const b=streak.getBoundingClientRect(),s=getComputedStyle(streak);
        return {x:b.x+b.width/2,y:b.y+b.height/2,left:b.left,right:b.right,length:Math.hypot(b.width,b.height),opacity:+s.opacity};
      }));
    };
    const before=await sample(.19),start=await sample(.39),hold=await sample(.5),end=await sample(.65),after=await sample(.81);
    expect(start).toHaveLength(viewport.count);
    expect(before.every(s=>s.opacity===0)).toBe(true);
    expect(after.every(s=>s.opacity===0)).toBe(true);
    start.forEach((s,i)=>{
      const mobile=viewport.width<=700;
      expect(s.opacity).toBeGreaterThan(mobile ? .55 : .65);
      expect(s.opacity).toBeLessThan(.75);
      expect(hold[i].opacity).toBeCloseTo(s.opacity,2);
      expect(s.length).toBeGreaterThan(mobile ? 48 : 120);
      expect(s.right<viewport.width*.22 || s.left>viewport.width*.78).toBe(true);
      // The actual visible movement goes away from the centre, with a vertical
      // component on the diagonal rays (not horizontal circuit-like flashes).
      const dx=end[i].x-s.x,dy=end[i].y-s.y;
      expect(dx*(s.x-viewport.width/2)+dy*(s.y-viewport.height/2)).toBeGreaterThan(0);
      if(i===0 || i===start.length-1) expect(Math.abs(dy)).toBeGreaterThan(2);
    });
    // Save real, paused browser frames during the strongest part of the rush.
    await scrub(page,duration*.42);
    await page.screenshot({path:testInfo.outputPath(`rush-${section==='about' ? 'about-' : ''}${viewport.width}px.png`)});
    await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
    await expect(page.locator('#app')).toHaveAttribute('data-state',section);
    await expect(page.locator('#speed-lines')).toHaveCSS('opacity','0');
    await expect(page.locator('.screen-seam')).toHaveCount(0);
  });
 }
}

test('interrupted and reduced-motion entrances leave no speed effects',async ({page})=>{
  await ready(page);
  await pauseEntrance(page);
  await scrub(page,220);
  await page.goBack();
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await expect(page.locator('#speed-lines')).toHaveCSS('opacity','0');
  expect(await page.locator('#speed-lines').evaluate(el=>el.getAnimations({subtree:true}).length)).toBe(0);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#monitor-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  expect(await page.evaluate(()=>document.getAnimations().filter(a=>a.id==='studio-rush'||a.id==='studio-camera').length)).toBe(0);
});

test('the former A/B page opens the chosen studio',async ({page})=>{
  await page.goto('/qa/camera-comparison.html');
  await expect(page).toHaveURL('/');
  await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#app')).toHaveAttribute('data-camera','smooth');
});
