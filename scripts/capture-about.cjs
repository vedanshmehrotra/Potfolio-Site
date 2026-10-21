const {chromium}=require('@playwright/test');
const fs=require('node:fs');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'qa/recordings',size:{width:1440,height:900}}});
    const page=await context.newPage();
    const state=value=>page.waitForFunction(value=>document.querySelector('#app').dataset.state===value,value);
    await page.goto('http://127.0.0.1:4173/');
    await page.waitForFunction(()=>document.querySelector('#app').dataset.ready==='true');
    await page.waitForTimeout(500);
    await page.locator('#about-hotspot').click(); await state('about');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape'); await state('room');
    await page.waitForTimeout(500);
    await page.locator('#lamp-hotspot').click();
    await page.waitForFunction(()=>document.querySelector('#app').dataset.lamp==='lit');
    await page.waitForTimeout(400);
    await page.locator('#about-hotspot').click(); await state('about');
    await page.waitForTimeout(1000);
    await page.getByRole('button',{name:'Back to studio',exact:true}).click(); await state('room');
    await page.waitForTimeout(500);
    const recording=await page.video().path(); await context.close();
    fs.copyFileSync(recording,'qa/about-monitor-review.webm');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
