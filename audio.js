(() => {
  'use strict';
  const toggle=document.querySelector('#sound-toggle'), settingsButton=document.querySelector('#sound-settings-toggle');
  const settings=document.querySelector('#sound-settings'), status=document.querySelector('#sound-status');
  const sliders={ambience:document.querySelector('#ambience-volume'),effects:document.querySelector('#effects-volume')};
  const AudioEngine=window.AudioContext || window.webkitAudioContext;
  let context,master,ambienceGain,effectsGain,analyser,noise,ambient=null,enabled=true,epoch=0,queuedPurr=null;
  let volumes={ambience:35,effects:45};
  try {const saved=JSON.parse(localStorage.getItem('studio-volumes'));for(const key of Object.keys(volumes))if(Number.isFinite(saved?.[key]))volumes[key]=Math.max(0,Math.min(100,saved[key]));} catch {}
  try {if(localStorage.getItem('studio-sound-enabled')==='false')enabled=false;}catch{}
  const buffers={},pending={},recordingLevels={},voices=new Set(),lastPlayed=new Map(),events=[],errors=new Set();
  const qa=['127.0.0.1','localhost'].includes(location.hostname) && new URLSearchParams(location.search).has('qa');
  const assets={rain:'./assets/audio/indoor-rain.mp3',purr:'./assets/audio/cat-purr.wav'};
  function announce(text) {status.textContent=text;}
  function update() {
    toggle.setAttribute('aria-pressed',String(enabled));toggle.innerHTML=`<span aria-hidden="true">${enabled?'♪':'♪×'}</span><span class="sound-label"> SOUND ${enabled?'ON':'OFF'}</span>`;
    toggle.setAttribute('aria-label',enabled?'Mute studio sound':'Enable studio sound');
    document.documentElement.dataset.sound=enabled?'on':'off';
    for(const [key,input] of Object.entries(sliders)) {input.value=volumes[key];document.querySelector(`#${key}-value`).value=volumes[key];}
    if(context) {
      ambienceGain.gain.setTargetAtTime(volumes.ambience/100,context.currentTime,.04);
      effectsGain.gain.setTargetAtTime(volumes.effects/100*.8,context.currentTime,.02);
    }
  }
  function createContext() {
    if(context)return;
    context=new AudioEngine();master=context.createGain();master.gain.value=.9;
    ambienceGain=context.createGain();effectsGain=context.createGain();analyser=context.createAnalyser();analyser.fftSize=2048;
    // A gentle bounded ceiling protects combined rain/effects at full volume.
    // It is linear below .6, so ordinary playback keeps its original texture.
    const limiter=context.createWaveShaper(),curve=new Float32Array(4097);
    for(let i=0;i<curve.length;i++) {
      const x=i/(curve.length-1)*2-1,a=Math.abs(x);
      curve[i]=Math.sign(x)*(a<=.6?a:.6+.3*(1-Math.exp(-(a-.6)/.3)));
    }
    limiter.curve=curve;limiter.oversample='2x';
    ambienceGain.connect(master);effectsGain.connect(master);master.connect(limiter);limiter.connect(analyser);analyser.connect(context.destination);
    noise=context.createBuffer(1,context.sampleRate,context.sampleRate);
    const samples=noise.getChannelData(0);let seed=1701;
    for(let i=0;i<samples.length;i++) {seed=(seed*1664525+1013904223)>>>0;samples[i]=seed/2147483648-1;}
    update();
  }
  // Crossfade the recording tail into its head, retaining natural rain texture.
  function rainLoop(buffer) {
    const overlap=Math.floor(buffer.sampleRate*.65),length=buffer.length-overlap;
    const loop=context.createBuffer(buffer.numberOfChannels,length,buffer.sampleRate);
    for(let channel=0;channel<buffer.numberOfChannels;channel++) {
      const from=buffer.getChannelData(channel),to=loop.getChannelData(channel);
      to.set(from.subarray(overlap));
      for(let i=0;i<overlap;i++) {
        const phase=i/overlap*Math.PI/2,index=length-overlap+i;
        to[index]=from[buffer.length-overlap+i]*Math.cos(phase)+from[i]*Math.sin(phase);
      }
    }
    return loop;
  }
  async function prepareRecording(name,decoded) {
    const duration=name==='purr'?Math.min(2.2,decoded.duration):decoded.duration;
    const length=Math.floor(duration*decoded.sampleRate);
    const RenderEngine=window.OfflineAudioContext || window.webkitOfflineAudioContext;
    let prepared;
    if(RenderEngine) {
      const render=new RenderEngine(decoded.numberOfChannels,length,decoded.sampleRate);
      const source=render.createBufferSource(),high=render.createBiquadFilter(),low=render.createBiquadFilter();
      source.buffer=decoded;high.type='highpass';high.frequency.value=name==='purr'?150:100;high.Q.value=.707;
      low.type='lowpass';low.frequency.value=name==='purr'?2400:1700;low.Q.value=.707;
      source.connect(high);high.connect(low);low.connect(render.destination);source.start();
      prepared=await render.startRendering();
    } else {
      prepared=context.createBuffer(decoded.numberOfChannels,length,decoded.sampleRate);
      for(let channel=0;channel<decoded.numberOfChannels;channel++)prepared.copyToChannel(decoded.getChannelData(channel).subarray(0,length),channel);
    }
    if(name==='rain')prepared=rainLoop(prepared);
    let energy=0,peak=0;
    for(let channel=0;channel<prepared.numberOfChannels;channel++)for(const sample of prepared.getChannelData(channel)) {energy+=sample*sample;peak=Math.max(peak,Math.abs(sample));}
    const rms=Math.sqrt(energy/(prepared.length*prepared.numberOfChannels));
    const gain=peak>0?Math.min((name==='rain'?.14:.18)/Math.max(rms,.00001),(name==='rain'?.7:.75)/peak):1;
    for(let channel=0;channel<prepared.numberOfChannels;channel++) {
      const samples=prepared.getChannelData(channel);for(let i=0;i<samples.length;i++)samples[i]*=gain;
    }
    recordingLevels[name]={rms:rms*gain,peak:peak*gain,gain,filtered:!!RenderEngine};
    return prepared;
  }
  async function load(name) {
    if(buffers[name])return buffers[name];
    if(!pending[name])pending[name]=(async()=> {
      const response=await fetch(assets[name],{signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('Audio unavailable');
      const decoded=await context.decodeAudioData(await response.arrayBuffer());
      buffers[name]=await prepareRecording(name,decoded);errors.delete(name);return buffers[name];
    })().catch(()=>{errors.add(name);return null;}).finally(()=>{delete pending[name];});
    return pending[name];
  }
  function track(source,nodes,name) {
    const voice={source,nodes,name};voices.add(voice);
    source.onended=()=> {voices.delete(voice);source.disconnect();nodes.forEach(node=>node.disconnect());};
    return source;
  }
  function stopMotion() {
    for(const voice of voices)if(voice.name==='rush' || voice.name==='return') {try{voice.source.stop();}catch{}}
  }
  function stopAll() {
    if(ambient) {try{ambient.source.stop();}catch{}ambient.nodes.forEach(node=>node.disconnect());ambient=null;}
    for(const voice of voices) {try{voice.source.stop();}catch{}voice.source.disconnect();voice.nodes.forEach(node=>node.disconnect());}
    voices.clear();
  }
  function startRain() {
    if(!enabled || document.hidden || context?.state!=='running' || !buffers.rain || ambient)return;
    const source=context.createBufferSource(),fade=context.createGain();
    source.buffer=buffers.rain;source.loop=true;
    fade.gain.setValueAtTime(0,context.currentTime);fade.gain.linearRampToValueAtTime(1,context.currentTime+.6);
    source.connect(fade);fade.connect(ambienceGain);
    source.start();ambient={source,nodes:[source,fade]};
  }
  async function setEnabled(value,remember=true) {
    enabled=value;const token=++epoch;update();
    if(remember)try{localStorage.setItem('studio-sound-enabled',String(value));}catch{}
    if(!enabled) {queuedPurr=null;stopAll();await context?.suspend().catch(()=>{});announce('Sound muted.');return;}
    try {
      createContext();await context.resume();
      if(!enabled || token!==epoch)return;
      announce('Loading indoor rain and cat purr…');
      await Promise.all([load('rain'),load('purr')]);
      if(!enabled || token!==epoch)return;
      startRain();announce(errors.size?'Some recordings are unavailable. Click sounds still work; toggle sound to retry.':'Indoor rain and object sounds enabled.');
    } catch {enabled=false;stopAll();update();announce('Sound could not start. Try enabling it again.');}
  }
  function burst(name,{duration=.07,frequency=1600,gain=.25,delay=0,type='bandpass',rise=.004}={}) {
    const now=context.currentTime+delay,source=context.createBufferSource(),filter=context.createBiquadFilter(),level=context.createGain();
    source.buffer=noise;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.6;
    level.gain.setValueAtTime(0,now);level.gain.linearRampToValueAtTime(gain,now+rise);level.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter);filter.connect(level);level.connect(effectsGain);track(source,[filter,level],name);
    source.start(now);source.stop(now+duration+.01);
  }
  function tone(name,frequency,duration=.08,gain=.08,delay=0) {
    const now=context.currentTime+delay,source=context.createOscillator(),level=context.createGain();
    source.type='sine';source.frequency.value=frequency;
    level.gain.setValueAtTime(0,now);level.gain.linearRampToValueAtTime(gain,now+.006);level.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(level);level.connect(effectsGain);track(source,[level],name);source.start(now);source.stop(now+duration+.01);
  }
  function play(name) {
    if(!enabled || document.hidden || volumes.effects===0)return false;
    // The first gesture may itself be a pet, before the local purr has decoded.
    // Keep one short-lived cue; muting/navigation-to-hidden cancels playback.
    if(name==='purr' && context && (!buffers.purr || context.state!=='running')) {
      if(!queuedPurr) {
        const cue={epoch,time:performance.now()};queuedPurr=cue;
        Promise.all([load('purr'),context.resume()]).then(([buffer])=>{
          if(queuedPurr!==cue)return;queuedPurr=null;
          if(buffer && enabled && epoch===cue.epoch && performance.now()-cue.time<1500)play('purr');
        }).catch(()=>{if(queuedPurr===cue)queuedPurr=null;});
      }
      return false;
    }
    if(context?.state!=='running')return false;
    const time=performance.now(),gap=name==='purr'?3200:70;
    if(time-(lastPlayed.get(name)??-Infinity)<gap || voices.size>14)return false;
    if(name==='purr' && (!buffers.purr || [...voices].some(voice=>voice.name==='purr')))return false;
    const known=['click','key','lamp','crt','paper','shuffle','page','book','phone','sent','purr','rush','return'];
    if(!known.includes(name))return false;
    lastPlayed.set(name,time);
    if(qa){events.push({name,time});if(events.length>100)events.shift();}
    if(name==='purr') {
      const source=context.createBufferSource(),level=context.createGain(),now=context.currentTime,duration=Math.min(2.2,buffers.purr.duration);
      source.buffer=buffers.purr;level.gain.setValueAtTime(0,now);level.gain.linearRampToValueAtTime(1,now+.1);level.gain.setValueAtTime(1,now+duration-.25);level.gain.linearRampToValueAtTime(0,now+duration);
      source.connect(level);level.connect(effectsGain);track(source,[level],name);source.start();source.stop(now+duration);
    } else if(['page','shuffle','book'].includes(name)) {
      burst(name,{duration:.24,frequency:1900,gain:.17,rise:.045});burst(name,{duration:.16,frequency:3200,gain:.12,delay:.10,rise:.03});
      if(name==='book')burst(name,{duration:.09,frequency:320,gain:.28});
    } else if(['rush','return'].includes(name)) {
      burst(name,{duration:name==='rush'?.32:.18,frequency:1100,gain:name==='rush'?.6:.3,rise:.06,delay:.05});
    } else if(name==='sent') {tone(name,660,.12,.09);tone(name,880,.16,.07,.11);}
    else if(name==='crt') {burst(name,{duration:.08,frequency:800,gain:.32});tone(name,390,.09,.06,.025);}
    else if(name==='lamp') {burst(name,{duration:.045,frequency:2000,gain:.34});burst(name,{duration:.035,frequency:600,gain:.25,delay:.025});}
    else if(name==='paper')burst(name,{duration:.09,frequency:1700,gain:.2});
    else if(name==='phone') {burst(name,{duration:.04,frequency:1300,gain:.22});tone(name,540,.06,.035);}
    else burst(name,{duration:name==='key'?.035:.055,frequency:name==='key'?2100:1400,gain:name==='key'?.18:.28});
    return true;
  }
  toggle.addEventListener('click',()=>setEnabled(!enabled));
  function unlockOnInteraction(event) {
    if(!event.isTrusted || !enabled || document.hidden || context?.state==='running' || event.target.closest?.('#sound-toggle'))return;
    if(event.type==='keydown' && ['Tab','Shift','Control','Alt','Meta','Escape'].includes(event.key))return;
    setEnabled(true,false);
  }
  // Keep default-on compatible with autoplay restrictions; no fake user gesture.
  document.addEventListener('pointerdown',unlockOnInteraction,{capture:true,passive:true});
  document.addEventListener('keydown',unlockOnInteraction,{capture:true});
  settingsButton.addEventListener('click',()=> {
    settings.hidden=!settings.hidden;settingsButton.setAttribute('aria-expanded',String(!settings.hidden));
  });
  document.addEventListener('keydown',event=> {
    if(event.key==='Escape' && !settings.hidden) {event.preventDefault();event.stopImmediatePropagation();settings.hidden=true;settingsButton.setAttribute('aria-expanded','false');settingsButton.focus();}
  });
  document.addEventListener('pointerdown',event=> {if(!event.target.closest('.sound-controls')){settings.hidden=true;settingsButton.setAttribute('aria-expanded','false');}},{passive:true});
  for(const [key,input] of Object.entries(sliders))input.addEventListener('input',()=> {
    volumes[key]=Number(input.value);update();try{localStorage.setItem('studio-volumes',JSON.stringify(volumes));}catch{}
  });
  document.addEventListener('visibilitychange',async()=> {
    if(!context)return;
    if(document.hidden){queuedPurr=null;stopAll();await context.suspend().catch(()=>{});}
    else if(enabled) {try{await context.resume();startRain();}catch{announce('Sound paused. Toggle sound to resume.');}}
  });
  addEventListener('pagehide',()=>{queuedPurr=null;stopAll();context?.suspend().catch(()=>{});});
  addEventListener('pageshow',async()=>{if(enabled && !document.hidden && context){await context.resume().catch(()=>{});startRain();}});
  window.studioAudio={play,stopMotion};
  if(qa)window.studioAudio.inspect=()=> {
    let rms=0,peak=0;if(analyser){const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);rms=Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);peak=Math.max(...data.map(Math.abs));}
    return {enabled,state:context?.state || 'uncreated',rain:!!ambient,voices:[...voices].map(voice=>voice.name),loaded:Object.keys(buffers),errors:[...errors],volumes:{...volumes},events:[...events],recordings:{...recordingLevels},rms,peak};
  };
  update();
  announce(enabled?'Sound is on. Playback starts with your first click or keypress.':'Sound muted.');
  if(!AudioEngine){enabled=false;update();toggle.disabled=true;toggle.textContent='SOUND UNAVAILABLE';announce('This browser does not support studio audio.');}
})();
