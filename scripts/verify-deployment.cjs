'use strict';

// Smoke-check the actual deployed studio without localhost diagnostic hooks.
// When mail is configured this sends one own-inbox Contact test.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const origin=process.env.DEPLOYMENT_URL;
if(!origin || new URL(origin).protocol!=='https:')throw new Error('Set DEPLOYMENT_URL to the HTTPS deployment origin.');
const out=path.join(root,'qa','deployment');

async function verify() {
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const report={origin,checks:[],pageErrors:[],failedRequests:[]};
  try {
    const context=await browser.newContext({viewport:{width:1440,height:960}});
    const page=await context.newPage();
    page.on('pageerror',error=>report.pageErrors.push(error.message));
    page.on('requestfailed',request=>{
      // Browsers may abort in-flight media on navigation; record it separately.
      report.failedRequests.push({url:request.url(),error:request.failure()?.errorText});
    });
    const response=await page.goto(origin,{waitUntil:'domcontentloaded'});
    expect(response.status()).toBe(200);
    await expect(page.locator('#app')).toHaveAttribute('data-ready','true',{timeout:30000});
    await expect(page.locator('#app')).toHaveAttribute('data-cat','ready',{timeout:30000});
    await expect(page.locator('#app')).toHaveAttribute('data-parrot','ready',{timeout:30000});
    await expect(page.locator('#sound-toggle')).toHaveAttribute('aria-pressed','true');
    expect(await page.evaluate(()=>!!(window.__studioDiagnostics||window.studioCat||window.studioParrot))).toBe(false);
    report.checks.push('Public studio, both animals, default sound and disabled diagnostic globals');
    const cms=await(await context.request.get(new URL('/api/content',origin).href)).json();
    expect(cms.configured).toBe(true);expect(Object.keys(cms.sections).sort()).toEqual(['about','journey','notes','projects','resume']);
    const mailActive=cms.contactAvailable===true;
    const nextProject=cms.sections.projects[1];
    for(const endpoint of ['/api/admin','/api/content?draft=1'])expect((await context.request.get(new URL(endpoint,origin).href)).status()).toBe(401);
    const authHealth=await context.request.get(new URL('/api/auth/ok',origin).href);expect(authHealth.status()).toBe(200);
    const registration=await context.request.post(new URL('/api/auth/sign-up/email',origin).href,{headers:{origin},data:{email:'not-owner@example.test',password:'not-a-real-password',name:'No public signup'}});expect(registration.status()).toBe(404);
    const resetCallback=await context.request.get(new URL('/api/auth/reset-password/nonexistent-verification-token?callbackURL=%2Fadmin%2Freset.html',origin).href,{maxRedirects:0});
    expect(resetCallback.status()).toBe(302);expect(new URL(resetCallback.headers().location).pathname).toBe('/admin/reset.html');expect(new URL(resetCallback.headers().location).searchParams.get('error')).toBe('INVALID_TOKEN');
    report.checks.push('Postgres serves all five public sections; anonymous draft/admin access and public signup are denied');
    report.checks.push('Password-reset callback reaches the library and redirects an invalid token safely to the reset page');

    // Verify the original downloaded artwork, recordings and CV byte-for-byte.
    for(const file of [
      'after_hours_dark_ambient_canonical_v1_4s.mp4',
      'after_hours_lit_ambient_breathing_v3_4s.mp4',
      'after_hours_transition_clean_2s.mp4',
      'assets/parrot/parrot-atlas-v1.png','assets/cat/sleepy-eyes-v1.png',
      'assets/audio/indoor-rain.mp3','assets/audio/cat-purr.wav','assets/Vedansh-Mehrotra-CV.pdf'
    ]) {
      const remote=await context.request.get(new URL(file,origin).href);
      expect(remote.status(),file).toBe(200);
      const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
      expect(digest(await remote.body()),file).toBe(digest(await fs.readFile(path.join(root,file))));
    }
    report.checks.push('Original videos, animal artwork, recordings and CV retain exact bytes');
    for(const file of ['/.env','/.env.production.local','/server/auth.cjs','/db/001-content.sql','/qa/cat-review.html','/scripts/prepare-deployment.cjs','/package.json']) {
      const remote=await context.request.get(new URL(file,origin).href);
      expect(remote.status(),file).toBe(404);
    }
    // Vercel also dispatches /api/contact.js to the function. Verify its JSON
    // response rather than incorrectly treating that executable alias as a leak.
    const apiAlias=await context.request.get(new URL('/api/contact.js',origin).href);
    expect(apiAlias.status()).toBe(405);
    expect(apiAlias.headers()['content-type']).toContain('application/json');
    expect(await apiAlias.json()).toEqual({ok:false,error:'Use POST to send a message.'});
    report.checks.push('QA, environment and build tooling are not served; API suffix executes the handler without exposing source');

    const rain=page.waitForResponse(response=>response.url().endsWith('/assets/audio/indoor-rain.mp3')&&response.ok());
    await page.locator('#sound-settings-toggle').click();
    await rain;
    await page.locator('#sound-settings-toggle').click();
    await page.locator('#lamp-hotspot').click();
    await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit');
    await page.locator('#cat-hotspot').click();
    await page.mouse.move(1,1);
    await page.screenshot({path:path.join(out,'desktop-room.png')});

    for(const [hotspot,state] of [['monitor','projects'],['about','about'],['journey','journey'],['resume','resume'],['contact','contact'],['bookshelf','bookshelf']]) {
      await page.locator(`#${hotspot}-hotspot`).click();
      await expect(page.locator('#app')).toHaveAttribute('data-state',state);
      if(state==='projects') {
        await page.getByRole('button',{name:'Next project',exact:true}).click();
        await expect(page.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText(nextProject.title);
        await expect(page.locator('#monitor-live .pixel-card.is-selected .card-title')).toHaveText(nextProject.title);
        await page.getByRole('button',{name:`Open ${nextProject.title}${nextProject.preview?', sample project preview':''}`,exact:true}).click();
        await page.getByRole('button',{name:'Engineering',exact:true}).click();
        await expect(page.locator('#project-file-content h2')).toHaveText('Engineering decisions');
        await page.getByRole('button',{name:'← PROJECTS',exact:true}).click();
        await expect(page.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText(nextProject.title);
      }
      if(state==='resume') {
        const download=page.waitForEvent('download');
        await page.getByRole('link',{name:'DOWNLOAD PDF'}).click();
        expect((await download).suggestedFilename()).toBe('Vedansh-Mehrotra-CV.pdf');
      }
      await page.screenshot({path:path.join(out,`desktop-${state}.png`)});
      await page.keyboard.press('Escape');
      await expect(page.locator('#app')).toHaveAttribute('data-state','room');
      await expect(page.locator(`#${hotspot}-hotspot`)).toBeFocused();
    }
    await page.locator('#lamp-hotspot').click();
    await expect(page.locator('#app')).toHaveAttribute('data-lamp','dark');
    report.checks.push('Audio recording unlock, lamp on/off, all six section entries, shared carousel selection, case-study tabs, reverse navigation and CV download');

    await page.goto(new URL('/?view=projects',origin).href,{waitUntil:'domcontentloaded'});
    await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.locator('#projects-title')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('#app')).toHaveAttribute('data-state','room');
    report.checks.push('Projects deep link and refresh');

    const phone=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    const mobile=await phone.newPage();mobile.on('pageerror',error=>report.pageErrors.push(error.message));
    const mobileStarted=Date.now();await mobile.goto(origin,{waitUntil:'domcontentloaded'});await expect(mobile.locator('#app')).toHaveAttribute('data-ready','true',{timeout:30000});report.mobileReadyMs=Date.now()-mobileStarted;
    await mobile.screenshot({path:path.join(out,'mobile-room.png')});
    for(const state of ['projects','about','journey','resume','contact','bookshelf']) {
      await mobile.locator(`#mobile-${state}`).tap();
      await expect(mobile.locator('#app')).toHaveAttribute('data-state',state);
      await expect(mobile.getByRole('button',{name:'Back to studio',exact:true})).toBeInViewport();
      if(state==='projects') {
        await mobile.getByRole('button',{name:'Next project',exact:true}).tap();
        await expect(mobile.locator('#expanded-stage .pixel-card.is-selected .card-title')).toHaveText(nextProject.title);
        await expect(mobile.locator('#expanded-stage .pixel-card.is-selected')).toBeInViewport();
      }
      if(state==='contact') {
        let submissions=0;mobile.on('request',request=>{if(request.url().endsWith('/api/contact'))submissions++;});
        await mobile.getByRole('button',{name:'SEND MESSAGE'}).tap();
        await expect(mobile.locator('#contact-message')).toHaveAttribute('aria-invalid','true');
        expect(submissions).toBe(0);
        await mobile.locator('#contact-message').fill('Deployment verification: draft retention check.');
        const submission=mobile.waitForResponse(response=>response.url().endsWith('/api/contact'));
        await mobile.getByRole('button',{name:'SEND MESSAGE'}).tap();
        expect((await submission).status()).toBe(mailActive?200:503);
        await expect(mobile.locator('#contact-status')).toContainText(mailActive?'Message sent.':'not connected yet');
        await expect(mobile.locator('#contact-message')).toHaveValue(mailActive?'':'Deployment verification: draft retention check.');
        report.emailDelivery=mailActive?'Own-inbox test accepted by provider; inbox arrival not confirmed':'Not configured; disabled-delivery response and draft retention verified';
      }
      // Let Chrome's short native tap highlight fade before visual inspection.
      await mobile.waitForTimeout(350);
      await mobile.screenshot({path:path.join(out,`mobile-${state}.png`)});
      await mobile.getByRole('button',{name:'Back to studio',exact:true}).tap();
      await expect(mobile.locator('#app')).toHaveAttribute('data-state','room');
    }
    expect(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    report.checks.push('390px touch/reduced-motion navigation, inline form validation and the configured contact delivery state');
    const method=await context.request.get(new URL('/api/contact',origin).href);
    expect(method.status()).toBe(405);
    expect(method.headers().allow).toBe('POST');
    const invalid=await context.request.post(new URL('/api/contact',origin).href,{data:{message:''}});
    expect(invalid.status()).toBe(400);
    report.checks.push('Deployed Node contact function rejects unsupported methods and invalid payloads');
    expect(report.pageErrors).toEqual([]);
    report.passed=true;
  } catch(error) {report.passed=false;report.error=error.stack;throw error;}
  finally {
    await fs.writeFile(path.join(out,'verification.json'),JSON.stringify(report,null,2));
    await browser.close();
    console.log(JSON.stringify(report,null,2));
  }
}
verify().catch(()=>{process.exitCode=1;});
