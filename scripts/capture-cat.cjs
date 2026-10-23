const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const origin='http://127.0.0.1:4173';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[];
  try {
    const page=await browser.newPage({viewport:{width:1440,height:960}});page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${origin}/?qa=1&reference=1`);await page.waitForFunction(()=>window.studioParrot);
    await page.locator('#lamp-hotspot').click();await page.waitForFunction(()=>document.querySelector('#app').dataset.lamp==='lit');
    await page.mouse.move(1,1);await page.screenshot({path:'qa/parrot/integrated-main-studio.png'});
    await page.goto(`${origin}/qa/cat-review.html?reference=1`);await page.waitForFunction(()=>window.catReview?.inspect().ready);
    await page.locator('#lamp').click();await page.waitForFunction(()=>window.catReviewStudio.querySelector('#app').dataset.lamp==='lit');
    await page.waitForTimeout(2700);
    await page.screenshot({path:'qa/cat/original-rest.png'});
    await page.evaluate(()=>window.catReview.pose('notice',5));await page.waitForTimeout(60);await page.screenshot({path:'qa/cat/notice-closeup.png'});
    await page.evaluate(()=>window.catReview.pose('pet',5));await page.waitForTimeout(60);await page.screenshot({path:'qa/cat/pet-closeup.png'});
    await page.evaluate(()=>{
      const doc=window.catReviewStudio,background=doc.querySelector('#frozen-room');
      const sheet=document.createElement('canvas');sheet.id='cat-pose-sheet';sheet.width=840;sheet.height=440;
      Object.assign(sheet.style,{position:'fixed',inset:0,zIndex:9999,width:'1260px',height:'660px',imageRendering:'pixelated'});
      const ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
      const poses=[0,2,4,6,8,10,14,18];
      for(let row=0;row<2;row++)for(let i=0;i<8;i++) {
        const x=i%4*210,y=(row*2+Math.floor(i/4))*110;
        ctx.drawImage(background,1160,390,210,110,x,y,210,110);
        window.catReview.pose(row?'pet':'notice',poses[i]);ctx.drawImage(window.catReview.canvas,x+20,y+20);
      }
      document.body.append(sheet);
    });
    await page.locator('#cat-pose-sheet').screenshot({path:'qa/cat/rendered-poses.png'});await page.close();
    const context=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:'qa/cat/recordings',size:{width:1440,height:960}}});
    const live=await context.newPage();live.on('pageerror',error=>errors.push(error.message));
    await live.goto(`${origin}/qa/cat-review.html`);await live.waitForFunction(()=>window.catReview?.inspect().ready);
    await live.locator('#lamp').click();await live.waitForFunction(()=>window.catReviewStudio.querySelector('#app').dataset.lamp==='lit');
    await live.waitForFunction(()=>window.catReview.inspect().phase==='idle');await live.waitForTimeout(600);
    await live.locator('#pet').click();await live.waitForFunction(()=>window.catReview.inspect().phase==='idle');await live.waitForTimeout(900);
    const state=await live.evaluate(()=>window.catReview.inspect());
    const timing={};
    for(const phase of ['notice','pet']) {
      const poses=state.history.filter(item=>item.phase===phase),gaps=poses.slice(1).map((pose,i)=>pose.time-poses[i].time);
      timing[phase]={ticks:poses.length,meanMs:gaps.reduce((a,b)=>a+b,0)/gaps.length,minMs:Math.min(...gaps),maxMs:Math.max(...gaps)};
    }
    fs.writeFileSync('qa/cat/browser-diagnostics.json',JSON.stringify({state,timing,errors},null,2));
    const video=live.video();await context.close();await video.saveAs('qa/cat/lamp-and-petting.webm');
    const phone=await browser.newPage({viewport:{width:390,height:844}});await phone.goto(`${origin}/qa/cat-review.html`);await phone.waitForFunction(()=>window.catReview?.inspect().ready);
    await phone.locator('#lamp').click();await phone.waitForFunction(()=>window.catReviewStudio.querySelector('#app').dataset.lamp==='lit');
    await phone.evaluate(()=>window.catReview.pose('notice',5));await phone.screenshot({path:'qa/cat/mobile-closeup.png'});
    if(errors.length)throw new Error(errors.join('\n'));
    console.log('Captured integrated parrot and local cat reference poses, live reactions, and phone view.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
