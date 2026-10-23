// Approved localized reaction: animated eye/face pixels within the existing cat.
// Body, paws, tail, window and resting/breathing pixels stay in the original video.
const BOX=Object.freeze({x:1180,y:410,width:80,height:68});
const STEP=125;
const NOTICE=[[0,0,0],[0,0,1],[1,.25,1],[2,.5,0],[2,1,0],[2,1,0],[2,1,.5],[2,1,0],
  [1,1,0],[0,.75,0],[0,.75,0],[1,.5,0],[2,.5,0],[2,.5,0],[1,.25,0],[1,.25,0],
  [0,.25,0],[0,.25,0],[0,0,0],[0,0,0]];
const PET=[[0,0,0],[1,.25,0],[1,.5,.5],[0,.75,.5],[0,1,0],[0,1,0],[0,.75,0],[0,.5,0],
  [1,.25,0],[1,.5,0],[0,.75,.5],[0,1,.5],[0,1,0],[0,.75,0],[0,.5,0],[0,.25,0],
  [0,0,0],[0,0,0],[0,0,0],[0,0,0]];
const sequences={notice:NOTICE,pet:PET};
const load=src=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Cat expression source could not load.'));image.src=new URL(src,import.meta.url);});
const eyeMask=(x,y)=>((x>=10 && x<=28 && y>=39 && y<=48) || (x>=39 && x<=66 && y>=38 && y<=49));
const ellipse=(x,y,cx,cy,rx,ry)=>Math.max(0,1-((x-cx)/rx)**2-((y-cy)/ry)**2);

