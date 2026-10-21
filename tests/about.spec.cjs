const {test,expect}=require('@playwright/test');
const ready=async(page,query='')=>{
  await page.goto(`/?qa=1${query}`);
  await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
};
const enter=async page=>{
  await page.locator('#about-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
};
const returnRoom=async page=>{
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
};

test('green monitor uses the shared smooth camera and returns to its exact room framing',async({page})=>{
  await ready(page);
  const roomTransform=await page.locator('#world').evaluate(el=>getComputedStyle(el).transform);
  const title=await page.locator('#about-live h1').innerText();
  await enter(page);
  await expect(page).toHaveURL(/view=about/);
  await expect(page.locator('#about-title')).toHaveText(title,{ignoreCase:true});
  await expect(page.locator('#about-title')).toBeFocused();
  await expect(page.locator('#projects-panel')).toBeHidden();
  const miniature=await page.locator('#about-live').boundingBox();
  const expanded=await page.locator('#about-stage').boundingBox();
  for(const key of ['x','y','width','height']) expect(Math.abs(miniature[key]-expanded[key])).toBeLessThan(1);
  expect(Math.abs(miniature.x+miniature.width/2-720)).toBeLessThan(1);
  expect(Math.abs(miniature.y+miniature.height/2-450)).toBeLessThan(1);
  const run=await page.evaluate(()=>window.__studioDiagnostics.cameraRuns.at(-1));
  expect(run).toMatchObject({section:'about',cameraVariant:'smooth',entering:true,requestedMs:560});
  expect(await page.locator('#dark-video').evaluate(v=>v.paused)).toBe(true);
  await returnRoom(page);
  await expect(page.locator('#about-hotspot')).toBeFocused();
  expect(await page.locator('#world').evaluate(el=>getComputedStyle(el).transform)).toBe(roomTransform);
  expect(await page.locator('#dark-video').evaluate(v=>v.paused)).toBe(false);
  await page.locator('#lamp-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
  await enter(page); await page.getByRole('button',{name:'Back to studio',exact:true}).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
  expect(await page.locator('#lit-video').evaluate(v=>!v.paused&&v.loop)).toBe(true);
});

test('keyboard enters About Me, traps focus and restores the correct monitor',async({page})=>{
  await ready(page);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  await expect(page.locator('#about-hotspot')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#about-title')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#about-panel .about-back')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'GitHub'})).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'LinkedIn'})).toBeFocused();
  for(const key of ['Tab']) {
    await page.keyboard.press(key);
    await expect(page.locator('#about-panel .about-back')).toBeFocused();
  }
  expect(await page.locator('#scene-viewport').evaluate(el=>el.inert)).toBe(true);
  await page.keyboard.press('Enter');
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await expect(page.locator('#about-hotspot')).toBeFocused();
  await page.locator('#monitor-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await expect(page.locator('#projects-title')).toBeFocused();
  await returnRoom(page);
  await expect(page.locator('#monitor-hotspot')).toBeFocused();
});

test('About Me deep links, refresh and history work across both monitors',async({page})=>{
  await ready(page,'&view=about');
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
  await page.reload(); await expect(page.locator('#about-title')).toBeFocused();
  await page.getByRole('button',{name:'Back to studio',exact:true}).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await enter(page); await returnRoom(page);
  await page.locator('#monitor-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.goBack(); await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await page.goForward(); await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await returnRoom(page); await enter(page);
  await page.goBack(); await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await page.goForward(); await expect(page.locator('#app')).toHaveAttribute('data-state','about');
});

test('About Me shares published data, filters drafts and handles load failure',async({page})=>{
  const supply=body=>page.route('**/about.js',route=>route.fulfill({contentType:'text/javascript',body}));
  await supply('window.aboutRepository={getPublished:async()=>({title:"About Me",role:"Published profile",bio:"A custom profile from the repository.",focus:["Research"],toolkit:["Python"],note:"Updated profile",status:"published"})};');
  await ready(page); await expect(page.locator('#about-live')).toContainText('A custom profile from the repository.');
  await enter(page); await expect(page.locator('#about-stage')).toContainText('A custom profile from the repository.');
  await page.unroute('**/about.js');
  await supply('window.aboutRepository={getPublished:async()=>({title:"Private draft",bio:"Unpublished details",status:"draft"})};');
  await ready(page); await expect(page.locator('#about-live')).toContainText('Profile coming soon');
  await expect(page.locator('#about-live')).not.toContainText('Unpublished details');
  await page.unroute('**/about.js');
  await supply('window.aboutRepository={getPublished:async()=>{throw new Error("offline")}};');
  await ready(page); await enter(page);
  await expect(page.locator('#about-stage')).toContainText('Profile unavailable');
  await returnRoom(page);
});

test('About Me handles repeated activation, interrupted entry, resize and reduced motion',async({page})=>{
  await ready(page);
  const historyLength=await page.evaluate(()=>history.length);
  await page.evaluate(()=>{for(let i=0;i<10;i++)document.querySelector('#about-hotspot').click();});
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
  expect(await page.evaluate(()=>history.length)).toBe(historyLength+1);
  await returnRoom(page);
  await page.locator('#about-hotspot').click(); await page.goBack();
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
  await expect(page.locator('#about-hotspot')).toBeEnabled();
  await expect(page.locator('#about-hotspot')).toBeFocused();
  await page.locator('#about-hotspot').click();
  await page.setViewportSize({width:768,height:1024});
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
  await returnRoom(page);
  await page.locator('#about-hotspot').click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
  expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);
  await expect(page.locator('#speed-lines')).toHaveCSS('opacity','0');
  await returnRoom(page); await enter(page);
  expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);
});

test('phone About Me fallback is readable, scrolls on short screens and returns to a visible control',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await ready(page);
  await expect(page.locator('#mobile-projects')).toBeVisible();
  await expect(page.locator('#mobile-about')).toBeVisible();
  await page.locator('#mobile-about').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
  expect(await page.locator('#about-title').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(40);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  const back=await page.locator('#about-panel .about-back').boundingBox();
  expect(back.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({path:'qa/about-mobile.png'});
  await page.setViewportSize({width:390,height:568});
  await page.locator('#about-panel .about-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('#about-panel .about-footer')).toBeInViewport();
  expect(await page.locator('#about-panel').evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
  await returnRoom(page);
  await expect(page.locator('#mobile-about')).toBeFocused();
});

test('portrait tablet exposes an About Me shortcut for the cropped CRT',async({page})=>{
  await page.setViewportSize({width:768,height:1024}); await ready(page);
  await expect(page.locator('#mobile-about')).toBeInViewport();
  await page.locator('#mobile-about').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
  await returnRoom(page);
  await expect(page.locator('#mobile-about')).toBeFocused();
});

test('phone shortcut keeps rush streaks moving outwards when the CRT starts off screen',async({page})=>{
  await page.setViewportSize({width:390,height:844}); await ready(page,'&reference=1');
  await page.locator('#mobile-about').click();
  await expect.poll(()=>page.locator('#world').evaluate(el=>el.getAnimations().length)).toBeGreaterThan(0);
  const sample=async time=>page.evaluate(time=>{
    document.getAnimations().forEach(a=>{a.pause();a.currentTime=time;});
    return [...document.querySelectorAll('#speed-lines polygon')].map(el=>{
      const b=el.getBoundingClientRect();return{x:b.x+b.width/2,y:b.y+b.height/2};
    });
  },time);
  const start=await sample(165),end=await sample(260);
  expect(start).toHaveLength(4);
  start.forEach((s,i)=>expect((end[i].x-s.x)*(s.x-195)+(end[i].y-s.y)*(s.y-422)).toBeGreaterThan(0));
  await page.screenshot({path:'qa/about-mobile-entry.png'});
  await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
});

test('capture About Me monitor alignment, camera path and return at target viewports',async({page})=>{
  for(const [width,height] of [[1440,900],[1920,1080],[768,1024]]) {
    await page.setViewportSize({width,height}); await ready(page,'&reference=1');
    const screen=await page.locator('#about-live').boundingBox(),hotspot=await page.locator('#about-hotspot').boundingBox();
    expect(screen).toEqual(hotspot);
    await page.screenshot({path:`qa/about-room-${width}x${height}.png`});
    await enter(page); await page.screenshot({path:`qa/about-${width}x${height}.png`});
    const bounds=await page.locator('#about-stage').boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(-1); expect(bounds.y).toBeGreaterThanOrEqual(-1);
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(width+1);
    expect(bounds.y+bounds.height).toBeLessThanOrEqual(height+1);
    expect(await page.locator('#about-stage').evaluate(el=>el.querySelector('.about-footer').getBoundingClientRect().bottom<=el.getBoundingClientRect().bottom)).toBe(true);
  }
  await page.setViewportSize({width:1440,height:900}); await ready(page,'&reference=1');
  await page.locator('#about-hotspot').click();
  for(const time of [170,330,470]) {
    await page.evaluate(time=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=time;}),time);
    await page.screenshot({path:`qa/about-entry-${time}ms.png`});
  }
  await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>document.getAnimations().forEach(a=>{a.pause();a.currentTime=250;}));
  await page.screenshot({path:'qa/about-return-250ms.png'});
  await page.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
});
