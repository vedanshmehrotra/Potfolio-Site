'use strict';
const {chromium,expect}=require('@playwright/test');const fs=require('node:fs/promises');const path=require('node:path');
const origin=process.env.DEPLOYMENT_URL||'http://127.0.0.1:4180';
const live=new URL(origin).protocol==='https:',out=path.join(__dirname,'../qa/content');const prefix=live?'production':'development';
const names=['PathForge','ResolveFlow','Automated CI/CD Framework','PlanEase'];
async function verify(){
  await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const report={origin,checks:[],pageErrors:[],contentRequests:[]};let page;
  const observe=page=>{const starts=new Map();page.on('pageerror',error=>report.pageErrors.push(error.message));page.on('request',request=>{if(new URL(request.url()).pathname==='/api/content')starts.set(request,Date.now());});page.on('response',response=>{if(new URL(response.url()).pathname==='/api/content')report.contentRequests.push({status:response.status(),durationMs:Date.now()-(starts.get(response.request())||Date.now())});});};
  try{
    const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});page=await context.newPage();observe(page);
    const api=await context.request.get(origin+'/api/content');expect(api.status()).toBe(200);const publicData=await api.json();
    expect(publicData.sections.projects.map(item=>item.title)).toEqual(names);expect(publicData.sections.notes).toHaveLength(7);expect(publicData.sections.notes.filter(item=>item.credentialType==='training-badge')).toHaveLength(6);
    expect(publicData.sections.resume.preview).toBe(false);expect(publicData.sections.about.role).toBe('Backend · Cloud · Applied AI');
    report.checks.push('Real CMS API contains four requested projects, six public training badges and completed About/Resume content');
    console.log('Verified public content records.');
    await page.goto(origin,{waitUntil:'commit'});await expect(page.locator('#app')).toHaveAttribute('data-ready','true',{timeout:60000});
    await expect(page.locator('#monitor-live .card-title')).toHaveText(names.slice(0,3));await page.locator('#monitor-hotspot').click();
    for(let i=0;i<names.length;i++){
      await expect(page.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText(names[i]);
      await expect(page.locator('#monitor-live .pixel-card.is-selected .card-title')).toHaveText(names[i]);
      await page.getByRole('button',{name:`Open ${names[i]}`,exact:true}).click();await expect(page.locator('#project-detail h1')).toHaveText(names[i]);
      for(const label of ['Overview','How it works','In pictures','Stack & links']){await page.getByRole('button',{name:label,exact:true}).click();await expect(page.locator('#project-file-content')).not.toBeEmpty();}
      await page.getByRole('button',{name:'← PROJECTS',exact:true}).click();if(i<names.length-1)await page.getByRole('button',{name:'Next project',exact:true}).click();
    }
    await expect(page.locator('#expanded-stage .pixel-card.is-selected')).toBeInViewport();await page.screenshot({path:path.join(out,`${prefix}-projects-page-two.png`)});
    await page.getByRole('button',{name:'Next project',exact:true}).click();await expect(page.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText('PathForge');
    await page.screenshot({path:path.join(out,`${prefix}-projects.png`)});await page.keyboard.press('Escape');await expect(page.locator('#monitor-hotspot')).toBeFocused();
    report.checks.push('All four project files and tabs open; page two is reachable; miniature selection matches; wrapping and reverse navigation work');
    console.log('Verified all four desktop project files and shared monitor selection.');
    await page.locator('#about-hotspot').click();await expect(page.locator('#about-stage')).toContainText('Backend · Cloud · Applied AI');await expect(page.locator('#about-stage')).not.toContainText('copy to come');
    expect(await page.locator('#about-stage .about-footer').evaluate(el=>el.getBoundingClientRect().bottom<=el.closest('.about-screen').getBoundingClientRect().bottom+1)).toBe(true);
    await page.screenshot({path:path.join(out,`${prefix}-about.png`)});await page.keyboard.press('Escape');
    await page.locator('#journey-hotspot').click();await expect(page.locator('.journey-pin')).toHaveCount(5);await page.locator('[data-milestone="think-computers"]').click();await expect(page.locator('#milestone-detail')).toContainText('Think Computers');await page.screenshot({path:path.join(out,`${prefix}-journey.png`)});await page.keyboard.press('Escape');
    await page.locator('#resume-hotspot').click();await page.getByRole('button',{name:'02 / Experience',exact:true}).click();await expect(page.locator('#resume-page-content')).toContainText('AirBorneHRS');await expect(page.getByRole('link',{name:'DOWNLOAD PDF'})).toHaveAttribute('href',/Vedansh-Mehrotra-CV\.pdf/);await page.screenshot({path:path.join(out,`${prefix}-resume.png`)});await page.keyboard.press('Escape');
    await page.locator('#bookshelf-hotspot').focus();await page.keyboard.press('Enter');await expect(page.locator('#object-title')).toHaveText('Certifications & learning');
    await expect(page.locator('.notes-index button')).toHaveCount(7);await expect(page.locator('#note-page')).toContainText('Training badge');await expect(page.locator('#note-page')).toContainText('May 2026');
    for(const item of publicData.sections.notes){await page.locator(`[data-note="${item.id}"]`).click();await expect(page.locator('#note-page h2')).toBeFocused();await expect(page.getByRole('link',{name:'VERIFY CREDENTIAL'})).toHaveAttribute('href',item.sourceUrl);if(item.imageUrl){await expect(page.locator('.credential-image')).toBeVisible();await expect.poll(()=>page.locator('.credential-image').evaluate(image=>image.complete&&image.naturalWidth>0)).toBe(true);}}
    await page.locator('.notes-index button').first().click();await page.locator('#object-title').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`${prefix}-credentials.png`)});await page.keyboard.press('Escape');await expect(page.locator('#bookshelf-hotspot')).toBeFocused();
    report.checks.push('Personal About, five career milestones, resume experience chapters, credential metadata, badge images, verification links and keyboard focus work');
    console.log('Verified desktop About, Journey, Resume and credential shelf.');
    for(const width of [390,320]){
      const mobileContext=await browser.newContext({viewport:{width,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});const mobile=await mobileContext.newPage();page=mobile;observe(mobile);const started=Date.now();
      await mobile.goto(origin,{waitUntil:'commit'});await expect(mobile.locator('#app')).toHaveAttribute('data-ready','true',{timeout:60000});report[`mobileReady${width}Ms`]=Date.now()-started;
      await mobile.locator('#mobile-projects').tap();for(let i=0;i<3;i++)await mobile.getByRole('button',{name:'Next project',exact:true}).tap();await expect(mobile.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText('PlanEase');await expect(mobile.locator('#expanded-stage .pixel-card.is-selected')).toBeInViewport();
      await mobile.screenshot({path:path.join(out,`${prefix}-projects-${width}.png`)});await mobile.getByRole('button',{name:'Back to studio',exact:true}).tap();await mobile.locator('#mobile-bookshelf').tap();
      await expect(mobile.locator('.notes-index button')).toHaveCount(7);await mobile.locator('[data-note="aws-storage"]').tap();await expect(mobile.locator('#note-page h2')).toHaveText('AWS Educate Getting Started with Storage');
      await mobile.getByRole('link',{name:'VERIFY CREDENTIAL'}).scrollIntoViewIfNeeded();await mobile.screenshot({path:path.join(out,`${prefix}-credentials-${width}.png`)});
      expect(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await mobile.getByRole('button',{name:'Back to studio',exact:true}).tap();await expect(mobile.locator('#app')).toHaveAttribute('data-state','room');await mobileContext.close();
      console.log(`Verified ${width}px touch layout.`);
    }
    report.checks.push('390px and 320px touch layouts reach the fourth project and credential details without document overflow; reverse navigation works');expect(report.pageErrors).toEqual([]);report.passed=true;
  }catch(error){report.passed=false;report.error=error.stack;if(page)await page.screenshot({path:path.join(out,`${prefix}-failure.png`)}).catch(()=>{});process.exitCode=1;}
  finally{await browser.close();await fs.writeFile(path.join(out,`${prefix}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
}
verify().catch(error=>{console.error(error.name);process.exitCode=1;});