export async function mountCat(doc,onChange=null,{diagnostics=false,pausedInitially=false}={}) {
  const win=doc.defaultView,app=doc.querySelector('#app'),reduced=win.matchMedia('(prefers-reduced-motion: reduce)');
  const [expression,reference]=await Promise.all([load('./assets/cat/sleepy-eyes-v1.png'),load('./assets/cat/face-source.png')]);
  const surface=doc.createElement('canvas');surface.width=80;surface.height=68;
  const ctx=surface.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingEnabled=false;
  ctx.drawImage(expression,0,0,80,68);const eyes=ctx.getImageData(0,0,80,68).data;
  ctx.clearRect(0,0,80,68);ctx.drawImage(reference,0,0);const lit=ctx.getImageData(0,0,80,68).data;
  const canvas=doc.createElement('canvas');canvas.id='studio-cat-reaction';canvas.width=80;canvas.height=68;canvas.setAttribute('aria-hidden','true');
  Object.assign(canvas.style,{position:'absolute',left:'1180px',top:'410px',width:'80px',height:'68px',zIndex:2,imageRendering:'pixelated',pointerEvents:'none'});
  doc.querySelector('#world').append(canvas);const out=canvas.getContext('2d',{willReadFrequently:true});
  let phase='idle',frame=0,paused=pausedInitially,visible=true,disposed=false,next=performance.now()+STEP,lastPaint=0,lastPet=-Infinity,raf;
  const history=[],subscribers=new Set();
  const inspect=()=>({ready:true,phase,frame,paused,visible,reducedMotion:reduced.matches,fps:8,box:BOX,frameCount:20,history:history.slice()});
  const blocked=()=>paused || reduced.matches || document.hidden || doc.hidden || app.dataset.state!=='room';
  function paint(record=false) {
    lastPaint=performance.now();
    out.clearRect(0,0,80,68);
    if(phase!=='idle') {
      const [opening,lean,ear]=sequences[phase][frame];
      const frozen=doc.querySelector('#frozen-room'),background=frozen.hidden?doc.querySelector('.room-video.is-active'):frozen;
      if((opening || lean || ear) && background && (background.tagName==='CANVAS' || background.readyState>=2)) {
        ctx.clearRect(0,0,80,68);ctx.drawImage(background,BOX.x,BOX.y,80,68,0,0,80,68);
        const original=ctx.getImageData(0,0,80,68),base=new Uint8ClampedArray(original.data);
        const current=[0,0,0],expected=[0,0,0];
        // White cheek fur estimates actual video lighting, including the lamp clip.
        for(let y=51;y<=55;y++)for(let x=22;x<=27;x++) {
          const i=(y*80+x)*4;for(let c=0;c<3;c++){current[c]+=base[i+c];expected[c]+=lit[i+c];}
        }
        const gain=current.map((value,c)=>Math.max(.15,Math.min(1.45,value/Math.max(1,expected[c]))));
        if(opening)for(let y=0;y<68;y++)for(let x=0;x<80;x++) {
          if(!eyeMask(x,y) || Math.abs(y-44)>opening+1)continue;
          const i=(y*80+x)*4;for(let c=0;c<3;c++)base[i+c]=Math.min(255,Math.round(eyes[i+c]*gain[c]));
        }
        const pixels=out.createImageData(80,68);
        for(let y=0;y<68;y++)for(let x=0;x<80;x++) {
          const face=y>=29 && y<=57?ellipse(x,y,35,44,32,18):0;
          const ears=Math.max(ellipse(x,y,12,28,4,6),ellipse(x,y,59,22,5,8));
          if(!face && !ears && !(opening && eyeMask(x,y)))continue;
          const weight=face*face,earWeight=ears*ears;
          const dx=phase==='notice'?-lean*1.4*weight:lean*.7*weight;
          const dy=-lean*(phase==='pet'?1.6:.8)*weight-ear*earWeight;
          const sx=Math.max(0,Math.min(79,Math.round(x-dx))),sy=Math.max(0,Math.min(67,Math.round(y-dy)));
          const i=(y*80+x)*4,s=(sy*80+sx)*4;
          pixels.data[i]=base[s];pixels.data[i+1]=base[s+1];pixels.data[i+2]=base[s+2];pixels.data[i+3]=255;
        }
        out.putImageData(pixels,0,0);
      }
    }
    if(record && diagnostics){history.push({time:performance.now(),phase,frame});if(history.length>300)history.shift();}
    if(onChange || subscribers.size){const state=inspect();onChange?.(state);subscribers.forEach(fn=>fn(state));}
  }
  function trigger(nextPhase) {
    if(!sequences[nextPhase] || blocked() || phase!=='idle')return false;
    if(nextPhase==='pet'){if(performance.now()-lastPet<3200)return false;lastPet=performance.now();}
    phase=nextPhase;frame=0;next=performance.now()+STEP;paint(true);return true;
  }
  function tick(now) {
    if(disposed)return;
    if(blocked())next=now+STEP;
    else if(now>=next && phase!=='idle') {
      next=now-next>=STEP?now+STEP:next+STEP;frame++;
      if(frame>=20){phase='idle';frame=0;}
      paint(true);
    } else if(phase==='idle')next=now+STEP;
    if(phase!=='idle' && paused && !document.hidden && !doc.hidden && app.dataset.state==='room' && now-lastPaint>=STEP)paint();
    raf=requestAnimationFrame(tick);
  }
  const pet=()=>trigger('pet'),hotspot=doc.querySelector('#cat-hotspot');hotspot.addEventListener('click',pet);
  let lastLamp=app.dataset.lamp;
  const observer=new MutationObserver(()=>{
    const lamp=app.dataset.lamp;
    if(lamp!==lastLamp){if(lamp==='lighting' || (lamp==='lit' && lastLamp==='dark') || lamp==='dark')trigger('notice');lastLamp=lamp;}
    if(phase!=='idle' && !reduced.matches)paint();
    // Sample the original room's current lighting on the next native pose tick.
  });observer.observe(app,{attributes:true,attributeFilter:['data-lamp']});
  const motionChange=()=>{phase='idle';frame=0;paint();};reduced.addEventListener('change',motionChange);
  paint();raf=requestAnimationFrame(tick);
  return {canvas,inspect,trigger,
    pause(value=true){paused=Boolean(value);next=performance.now()+STEP;paint();},
    pose(sequence,index){phase=sequence;frame=Math.max(0,Math.min(19,Math.trunc(index)));paused=true;paint(true);},
    reset(){phase='idle';frame=0;paint();},
    show(value=true){visible=Boolean(value);canvas.hidden=!visible;paint();},
    subscribe(fn){subscribers.add(fn);fn(inspect());return()=>subscribers.delete(fn);},
    dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();hotspot.removeEventListener('click',pet);reduced.removeEventListener('change',motionChange);subscribers.clear();canvas.remove();}
  };
}

const app=document.querySelector('#app');
if(app) {
  const local=['127.0.0.1','localhost'].includes(location.hostname),query=new URLSearchParams(location.search);
  const qa=local && query.has('qa');let started=false,instance;
  const start=async()=>{
    if(started || app.dataset.ready!=='true')return;
    started=true;observer.disconnect();
    try {
      instance=await mountCat(document,null,{diagnostics:qa,pausedInitially:local && query.get('reference')==='1'});
      app.dataset.cat='ready';if(qa)window.studioCat=instance;
    } catch(error){app.dataset.cat='unavailable';if(qa)window.studioCatError=error.message;}
  };
  const observer=new MutationObserver(start);observer.observe(app,{attributes:true,attributeFilter:['data-ready']});start();
  addEventListener('pagehide',event=>{if(!event.persisted){observer.disconnect();instance?.dispose();}});
}
