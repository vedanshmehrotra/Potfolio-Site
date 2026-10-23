'use strict';
const {chromium,expect}=require('@playwright/test');const fs=require('node:fs/promises');
const origin=process.env.DEPLOYMENT_URL||'https://after-hours-portfolio-virid.vercel.app';
if(new URL(origin).protocol!=='https:')throw new Error('Live Contact verification requires HTTPS.');
async function verify(){
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const report={origin,checks:[],contentRequests:[],pageErrors:[]};const started=Date.now();let page;
  try{
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});page=await context.newPage();
    page.on('pageerror',error=>report.pageErrors.push(error.message));
    page.on('response',response=>{if(new URL(response.url()).pathname==='/api/content')report.contentRequests.push({status:response.status(),elapsedMs:Date.now()-started});});
    page.on('requestfailed',request=>{if(new URL(request.url()).pathname==='/api/content')report.contentRequests.push({error:request.failure()?.errorText,elapsedMs:Date.now()-started});});
    await page.goto(origin+'/?view=contact',{waitUntil:'commit'});await expect(page.locator('#contact-message')).toBeVisible({timeout:60000});report.contactReadyMs=Date.now()-started;
    await page.locator('#contact-message').fill('Deployment verification: draft retention check.');
    const [response]=await Promise.all([
      page.waitForResponse(response=>response.request().method()==='POST'&&new URL(response.url()).pathname==='/api/contact'),
      page.locator('#contact-form [type=submit]').tap()
    ]);
    report.status=response.status();report.body=await response.json();expect(response.status()).toBe(200);
    await expect(page.locator('#contact-status')).toContainText('Message sent.');await expect(page.locator('#contact-message')).toHaveValue('');
    await page.screenshot({path:'qa/cms/production-contact-sent.png'});
    report.checks.push('Real mobile Contact submission accepted; app confirms success and clears draft');
    await page.getByRole('button',{name:'Back to studio',exact:true}).tap();await page.locator('#mobile-projects').tap();await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
    report.projectState=await page.locator('#expanded-stage').innerText();report.projectCardCount=await page.locator('#expanded-stage .pixel-card').count();
    expect(report.pageErrors).toEqual([]);report.passed=true;
  }catch(error){report.passed=false;report.error=error.message;if(page)await page.screenshot({path:'qa/cms/production-contact-failure.png'}).catch(()=>{});process.exitCode=1;}
  finally{await browser.close();await fs.writeFile('qa/cms/production-mail-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
}
verify().catch(error=>{console.error(error.name);process.exitCode=1;});
