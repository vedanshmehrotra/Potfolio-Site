const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const ready=async(page,query='')=>{
  await page.goto(`/?qa=1${query}`);
  await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
};
const enter=async(page,name,mobile=false)=>{
  await page.locator(mobile?`#mobile-${name}`:`#${name}-hotspot`).click();
  await expect(page.locator('#app')).toHaveAttribute('data-state',name);
};
const room=async page=>{
  await page.keyboard.press('Escape');
  await expect(page.locator('#app')).toHaveAttribute('data-state','room');
};
for(const name of ['journey','resume','contact','bookshelf']) {
  test(`${name} shares the approved camera, restores framing and preserves both lamp states`,async({page})=>{
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await ready(page);
    const initial=await page.locator('#world').evaluate(el=>getComputedStyle(el).transform);
    await enter(page,name);
    await expect(page).toHaveURL(new RegExp(`view=${name}`));
    await expect(page.locator('#object-title')).toBeFocused();
    const run=await page.evaluate(()=>window.__studioDiagnostics.cameraRuns.at(-1));
    expect(run).toMatchObject({section:name,cameraVariant:'smooth',entering:true,requestedMs:560});
    const landing=await page.evaluate(name=>{
      const screen=window.__studioDiagnostics.screens[name],matrix=new DOMMatrix(getComputedStyle(document.querySelector('#world')).transform);
      return {x:matrix.e+(screen.x+screen.width/2)*matrix.a,y:matrix.f+(screen.y+screen.height/2)*matrix.a,width:screen.width*matrix.a,height:screen.height*matrix.a};
    },name);
    expect(Math.abs(landing.x-720)).toBeLessThan(1);expect(Math.abs(landing.y-450)).toBeLessThan(1);
    expect(landing.width).toBeLessThanOrEqual(1441);expect(landing.height).toBeLessThanOrEqual(901);
    await expect(page.locator('#projects-panel')).toBeHidden();await expect(page.locator('#about-panel')).toBeHidden();
    await room(page);await expect(page.locator(`#${name}-hotspot`)).toBeFocused();
    expect(await page.locator('#world').evaluate(el=>getComputedStyle(el).transform)).toBe(initial);
    await page.locator('#lamp-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
    await enter(page,name);await page.getByRole('button',{name:'Back to studio',exact:true}).click();
    await expect(page.locator('#app')).toHaveAttribute('data-state','room');
    await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
    expect(await page.locator('#lit-video').evaluate(video=>!video.paused&&video.loop)).toBe(true);
    expect(errors).toEqual([]);
  });
  test(`${name} deep link, refresh, browser navigation and interrupted entry`,async({page})=>{
    await ready(page,`&view=${name}`);await expect(page.locator('#app')).toHaveAttribute('data-state',name);
    await page.reload();await expect(page.locator('#object-title')).toBeFocused();await room(page);
    await enter(page,name);await page.goBack();await expect(page.locator('#app')).toHaveAttribute('data-state','room');
    await page.goForward();await expect(page.locator('#app')).toHaveAttribute('data-state',name);await room(page);
    const depth=await page.evaluate(()=>history.length);
    await page.evaluate(name=>{for(let i=0;i<8;i++)document.querySelector(`#${name}-hotspot`).click();},name);
    await expect(page.locator('#app')).toHaveAttribute('data-state',name);
    expect(await page.evaluate(()=>history.length)).toBeLessThanOrEqual(depth+1);await room(page);
    await page.locator(`#${name}-hotspot`).click();await page.goBack();
    await expect(page.locator('#app')).toHaveAttribute('data-state','room');
    await expect(page.locator(`#${name}-hotspot`)).toBeFocused();
  });
}

test('Journey pins work by hover, keyboard focus and touch; board remains fully visible',async({page})=>{
  await ready(page);await enter(page,'journey');
  await page.getByRole('button',{name:'University PREVIEW',exact:true}).hover();
  await expect(page.locator('#milestone-detail h2')).toHaveText('University');
  const internship=page.getByRole('button',{name:'Internship PREVIEW',exact:true});
  await internship.focus();await expect(page.locator('#milestone-detail h2')).toHaveText('Internship');
  await expect(internship).toHaveAttribute('aria-pressed','true');
  const board=await page.locator('.journey-board').boundingBox();
  for(const pin of await page.locator('.journey-pin').all()) {
    const rect=await pin.boundingBox();expect(rect.x).toBeGreaterThan(board.x);expect(rect.y).toBeGreaterThan(board.y);
    expect(rect.x+rect.width).toBeLessThan(board.x+board.width);expect(rect.y+rect.height).toBeLessThan(board.y+board.height);
  }
  await expect(page.locator('#milestone-detail h2')).toBeInViewport();
  await room(page);await page.setViewportSize({width:390,height:844});await enter(page,'journey',true);
  await page.getByRole('button',{name:'University PREVIEW',exact:true}).click();
  await expect(page.locator('#milestone-detail h2')).toHaveText('University');
  await expect(page.locator('.journey-board')).toBeInViewport({ratio:1});
});

test('Journey paginates CMS records and hides drafts; empty and failed loads remain navigable',async({page})=>{
  // The test deliberately supplies CMS fixtures. Read the current source once
  // instead of adding an upstream HTTP request to the tiny local static server.
  const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
  const supply=body=>page.route('**/content.js',route=>route.fulfill({
    status:200,contentType:'application/javascript',body:source+'\n'+body
  }));
  await supply(`window.journeyRepository={listPublished:async()=>[...Array.from({length:14},(_,i)=>({id:'m'+i,title:'Memory '+i,status:'published',sortOrder:i,summary:'Published summary',description:'A real record shape',result:i===6?'92%':null})),{id:'private',title:'Private draft',status:'draft',sortOrder:0}]};`);
  await ready(page);await enter(page,'journey');
  await expect(page.locator('.journey-pin')).toHaveCount(6);await expect(page.locator('#object-panel')).not.toContainText('Private draft');
  await page.getByRole('button',{name:'Next journey page'}).click();
  await expect(page.locator('#milestone-detail h2')).toHaveText('Memory 6');await expect(page.locator('.milestone-result')).toHaveText('92%');
  await page.getByRole('button',{name:'Next journey page'}).click();await expect(page.locator('.journey-pin')).toHaveCount(2);
  await expect(page.getByRole('button',{name:'Next journey page'})).toBeDisabled();
  await page.unroute('**/content.js');await supply('window.journeyRepository={listPublished:async()=>[]};');
  await ready(page,'&view=journey');await expect(page.locator('.board-empty')).toHaveText('The first chapter is still to come.');await room(page);
  await page.unroute('**/content.js');await supply('window.journeyRepository={listPublished:async()=>{throw new Error("offline")}};');
  await ready(page,'&view=journey');await expect(page.locator('.board-empty')).toContainText('Journey unavailable');await room(page);
});

test('Journal chapters work and a configured resume downloads from its own top right',async({page},testInfo)=>{
  // Exercise a real same-origin download, not Playwright's intercepted PDF path.
  // These are opaque download fixture bytes, not a resume document or user data.
  const pdf=Buffer.from('%PDF-1.4\n% test-only download fixture\n%%EOF\n');
  const fixture=testInfo.outputPath('download-fixture.pdf');
  fs.mkdirSync(path.dirname(fixture),{recursive:true});fs.writeFileSync(fixture,pdf);
  const url='/'+path.relative(process.cwd(),fixture).split(path.sep).join('/');
  try {
  await page.route('**/content.js',async route=>{
    await route.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(__dirname,'../content.js'),'utf8')+`\nconst baseResume=window.resumeRepository.getPublished;window.resumeRepository.getPublished=async()=>({...await baseResume(),downloadUrl:${JSON.stringify(url)}});`});
  });
  await ready(page);await enter(page,'resume');
  await page.getByRole('button',{name:'03 / Experience'}).click();
  await expect(page.locator('#resume-page-content h2')).toHaveText('Experience');
  await expect(page.getByRole('button',{name:'03 / Experience'})).toHaveAttribute('aria-current','page');
  const download=page.getByRole('link',{name:'DOWNLOAD PDF'}),box=await download.boundingBox(),back=await page.getByRole('button',{name:'Back to studio',exact:true}).boundingBox();
  expect(box.x).toBeGreaterThan(1000);expect(Math.abs(box.y-back.y)).toBeLessThan(2);
  const event=page.waitForEvent('download');await download.click();const file=await event;
  expect(file.suggestedFilename()).toBe('Vedansh-Mehrotra-CV.pdf');
  expect(fs.readFileSync(await file.path())).toEqual(pdf);
  } finally {fs.unlinkSync(fixture);}
});

