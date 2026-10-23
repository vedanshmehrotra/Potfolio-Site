// Approved parrot, rendered in the same native coordinate world as the room.
const ATLAS = new URL('./assets/parrot/parrot-atlas-v1.png', import.meta.url);
const REGISTRATION = new URL('./assets/parrot/atlas-registration.json', import.meta.url);
const FPS = 8, STEP = 1000 / FPS;
const BOX = Object.freeze({x:580,y:239,width:96,height:96});
const ANCHOR = Object.freeze({x:630,y:317});
const SCALE = .25;
// Repeated contact poses give preening time to read without speeding up the bird.
const PREEN = [0,0,4,4,5,6,7,8,9,10,11,10,9,8,7,6,5,4,12,13,14,15,0,0];

export async function mountParrot(doc, onChange = () => {}, {diagnostics=false,pausedInitially=false} = {}) {
  const win = doc.defaultView, app = doc.querySelector('#app');
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const [registration, image] = await Promise.all([
    fetch(REGISTRATION).then(response => {
      if (!response.ok) throw new Error('Parrot registration could not load.');
      return response.json();
    }),
    new Promise((resolve,reject) => {
      const asset = new Image();
      asset.onload = () => resolve(asset);
      asset.onerror = () => reject(new Error('Parrot sprite sheet could not load.'));
      asset.src = ATLAS;
    })
  ]);
  const frames = registration.frames.map(frame => {
    const canvas = doc.createElement('canvas'); canvas.width=BOX.width;canvas.height=BOX.height;
    const context = canvas.getContext('2d',{willReadFrequently:true});
    context.imageSmoothingEnabled = false;
    const [sx,sy,sw,sh] = frame.rect;
    const x = Math.round(ANCHOR.x-BOX.x-frame.anchor[0]*SCALE);
    const y = Math.round(ANCHOR.y-BOX.y-frame.anchor[1]*SCALE);
    context.drawImage(image,sx,sy,sw,sh,x,y,sw*SCALE,sh*SCALE);
    // Hard alpha at the native room grid avoids the generated atlas's faint fringe.
    const pixels = context.getImageData(0,0,BOX.width,BOX.height);
    for(let i=3;i<pixels.data.length;i+=4)pixels.data[i]=pixels.data[i]>=192?255:0;
    context.putImageData(pixels,0,0);
    return canvas;
  });
  const canvas = doc.createElement('canvas');canvas.id='studio-parrot';
  canvas.width=BOX.width;canvas.height=BOX.height;
  canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',left:`${BOX.x}px`,top:`${BOX.y}px`,
    width:`${BOX.width}px`,height:`${BOX.height}px`,zIndex:2,pointerEvents:'none',imageRendering:'pixelated'});
  doc.querySelector('#world').append(canvas);
  const context = canvas.getContext('2d',{willReadFrequently:true});
  context.imageSmoothingEnabled=false;
  let index=0,phase='idle',idleTick=0,preenTick=0,paused=pausedInitially,visible=true,disposed=false;
  let nextTick=performance.now()+STEP,lastLight=-1,raf=0;
  const history=[],subscribers=new Set();

  function lighting() {
    if(app.dataset.lamp==='lit')return 1;
    if(app.dataset.lamp==='lighting') {
      const video=doc.querySelector('#lighting-video');
      return .38+.62*Math.min(1,(video.currentTime||0)/(video.duration||2));
    }
    return .38;
  }
  function inspect() {
    return {ready:true,fps:FPS,stepMs:STEP,frame:index,phase,paused,visible,
      reducedMotion:reduced.matches,lamp:app.dataset.lamp,light:lastLight,
      roomState:app.dataset.state,box:BOX,anchor:ANCHOR,frameCount:frames.length,
      sequenceLength:PREEN.length,history:history.slice()};
  }
  function paint(record=false) {
    const light=lighting();lastLight=light;
    context.clearRect(0,0,BOX.width,BOX.height);
    context.filter=light===1?'none':`brightness(${light}) saturate(.78)`;
    context.drawImage(frames[index],0,0);context.filter='none';
    if(light<1) {
      context.globalCompositeOperation='source-atop';
      context.fillStyle=`rgba(20,49,84,${(1-light)*.16})`;
      context.fillRect(0,0,BOX.width,BOX.height);context.globalCompositeOperation='source-over';
    }
    if(record && diagnostics) {
      history.push({time:performance.now(),frame:index,phase});
      if(history.length>400)history.shift();
    }
    if(subscribers.size || onChange!==null){const state=inspect();onChange?.(state);subscribers.forEach(fn=>fn(state));}
  }
  function blocked() {
    return paused || reduced.matches || doc.hidden || document.hidden || app.dataset.state!=='room';
  }
  function preen() {
    if(blocked() || phase==='preen')return false;
    phase='preen';preenTick=0;index=PREEN[0];nextTick=performance.now()+STEP;paint(true);return true;
  }
  function tick(now) {
    if(disposed)return;
    if(blocked())nextTick=now+STEP;
    else if(now>=nextTick) {
      // No catch-up burst after a slow/hidden frame: only one pose per 125 ms.
      nextTick=now-nextTick>=STEP?now+STEP:nextTick+STEP;
      if(phase==='preen') {
        preenTick++;
        if(preenTick>=PREEN.length){phase='idle';idleTick=0;index=0;}
        else index=PREEN[preenTick];
      } else {
        idleTick++;
        const breath=idleTick%32;
        index=breath>=9 && breath<=18?1:breath===28?2:0;
        if(idleTick>=112){phase='preen';preenTick=0;index=0;}
      }
      paint(true);
    }
    const light=lighting();
    // Always settle exactly at dark/lit even while pose playback is paused.
    if(light!==lastLight && (light===.38 || light===1 || Math.abs(light-lastLight)>.015))paint();
    raf=requestAnimationFrame(tick);
  }
  function motionChange() {
    index=0;phase='idle';idleTick=0;preenTick=0;nextTick=performance.now()+STEP;paint();
  }
  reduced.addEventListener('change',motionChange);
  paint(true);raf=requestAnimationFrame(tick);
  return {
    canvas,inspect,preen,
    pause(value=true){paused=Boolean(value);nextTick=performance.now()+STEP;paint();},
    show(value=true){visible=Boolean(value);canvas.hidden=!visible;paint();},
    frame(value){paused=true;index=Math.max(0,Math.min(15,Math.trunc(value)));paint(true);},
    subscribe(fn){subscribers.add(fn);fn(inspect());return()=>subscribers.delete(fn);},
    dispose(){disposed=true;cancelAnimationFrame(raf);reduced.removeEventListener('change',motionChange);subscribers.clear();canvas.remove();}
  };
}

const app=document.querySelector('#app');
if(app) {
  const local=['127.0.0.1','localhost'].includes(location.hostname);
  const query=new URLSearchParams(location.search),qa=local && query.has('qa');
  let started=false,instance;
  const start=async()=>{
    if(started || app.dataset.ready!=='true')return;
    started=true;observer.disconnect();
    try {
      instance=await mountParrot(document,null,{diagnostics:qa,pausedInitially:local && query.get('reference')==='1'});
      app.dataset.parrot='ready';
      if(qa)window.studioParrot=instance;
    } catch(error) {
      app.dataset.parrot='unavailable';
      if(qa)window.studioParrotError=error.message;
    }
  };
  const observer=new MutationObserver(start);
  observer.observe(app,{attributes:true,attributeFilter:['data-ready']});start();
  addEventListener('pagehide',event=>{if(!event.persisted){observer.disconnect();instance?.dispose();}});
}
