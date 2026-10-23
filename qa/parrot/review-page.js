import {mountParrot} from './parrot-preview.js';

const $=selector=>document.querySelector(selector);
const iframe=$('#review-studio'),closeup=$('#closeup'),detail=$('#detail');
const context=detail.getContext('2d');context.imageSmoothingEnabled=false;
let api,doc,mountedDoc,lastPhase='',detailRaf=0;

function update(state) {
  const motion=state.reducedMotion?'Reduced motion: resting pose':state.paused?'Paused for inspection':state.phase==='preen'?'Preening':'Breathing / resting';
  const next=`${motion} · ${state.fps} FPS · Lamp ${state.lamp}`;
  if(next!==lastPhase){$('#status').textContent=next;lastPhase=next;}
  $('#pause').setAttribute('aria-pressed',String(state.paused));$('#pause').textContent=state.paused?'Resume':'Pause';
  $('#preen').disabled=state.reducedMotion || state.paused || state.phase==='preen' || state.roomState!=='room';
  $('#scrub').value=state.frame;$('#pose').textContent=state.frame;
}
function drawDetail() {
  if(!closeup.hidden && api) {
    const frozen=doc.querySelector('#frozen-room');
    const background=frozen.hidden?doc.querySelector('.room-video.is-active'):frozen;
    context.clearRect(0,0,142,100);
    if(background && (background.tagName==='CANVAS' || background.readyState>=2))context.drawImage(background,560,232,142,100,0,0,142,100);
    if(api.inspect().visible)context.drawImage(api.canvas,20,7);
  }
  detailRaf=requestAnimationFrame(drawDetail);
}
async function init() {
  doc=iframe.contentDocument;
  if(!doc.querySelector('#app'))return;
  if(mountedDoc===doc)return;
  mountedDoc=doc;
  const ready=()=>new Promise((resolve,reject)=>{
    if(doc.querySelector('#app').dataset.ready==='true')return resolve();
    const timeout=setTimeout(()=>{observer.disconnect();reject(new Error('The studio did not finish loading.'));},15000);
    const observer=new MutationObserver(()=>{if(doc.querySelector('#app').dataset.ready==='true'){observer.disconnect();clearTimeout(timeout);resolve();}});
    observer.observe(doc.querySelector('#app'),{attributes:true,attributeFilter:['data-ready']});
  });
  try {
    await ready();api?.dispose();api=await mountParrot(doc,update);
    document.querySelectorAll('nav button').forEach(button=>button.disabled=false);update(api.inspect());
    window.parrotReview=api;
    // Read-only hooks and deliberate frame scrubbing exist on this review page only.
    window.parrotReviewStudio=doc;
    doc.querySelector('#app').addEventListener('transitionend',()=>update(api.inspect()));
    new MutationObserver(()=>update(api.inspect())).observe(doc.querySelector('#app'),{attributes:true,attributeFilter:['data-state','data-lamp']});
    if(!detailRaf)drawDetail();
  } catch(error) {
    $('#load-error').hidden=false;$('#load-error').textContent=error.message;
    $('#status').textContent='Prototype could not load.';
  }
}
$('#preen').addEventListener('click',()=>api?.preen());
$('#pause').addEventListener('click',()=>api?.pause(!api.inspect().paused));
$('#lamp').addEventListener('click',()=>doc?.querySelector('#lamp-hotspot').click());
$('#show-closeup').addEventListener('click',()=>{closeup.hidden=!closeup.hidden;$('#show-closeup').setAttribute('aria-expanded',String(!closeup.hidden));});
$('#compare').addEventListener('click',()=>{const visible=!api.inspect().visible;api.show(visible);$('#compare').setAttribute('aria-pressed',String(!visible));$('#compare').textContent=visible?'Hide parrot':'Show parrot';});
$('#scrub').addEventListener('input',event=>api?.frame(Number(event.target.value)));
iframe.addEventListener('load',init);
iframe.src=new URLSearchParams(location.search).get('reference')==='1'?'../?qa=1&reference=1':'../?qa=1';
addEventListener('pagehide',event=>{if(!event.persisted){api?.dispose();cancelAnimationFrame(detailRaf);}});