test('Contact validates input, retains a failed draft and clears only after a confirmed response',async({page})=>{
  let requests=[];
  await page.route('**/api/contact',async route=>{requests.push(route.request().postDataJSON());await route.fulfill({status:503,json:{ok:false,error:'Delivery unavailable. Your draft is still here.'}});});
  await ready(page);await enter(page,'contact');
  await page.getByRole('button',{name:'SEND MESSAGE'}).click();expect(requests).toHaveLength(0);
  await page.locator('#contact-message').fill('Hello from the studio.');
  await page.locator('#contact-email').fill('invalid');await page.getByRole('button',{name:'SEND MESSAGE'}).click();expect(requests).toHaveLength(0);
  await page.locator('#contact-email').fill('');await page.getByRole('button',{name:'SEND MESSAGE'}).click();
  await expect(page.locator('#contact-status')).toContainText('Delivery unavailable');expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({name:'',email:'',message:'Hello from the studio.'});
  await room(page);await enter(page,'contact');await expect(page.locator('#contact-message')).toHaveValue('Hello from the studio.');
  await page.unroute('**/api/contact');
  await page.route('**/api/contact',route=>route.fulfill({status:200,json:{ok:true}}));
  await page.getByRole('button',{name:'SEND MESSAGE'}).click();
  await expect(page.locator('#contact-status')).toContainText('Message sent.');await expect(page.locator('#contact-message')).toHaveValue('');
  await expect(page.locator('#contact-email')).toHaveValue('');
});

