const {chromium}=require('@playwright/test');
const fs=require('node:fs');
const origin='http://127.0.0.1:4173';

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const errors=[];
  try {
    const context=await browser.newContext({viewport:{width:1440,height:960}});
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${origin}/qa/parrot-review.html`);
    await page.waitForFunction(()=>window.parrotReview?.inspect().ready);
    await page.locator('#pause').click();
    await page.screenshot({path:'qa/parrot/room-dark.png'});
    await page.locator('#lamp').click();
    const studio=page.frameLocator('#review-studio');
    await studio.locator('#app').waitFor({state:'visible'});
    await page.waitForFunction(()=>window.parrotReview.inspect().lamp==='lit');
    await page.evaluate(()=>window.parrotReview.frame(0));
    await page.screenshot({path:'qa/parrot/room-lit.png'});
    await page.locator('#show-closeup').click();
    await page.screenshot({path:'qa/parrot/rest-closeup.png'});
    await page.evaluate(()=>window.parrotReview.frame(8));
    await page.screenshot({path:'qa/parrot/preen-closeup.png'});
    await page.evaluate(()=>{
      const doc=window.parrotReviewStudio,background=doc.querySelector('.room-video.is-active');background.pause();
      const sheet=document.createElement('canvas');sheet.id='rendered-pose-sheet';sheet.width=568;sheet.height=400;
      Object.assign(sheet.style,{position:'fixed',inset:'0',zIndex:'9999',width:'1136px',height:'800px',imageRendering:'pixelated'});
      const ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
      for(let frame=0;frame<16;frame++) {
        const x=frame%4*142,y=Math.floor(frame/4)*100;
        ctx.drawImage(background,560,232,142,100,x,y,142,100);
        window.parrotReview.frame(frame);ctx.drawImage(window.parrotReview.canvas,x+20,y+7);
      }
      document.body.append(sheet);
    });
    await page.locator('#rendered-pose-sheet').screenshot({path:'qa/parrot/rendered-poses.png'});
    await page.evaluate(()=>{document.querySelector('#rendered-pose-sheet').remove();document.querySelector('#review-studio').contentDocument.querySelector('.room-video.is-active').play();window.parrotReview.frame(0);});
    await context.close();
    // Record a separate, clean user workflow: no scrubbing or proof-sheet overlay.
    const movieContext=await browser.newContext({viewport:{width:1440,height:960},recordVideo:{dir:'qa/parrot/recordings',size:{width:1440,height:960}}});
    const movie=await movieContext.newPage();movie.on('pageerror',error=>errors.push(error.message));
    await movie.goto(`${origin}/qa/parrot-review.html`);await movie.waitForFunction(()=>window.parrotReview?.inspect().ready);
    await movie.locator('#lamp').click();await movie.waitForFunction(()=>window.parrotReview.inspect().lamp==='lit');
    await movie.locator('#show-closeup').click();await movie.waitForTimeout(1500);
    await movie.locator('#preen').click();await movie.waitForTimeout(3400);await movie.waitForTimeout(3500);
    fs.writeFileSync('qa/parrot/browser-diagnostics.json',JSON.stringify({state:await movie.evaluate(()=>window.parrotReview.inspect()),errors},null,2));
    const video=movie.video();await movieContext.close();await video.saveAs('qa/parrot/breathing-preening.webm');
    const mobile=await browser.newPage({viewport:{width:390,height:844}});
    mobile.on('pageerror',error=>errors.push(error.message));
    await mobile.goto(`${origin}/qa/parrot-review.html`);await mobile.waitForFunction(()=>window.parrotReview?.inspect().ready);
    await mobile.locator('#lamp').click();await mobile.waitForFunction(()=>window.parrotReview.inspect().lamp==='lit');
    await mobile.screenshot({path:'qa/parrot/room-mobile.png'});
    if(errors.length)throw new Error(errors.join('\n'));
    console.log('Captured original-room parrot prototype, close-ups, mobile, and real-time video.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
