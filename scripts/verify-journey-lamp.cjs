'use strict';
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises');const path=require('node:path');
const origin=process.env.DEPLOYMENT_URL||'http://127.0.0.1:4180';
const directory=path.join(__dirname,'../qa/journey-release');
const prefix=new URL(origin).protocol==='https:'?'production':'development';
const ids=['university','airbornehrs','robotics-club','think-computers','academic-recognition'];
(async()=>{
  await fs.mkdir(directory,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
  const report={origin,checks:[],pageErrors:[],failedRequests:[]};let context,page;
  try{
    context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:directory,size:{width:1440,height:900}}});page=await context.newPage();
    const observe=page=>{
      page.on('pageerror',error=>report.pageErrors.push(error.message));
      page.on('response',response=>{if(response.status()>=400&&(/\/api\/content|\/assets\//).test(new URL(response.url()).pathname))report.failedRequests.push({path:new URL(response.url()).pathname,status:response.status()});});
    };observe(page);
    const api=await context.request.get(origin+'/api/content');expect(api.status()).toBe(200);const data=await api.json();
    expect(data.sections.journey.map(item=>item.id)).toEqual(ids);report.checks.push('Public CMS API returns all five approved milestones in confirmed order');
    await page.addInitScript(()=>{
      window.__audioContexts=[];
      window.AudioContext=new Proxy(window.AudioContext,{construct(target,args){const context=Reflect.construct(target,args);window.__audioContexts.push(context);return context;}});
      window.__lampTimes={};new MutationObserver(()=>{const app=document.querySelector('#app');if(!app)return;
        if(app.dataset.ready==='true')window.__lampTimes.ready??=performance.now();
        if(app.dataset.lamp==='lighting')window.__lampTimes.lighting??=performance.now();
        if(app.dataset.lamp==='lit')window.__lampTimes.lit??=performance.now();
      }).observe(document,{subtree:true,attributes:true,attributeFilter:['data-ready','data-lamp']});
    });
    await page.goto(origin,{waitUntil:'domcontentloaded'});await expect(page.locator('#app')).toHaveAttribute('data-ready','true',{timeout:60000});
    await page.screenshot({path:path.join(directory,`${prefix}-room-dark.png`)});
    await expect(page.locator('#app')).toHaveAttribute('data-lamp','lighting',{timeout:6500});
    await expect(page.locator('#lighting-video')).toHaveClass(/is-active/);await page.waitForTimeout(500);
    await page.screenshot({path:path.join(directory,`${prefix}-lamp-transition.png`)});
    await expect(page.locator('#app')).toHaveAttribute('data-lamp','lit',{timeout:10000});
    await page.screenshot({path:path.join(directory,`${prefix}-room-lit.png`)});
    report.lampTimes=await page.evaluate(()=>window.__lampTimes);
    report.lampDelayMs=report.lampTimes.lighting-report.lampTimes.ready;
    expect(report.lampDelayMs).toBeGreaterThanOrEqual(3450);expect(report.lampDelayMs).toBeLessThan(5000);
    expect(await page.locator('#lit-video').evaluate(v=>!v.paused&&v.loop)).toBe(true);
    expect(await page.evaluate(()=>window.__audioContexts.some(context=>context.state==='running'))).toBe(false);
    await page.locator('#lamp-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-lamp','dark');
    await page.waitForTimeout(3800);await expect(page.locator('#app')).toHaveAttribute('data-lamp','dark');
    await expect(page.locator('#lamp-discovery-glow')).toBeHidden();
    report.checks.push('Real unclicked page lights automatically after readiness, plays the supplied transition, and starts the lit ambient loop; audio stays locked until a gesture; manual off stays dark');
    const video=page.video();await context.close();await video.saveAs(path.join(directory,`${prefix}-automatic-lamp.webm`));
    for(const width of [1440,390,320]){
      context=await browser.newContext({viewport:{width,height:width===1440?900:844},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'});page=await context.newPage();observe(page);
      await page.goto(origin+'/?view=journey',{waitUntil:'domcontentloaded'});await expect(page.locator('#app')).toHaveAttribute('data-ready','true',{timeout:60000});
      await expect(page.locator('.journey-pin')).toHaveCount(5);await expect(page.locator('.pin-document')).toHaveCount(5);
      expect(await page.locator('.journey-pin').evaluateAll(pins=>pins.map(pin=>pin.dataset.milestone))).toEqual(ids);
      await expect(page.locator('.journey-board')).toBeInViewport({ratio:1});
      for(const record of data.sections.journey){await page.locator(`[data-milestone="${record.id}"]`).click();await expect(page.locator('#milestone-detail h2')).toHaveText(record.title);}
      await expect(page.locator('.milestone-result')).toHaveText('Top 10 · cohort CGPA');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.locator('#object-title').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(directory,`${prefix}-journey-${width}.png`)});
      await page.getByRole('button',{name:'Back to studio',exact:true}).click();await expect(page.locator('#app')).toHaveAttribute('data-state','room');await expect(page.locator(width<700?'#mobile-journey':'#journey-hotspot')).toBeFocused();
      await context.close();report.checks.push(`${width}px: real CMS pins, story selection, full board visibility, no document overflow and reverse navigation`);
    }
    expect(report.pageErrors).toEqual([]);expect(report.failedRequests).toEqual([]);report.passed=true;
  }catch(error){report.passed=false;report.error=error.stack;process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(directory,`${prefix}-failure.png`)}).catch(()=>{});}
  finally{await browser.close();await fs.writeFile(path.join(directory,`${prefix}-verification.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
})().catch(error=>{console.error(error.message);process.exitCode=1;});