test('Contact prevents duplicate sends and recovers when returning during an in-flight request',async({page})=>{
  let release,requests=0;
  await page.route('**/api/contact',async route=>{requests++;await new Promise(resolve=>release=resolve);await route.fulfill({status:503,json:{ok:false,error:'Try again later.'}});});
  await ready(page,'&view=contact');await page.locator('#contact-message').fill('Keep this draft.');
  await page.getByRole('button',{name:'SEND MESSAGE'}).click();await expect.poll(()=>requests).toBe(1);
  await expect(page.getByRole('button',{name:'SENDING'})).toBeDisabled();
  await page.evaluate(()=>document.querySelector('form').requestSubmit());expect(requests).toBe(1);
  await room(page);await enter(page,'contact');await expect(page.getByRole('button',{name:'SENDING'})).toBeDisabled();
  release();await expect(page.getByRole('button',{name:'SEND MESSAGE'})).toBeEnabled();
  await expect(page.locator('#contact-message')).toHaveValue('Keep this draft.');
});

test('Keyboard focus includes contact fields and global sound controls, wraps, and returns to the phone',async({page})=>{
  await ready(page);await page.locator('#contact-hotspot').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#object-title')).toBeFocused();
  const selectors=['[data-back-room]','#contact-name','#contact-email','#contact-message','[type=submit]'];
  for(const selector of selectors) { await page.keyboard.press('Tab');await expect(page.locator(`#object-panel ${selector}`)).toBeFocused(); }
  await page.keyboard.press('Tab');await expect(page.locator('#sound-toggle')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#sound-settings-toggle')).toBeFocused();
  await page.keyboard.press('Tab');await expect(page.locator('#object-panel [data-back-room]')).toBeFocused();
  await page.keyboard.press('Shift+Tab');await expect(page.locator('#sound-settings-toggle')).toBeFocused();
  await room(page);await expect(page.locator('#contact-hotspot')).toBeFocused();
});

test('All physical sections work at phone, tablet and desktop sizes, including short screens',async({page},testInfo)=>{
  test.setTimeout(60000);
  for(const [width,height] of [[320,568],[390,844],[768,1024],[1920,1080]]) {
    await page.setViewportSize({width,height});await ready(page,'&reference=1');
    for(const name of ['journey','resume','contact','bookshelf']) {
      await enter(page,name,width<=768);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
      expect(await page.locator('#object-panel').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
      await expect(page.getByRole('button',{name:'Back to studio',exact:true})).toBeInViewport();
      if(name==='contact')await page.getByRole('button',{name:'SEND MESSAGE'}).scrollIntoViewIfNeeded();
      await page.screenshot({path:testInfo.outputPath(`${name}-${width}x${height}.png`)});await room(page);
      await expect(page.locator(width<=768?`#mobile-${name}`:`#${name}-hotspot`)).toBeFocused();
    }
  }
});

test('Resize and reduced motion retain the new sections without an animated rush',async({page})=>{
  await ready(page);await page.locator('#journey-hotspot').click();await page.setViewportSize({width:390,height:844});
  await expect(page.locator('#app')).toHaveAttribute('data-state','journey');await room(page);
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const name of ['journey','resume','contact','bookshelf']) {
    await enter(page,name,true);expect(await page.evaluate(()=>document.getAnimations().length)).toBe(0);
    await expect(page.locator('#speed-lines')).toHaveCSS('opacity','0');await room(page);
  }
});

test('Project case-study files work inside Projects and preserve the selected card',async({page})=>{
  await ready(page);await page.locator('#monitor-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.getByRole('button',{name:'Open PixelJournal, sample project preview',exact:true}).click();
  for(const [label,title] of [['How it works','How it works'],['In pictures','In pictures'],['Stack & links','Stack & links'],['Overview','At a glance']]) {
    await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('#project-file-content h2')).toHaveText(title);
  }
  await page.getByRole('button',{name:'← PROJECTS',exact:true}).click();
  await expect(page.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText('PixelJournal');
});

test('Bookshelf reads published notes, switches entries and leaves About personal',async({page})=>{
  await ready(page);await enter(page,'bookshelf');
  await expect(page.locator('.notes-index button')).toHaveCount(2);
  await page.getByRole('button',{name:'02 Reading list LAYOUT PREVIEW'}).click();
  await expect(page.locator('#note-page h2')).toHaveText('Reading list');
  await expect(page.locator('#note-page h2')).toBeFocused();
  await room(page);await page.locator('#about-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','about');
  await expect(page.locator('#about-panel')).not.toContainText('Semester');
  await expect(page.getByRole('link',{name:'GitHub'})).toHaveAttribute('href','https://github.com/vedanshmehrotra');
  await expect(page.getByRole('link',{name:'LinkedIn'})).toHaveAttribute('href',/linkedin\.com\/in\//);
});

test('Bookshelf filters drafts and handles a failed repository without trapping navigation',async({page})=>{
  const source=fs.readFileSync(path.join(__dirname,'../content.js'),'utf8');
  await page.route('**/content.js',async route=>{
    await route.fulfill({contentType:'application/javascript',body:source+`\nwindow.notesRepository={listPublished:async()=>[{id:'public',title:'Published note',body:'A public note.',status:'published',sortOrder:0},{id:'private',title:'Private draft',body:'Do not expose',status:'draft',sortOrder:1}]};`});
  });
  await ready(page,'&view=bookshelf');await expect(page.locator('.notes-index button')).toHaveCount(1);
  await expect(page.locator('#object-panel')).not.toContainText('Private draft');
  await page.unroute('**/content.js');
  await page.route('**/content.js',async route=>{
    await route.fulfill({contentType:'application/javascript',body:source+'\nwindow.notesRepository={listPublished:async()=>{throw new Error("offline")}};'});
  });
  await ready(page,'&view=bookshelf');await expect(page.locator('.notes-index')).toContainText('Shelf unavailable');await room(page);
});

test('Native touch selects a Journey pin and the return stays accessible after resizing',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const page=await context.newPage();await page.goto('http://127.0.0.1:4173/?qa=1');
    await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
    await page.locator('#mobile-journey').tap();await expect(page.locator('#app')).toHaveAttribute('data-state','journey');
    await page.getByRole('button',{name:'University PREVIEW',exact:true}).tap();
    await expect(page.locator('#milestone-detail h2')).toHaveText('University');
    await page.getByRole('button',{name:'Back to studio',exact:true}).tap();await expect(page.locator('#app')).toHaveAttribute('data-state','room');
    await expect(page.locator('#mobile-journey')).toBeFocused();
    await page.setViewportSize({width:1440,height:900});await enter(page,'resume');
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Back to studio',exact:true}).tap();
    await expect(page.locator('#app')).toHaveAttribute('data-state','room');await expect(page.locator('#mobile-resume')).toBeFocused();
  } finally {await context.close();}
});
