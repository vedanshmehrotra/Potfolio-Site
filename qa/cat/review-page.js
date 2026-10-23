import {mountCat} from './cat-preview.js';
const $=selector=>document.querySelector(selector),iframe=$('#review-studio'),closeup=$('#closeup');
const context=$('#detail').getContext('2d');context.imageSmoothingEnabled=false;
let api,doc,mountedDoc,raf=0,lastStatus='';
function update(state) {
  const value=`${state.reducedMotion?'Reduced motion: original resting cat':state.paused?'Paused for inspection':state.phase==='idle'?'Original resting / breathing cat':state.phase==='notice'?'Noticing the lamp':'Petting reaction'} · 8 FPS`;
  if(value!==lastStatus){$('#status').textContent=value;lastStatus=value;}
  $('#notice').disabled=$('#pet').disabled=state.reducedMotion || state.paused || state.phase!=='idle';
  $('#pause').textContent=state.paused?'Resume':'Pause';$('#pause').setAttribute('aria-pressed',String(state.paused));
  $('#scrub').value=state.frame;$('#pose').textContent=state.frame;
}
function draw() {
  if(api && !closeup.hidden) {
    const frozen=doc.querySelector('#frozen-room'),background=frozen.hidden?doc.querySelector('.room-video.is-active'):frozen;
    context.clearRect(0,0,210,110);
    if(background && (background.tagName==='CANVAS' || background.readyState>=2))context.drawImage(background,1160,390,210,110,0,0,210,110);
    if(api.inspect().visible)context.drawImage(api.canvas,20,20);
  }
  raf=requestAnimationFrame(draw);
}
async function init() {
  doc=iframe.contentDocument;if(!doc.querySelector('#app') || mountedDoc===doc)return;mountedDoc=doc;
  try {
    await new Promise((resolve,reject)=>{
      const start=performance.now();
      const check=()=>{if(doc.querySelector('#app').dataset.ready==='true')resolve();else if(performance.now()-start>15000)reject(new Error('Studio did not finish loading.'));else setTimeout(check,30);};check();
    });
    api=await mountCat(doc,update);window.catReview=api;window.catReviewStudio=doc;
    document.querySelectorAll('nav button').forEach(button=>button.disabled=false);update(api.inspect());if(!raf)draw();
  } catch(error){$('#load-error').hidden=false;$('#load-error').textContent=error.message;}
}
$('#notice').addEventListener('click',()=>api?.trigger('notice'));
$('#pet').addEventListener('click',()=>doc?.querySelector('#cat-hotspot').click());
$('#lamp').addEventListener('click',()=>doc?.querySelector('#lamp-hotspot').click());
$('#pause').addEventListener('click',()=>api?.pause(!api.inspect().paused));
$('#show-closeup').addEventListener('click',()=>{closeup.hidden=!closeup.hidden;$('#show-closeup').setAttribute('aria-expanded',String(!closeup.hidden));});
$('#compare').addEventListener('click',()=>{const visible=!api.inspect().visible;api.show(visible);$('#compare').textContent=visible?'Original cat':'Show reaction';$('#compare').setAttribute('aria-pressed',String(!visible));});
$('#scrub').addEventListener('input',event=>api?.pose($('#sequence').value,Number(event.target.value)));
$('#sequence').addEventListener('change',()=>api?.pose($('#sequence').value,Number($('#scrub').value)));
iframe.addEventListener('load',init);
iframe.src=new URLSearchParams(location.search).get('reference')==='1'?'../?qa=1&reference=1':'../?qa=1';
addEventListener('pagehide',event=>{if(!event.persisted){api?.dispose();cancelAnimationFrame(raf);}});
