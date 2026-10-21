const { chromium } = require('@playwright/test');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
  const context = await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:'qa/recordings',size:{width:1440,height:900}}});
  const page = await context.newPage();
  const readyState = state => page.waitForFunction(state=>document.querySelector('#app').dataset.state===state,state);
  await page.goto('http://127.0.0.1:4173/');
  await page.waitForFunction(()=>document.querySelector('#app').dataset.ready==='true');
  await page.waitForTimeout(400);
  await page.locator('#lamp-hotspot').click();
  await page.waitForFunction(()=>document.querySelector('#lighting-video').classList.contains('is-active'));
  await page.waitForTimeout(800);
  await page.screenshot({path:'qa/lamp-transition.png'});
  await page.waitForFunction(()=>document.querySelector('#app').dataset.lamp==='lit');
  await page.screenshot({path:'qa/room-lit-1440x900.png'});
  await page.waitForTimeout(400);
  await page.locator('#monitor-hotspot').click();
  await readyState('projects');
  await page.waitForTimeout(500);
  await page.getByRole('button',{name:'Next project',exact:true}).click();
  await page.waitForTimeout(350);
  await page.getByRole('button',{name:'Back to studio',exact:true}).click();
  await readyState('room');
  await page.waitForTimeout(600);
  const videoPath = await page.video().path();
  await context.close();
  fs.copyFileSync(videoPath,'qa/smooth-rush-review.webm');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
