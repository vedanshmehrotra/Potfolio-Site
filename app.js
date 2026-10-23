(() => {
  'use strict';
  const SOURCE = { width: 1672, height: 942 };
  const SCREEN = { x: 544, y: 322, width: 568, height: 268 };
  const ABOUT_SCREEN = { x: 1165, y: 493, width: 132, height: 108 };
  const ABOUT_LAYOUT = { width: 528, height: 432 };
  const $ = (selector) => document.querySelector(selector);
  const app = $('#app'), world = $('#world'), scene = $('#scene-viewport');
  const miniature = $('#monitor-live'), panel = $('#projects-panel'), stage = $('#expanded-stage');
  const detail = $('#project-detail'), monitorButton = $('#monitor-hotspot'), lampButton = $('#lamp-hotspot'), catButton = $('#cat-hotspot');
  const mobileButton = $('#mobile-projects'), mobileAccess = $('#mobile-access');
  const aboutButton = $('#about-hotspot'), mobileAbout = $('#mobile-about');
  const aboutMiniature = $('#about-live'), aboutPanel = $('#about-panel'), aboutStage = $('#about-stage');
  const objectPanel = $('#object-panel'), sections = window.studioSections;
  const objectViews = Object.keys(sections.targets), views = ['projects','about',...objectViews];
  const panels = [panel,aboutPanel,objectPanel];
  const returnControls = {};
  const sectionButton = name => $(`#${name==='projects'?'monitor':name}-hotspot`);
  const sectionShortcut = name => $(`#mobile-${name}`);
  const hitRegions = {
    monitor:{...SCREEN,hitPolygon:[[2,2],[566,2],[566,266],[2,266]]},
    about:{...ABOUT_SCREEN,hitPolygon:[[3,2],[129,2],[130,106],[2,106]]},
    lamp:{x:390,y:336,width:128,height:132,outlinePath:'M25 14 C29 7 37 4 45 4 C56 4 63 10 64 20 L64 29 Q65 35 71 40 C91 52 112 70 121 88 Q124 94 118 99 C105 109 85 117 63 122 C43 127 20 127 10 122 Q5 119 8 112 C15 90 19 67 25 44 Q28 35 23 30 L23 21 Q23 17 25 14Z',hitPolygon:[[24,12],[28,7],[35,4],[45,3],[54,5],[60,9],[63,15],[64,27],[66,34],[71,40],[80,45],[91,52],[100,60],[109,69],[117,79],[122,88],[122,94],[119,100],[112,106],[101,112],[87,118],[71,123],[53,127],[34,128],[18,126],[8,123],[4,120],[4,115],[8,103],[12,90],[16,76],[19,63],[22,50],[24,40],[24,35],[21,31],[21,20]]},
    ...sections.targets,
    cat:{x:1180,y:416,width:156,height:60,hitPolygon:[[5,20],[5,8],[18,17],[38,10],[56,0],[83,5],[112,8],[136,18],[145,33],[144,49],[126,56],[40,58],[8,53],[0,44]]}
  };
  for (const [name,region] of Object.entries(hitRegions)) {
    const button=$(`#${name}-hotspot`),points=region.hitPolygon,box=region.hitBounds || region;
    const position={left:`${box.x}px`,top:`${box.y}px`,width:`${box.width}px`,height:`${box.height}px`};
    Object.assign(button.style,position);
    button.style.clipPath=`polygon(${points.map(([x,y])=>`${x/box.width*100}% ${y/box.height*100}%`).join(',')})`;
    // Keep the visible stroke outside the clipped button so its outer half is
    // not cut away. Both siblings remain in the same source-coordinate world.
    const contour=region.outlinePath?`<path class="hotspot-contour" d="${region.outlinePath}"/>`:`<polygon class="hotspot-contour" points="${points.map(point=>point.join(',')).join(' ')}"/>`;
    button.insertAdjacentHTML('afterend',`<svg id="${name}-outline" class="hotspot-shape" viewBox="0 0 ${box.width} ${box.height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${contour}${name==='lamp'?'<path class="lamp-focus-marker" d="M48 76h-7v7 M76 76h7v7"/>':''}</svg>`);
    Object.assign(button.nextElementSibling.style,position);
  }
  const videos = { dark: $('#dark-video'), lit: $('#lit-video'), lighting: $('#lighting-video') };
  const frozen = $('#frozen-room'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = () => innerWidth <= 700;
  const localDev = ['127.0.0.1', 'localhost'].includes(location.hostname);
  const qa = localDev && new URLSearchParams(location.search).has('qa');
  const calibrating = localDev && new URLSearchParams(location.search).has('calibrate');
  const cameraVariant = 'smooth';
  const referenceFrame = localDev && new URLSearchParams(location.search).get('reference') === '1';
  if (referenceFrame) { videos.dark.autoplay = false; videos.dark.pause(); }
  app.dataset.camera = cameraVariant;
  const esc = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = (value) => {
    if (!value) return '';
    try { const url = new URL(value, location.href); return ['http:', 'https:'].includes(url.protocol) ? esc(url.href) : ''; }
    catch { return ''; }
  };
  let projects = [], selected = 0, state = 'room', lamp = 'dark', dataError = false;
  let profile = null, profileError = false, activeSection = 'projects', detailFile = 'overview', detailSlug = null, detailImage = 0;
  let roomFrame, cameraFrame, cameraAnimations = [], navigationToken = 0, panCenter = null, lightingAbort = null;
  let historyDepth = 0, previousRoute = 'room', posterDark, posterLit;
  const AUTO_LAMP_DELAY = 3500;
  let studioReady = false, autoLampTimer = null, autoLampRemaining = AUTO_LAMP_DELAY;
  let autoLampStarted = 0, autoLampDone = false;
  const diagnostics = { cameraRuns: [], source: SOURCE, screen: SCREEN, screens:{projects:SCREEN,about:ABOUT_SCREEN,...sections.targets}, cameraVariant };
  if (qa) window.__studioDiagnostics = diagnostics;

  function pauseAutoLamp() {
    if (autoLampTimer !== null) {
      clearTimeout(autoLampTimer); autoLampTimer = null;
      autoLampRemaining = Math.max(0, autoLampRemaining - (performance.now() - autoLampStarted));
    }
    if (!autoLampDone) app.dataset.autoLamp = 'paused';
  }
  function cancelAutoLamp() {
    pauseAutoLamp(); autoLampDone = true; app.dataset.autoLamp = 'complete';
  }
  function scheduleAutoLamp() {
    // Reference captures freeze the room deliberately; normal visitors always
    // get the timer, starting only after assets and CMS content are ready.
    if (autoLampDone || !studioReady || referenceFrame || document.hidden || state !== 'room' || lamp !== 'dark' || autoLampTimer !== null) return;
    autoLampStarted = performance.now(); app.dataset.autoLamp = 'waiting';
    autoLampTimer = setTimeout(() => {
      autoLampTimer = null; autoLampRemaining = 0;
      if (document.hidden || state !== 'room') { pauseAutoLamp(); return; }
      cancelAutoLamp(); lightLamp();
    }, autoLampRemaining);
  }
  function setState(value) {
    hideHint(); state = value; app.dataset.state = value;
    scene.dataset.grabbable = String(value === 'room' && phone());
    if (value === 'room') scheduleAutoLamp(); else pauseAutoLamp();
  }
  function setLamp(value) {
    lamp=value; app.dataset.lamp=value; app.dataset.lampDiscovery='false';
    lampButton.setAttribute('aria-pressed',String(value==='lit'));
    lampButton.setAttribute('aria-label',value==='lit'?'Turn off the desk lamp':'Turn on the desk lamp');
    lampButton.dataset.label=value==='lit'?'Turn off lamp':'Turn on lamp';
  }
  function transform(frame) { return `translate(${frame.x}px, ${frame.y}px) scale(${frame.scale})`; }
  function screenRect() { return diagnostics.screens[activeSection]; }
  function hidePanels() { panels.forEach(host=>panelVisible(host,false)); }
  function panelVisible(host, visible) {
    host.hidden = !visible; host.inert = !visible; host.setAttribute('aria-hidden',String(!visible));
  }
  function roomMapping() {
    // Full bleed. Portrait users can drag through the original wide room.
    const scale = Math.max(innerWidth / SOURCE.width, innerHeight / SOURCE.height);
    // Keep the lamp at least 28px inside the initial portrait crop.
    // Subsequent manual panning stays untouched.
    const initialCenter=Math.min(phone()?680:SOURCE.width/2,454+(innerWidth/2-28)/scale);
    const center = phone() ? (panCenter ?? initialCenter) : initialCenter;
    return { scale, x: Math.max(innerWidth - SOURCE.width * scale, Math.min(0, innerWidth / 2 - center * scale)), y: (innerHeight - SOURCE.height * scale) / 2 };
  }
  function landingMapping() {
    const screen = screenRect();
    const scale = phone() && !objectViews.includes(activeSection) ? Math.max(innerWidth / screen.width, innerHeight / screen.height) : Math.min(innerWidth / screen.width, innerHeight / screen.height);
    return { scale, x: (innerWidth - screen.width * scale) / 2 - screen.x * scale, y: (innerHeight - screen.height * scale) / 2 - screen.y * scale };
  }
  function positionStage() {
    const scale = Math.min(innerWidth / SCREEN.width, innerHeight / SCREEN.height);
    Object.assign(stage.style, { left: `${(innerWidth - SCREEN.width * scale) / 2}px`, top: `${(innerHeight - SCREEN.height * scale) / 2}px`, transform: `scale(${scale})` });
    const aboutScale = Math.min(innerWidth / ABOUT_LAYOUT.width, innerHeight / ABOUT_LAYOUT.height);
    Object.assign(aboutStage.style, {left:`${(innerWidth-ABOUT_LAYOUT.width*aboutScale)/2}px`,top:`${(innerHeight-ABOUT_LAYOUT.height*aboutScale)/2}px`,transform:`scale(${aboutScale})`});
  }
  function layout() {
    roomFrame = roomMapping(); cameraFrame = landingMapping(); positionStage();
    scene.dataset.grabbable=String(state==='room' && phone());
    if (state === 'room') world.style.transform = transform(roomFrame);
    if (calibrating) {
      app.classList.add('is-calibrating'); const output = $('#calibration'); output.hidden = false;
      output.textContent = `${innerWidth} × ${innerHeight} / DPR ${devicePixelRatio}\nPROJECTS 544,322 → 1112,590\nABOUT 1165,493 → 1297,601 / scene scale ${roomFrame.scale.toFixed(3)}`;
    }
  }
  function artMarkup(project) {
    const url = safeUrl(project.coverImage);
    if (!url) return '<span class="cover-empty">PREVIEW</span>';
    const crop = project.previewCrop;
    if (crop && [crop.x,crop.y,crop.width,crop.height].every(Number.isFinite)) {
      return `<svg viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}" preserveAspectRatio="none" aria-hidden="true"><image href="${url}" width="1672" height="942"/></svg>`;
    }
    return `<img src="${url}" alt="" loading="eager" decoding="async">`;
  }
  function cardMarkup(project, index, interactive) {
    const tag = interactive ? 'button' : 'div';
    const attributes = interactive ? `type="button" data-project="${esc(project.slug)}" aria-label="Open ${esc(project.title)}${project.preview ? ', sample project preview' : ''}"` : '';
    return `<${tag} class="pixel-card ${index === selected ? 'is-selected' : ''}" ${attributes} data-project-id="${esc(project.id)}"><span class="card-cover">${artMarkup(project)}</span><span class="card-copy"><span class="card-title${project.title.length>18?' card-title-long':''}">${esc(project.title)}</span><span class="card-summary">${esc(project.shortSummary)}</span><span class="card-tags">${(project.tags || []).slice(0,3).map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}</span></span></${tag}>`;
  }
  function screenMarkup(interactive) {
    const page = Math.floor(selected / 3), visible = projects.slice(page * 3, page * 3 + 3);
    const arrow = (direction, text) => interactive ? `<button class="screen-arrow ${direction}" type="button" data-direction="${direction}" aria-label="${direction === 'previous' ? 'Previous' : 'Next'} project">${text}</button>` : `<span class="screen-arrow ${direction}">${text}</span>`;
    return `<div class="screen-ui"><div class="window-bar"><i class="window-dot"></i><i class="window-dot"></i><i class="window-dot"></i><span class="preview-label">${projects.some(p => p.preview) ? 'ARTWORK PREVIEW' : 'AFTER HOURS'}</span><span class="window-corner">□ ×</span></div>${interactive ? '<button class="screen-back" type="button" data-back-room aria-label="Back to studio">&lt; STUDIO</button>' : ''}<h1 class="screen-heading" ${interactive ? 'id="projects-title" tabindex="-1"' : ''}>Projects</h1>${visible.length ? `<div class="project-track" aria-label="Project cards">${visible.map((p,i) => cardMarkup(p, page * 3 + i, interactive)).join('')}</div>` : `<div class="empty-state"><strong>${dataError ? 'Projects unavailable' : 'No projects yet'}</strong><p>${dataError ? 'Please try again later.' : 'Published work will appear here.'}</p></div>`}${visible.length ? arrow('previous','&lt;') + arrow('next','&gt;') : ''}<div class="screen-footer"><span class="screen-count">${projects.length ? `${String(selected+1).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}` : ''}</span>${projects.map((p,i) => `<span class="page-dot ${i === selected ? 'is-selected' : ''}"></span>`).join('')}<span class="screen-help">SWIPE / ← →</span></div></div>`;
  }
  function renderScreens() {
    miniature.innerHTML = screenMarkup(false); stage.innerHTML = screenMarkup(true);
    miniature.hidden = false;
    if (qa) diagnostics.projectIds = projects.map(p => p.id);
  }
  function aboutMarkup(interactive) {
    const title = profile?.title || 'About Me';
    const fields = profile ? `<p class="about-role">${esc(profile.role)}</p><p class="about-bio">${esc(profile.bio)}</p><div class="about-grid"><section><h2>&gt; CURIOSITIES</h2><p>${(profile.focus || []).map(esc).join('<br>')}</p></section><section><h2>&gt; OFF THE CLOCK</h2><p>${(profile.toolkit || []).map(esc).join('<br>')}</p></section></div>${interactive ? `<nav class="about-socials" aria-label="Social profiles">${(profile.links || []).filter(link=>safeUrl(link.url)).map(link=>`<a href="${safeUrl(link.url)}" target="_blank" rel="noopener noreferrer">${esc(link.label)} ↗</a>`).join('')}</nav>` : ''}` : `<p class="about-role">${profileError ? 'Profile unavailable' : 'Profile coming soon'}</p><p class="about-bio">${profileError ? 'Please try again later.' : 'A little more about me will appear here soon.'}</p>`;
    return `<div class="about-screen"><div class="about-bar"><span aria-hidden="true">▣</span><span>PERSONAL FILE</span><span>01</span></div><div class="about-body"><div class="about-topline">${interactive ? '<button type="button" class="about-back" data-back-room aria-label="Back to studio">&lt; STUDIO</button>' : '<span>OPEN &gt;</span>'}<span>ABOUT.TXT</span></div><h1 ${interactive ? 'id="about-title" tabindex="-1"' : ''}>${esc(title)}</h1>${fields}<div class="about-footer"><span>${esc(profile?.note || 'AFTER HOURS')}</span><span aria-hidden="true">&gt;_</span></div></div></div>`;
  }
  function renderAbout() {
    aboutMiniature.innerHTML = aboutMarkup(false); aboutStage.innerHTML = aboutMarkup(true);
  }
  function updateSelection(index, scroll = true) {
    if (!projects.length) return;
    const oldPage = Math.floor(selected / 3); selected = (index + projects.length) % projects.length;
    if (Math.floor(selected / 3) !== oldPage) renderScreens();
    else {
      for (const host of [miniature, stage]) {
        host.querySelectorAll('.pixel-card').forEach(card => card.classList.toggle('is-selected', card.dataset.projectId === projects[selected].id));
        host.querySelectorAll('.page-dot').forEach((dot,i) => dot.classList.toggle('is-selected', i === selected));
        host.querySelector('.screen-count').textContent = `${String(selected+1).padStart(2,'0')} / ${String(projects.length).padStart(2,'0')}`;
      }
    }
    if (phone() && scroll) selectedCard()?.scrollIntoView({ block:'nearest', inline:'center', behavior: reduced.matches ? 'instant' : 'smooth' });
    $('#announcer').textContent = `${projects[selected].title}, ${selected+1} of ${projects.length}`;
  }
  function selectedCard() { return stage.querySelector(`[data-project-id="${CSS.escape(projects[selected]?.id || '')}"]`); }
  function currentRoute() {
    const params = new URLSearchParams(location.search);
    return params.get('project') ? { view:'detail', slug:params.get('project') } : {view:views.includes(params.get('view')) ? params.get('view') : 'room'};
  }
  function routeUrl(view, slug) {
    const url = new URL(location.href); url.searchParams.delete('view'); url.searchParams.delete('project');
    if (views.includes(view)) url.searchParams.set('view',view);
    if (view === 'detail') url.searchParams.set('project',slug);
    return `${url.pathname}${url.search}${url.hash}`;
  }
  function navigate(view, slug, replace = false) {
    if (['entering','leaving'].includes(state) || lamp === 'lighting') return;
    historyDepth = replace ? historyDepth : historyDepth + 1;
    history[replace ? 'replaceState' : 'pushState']({ afterHours:true, depth:historyDepth }, '', routeUrl(view,slug));
    syncRoute();
  }
  function goBack(fallback) {
    if (['entering','leaving'].includes(state)) return;
    if (historyDepth > 0) history.back(); else navigate(fallback, undefined, true);
  }
  function controlsEnabled(enabled) {
    scene.inert = !enabled; mobileAccess.inert = !enabled;
    monitorButton.disabled = !enabled || lamp === 'lighting'; mobileButton.disabled = monitorButton.disabled;
    aboutButton.disabled = monitorButton.disabled; mobileAbout.disabled = monitorButton.disabled;
    objectViews.forEach(name=> { sectionButton(name).disabled=monitorButton.disabled; sectionShortcut(name).disabled=monitorButton.disabled; });
    lampButton.disabled = !enabled || lamp === 'lighting';
    catButton.disabled = lampButton.disabled;
    if(enabled && hintPointer && hintPointer.type!=='touch' && lampButton.matches(':hover'))showHint(lampButton,hintPointer.x,hintPointer.y);
  }
  function activeVideo() { return videos[lamp === 'lit' ? 'lit' : lamp === 'lighting' ? 'lighting' : 'dark']; }
  function freezeRoom() {
    const video = activeVideo(), context = frozen.getContext('2d', { alpha:false });
    context.imageSmoothingEnabled = false;
    const poster = lamp === 'lit' ? posterLit : posterDark;
    context.fillStyle = '#000'; context.fillRect(0,0,SOURCE.width,SOURCE.height);
    // Reference PNGs are 941 px high; retain the video's extra bottom padding row.
    context.drawImage(!referenceFrame && video.readyState >= 2 ? video : poster,0,0);
    Object.values(videos).forEach(v => v.pause()); frozen.hidden = false; app.classList.add('is-frozen');
  }
  async function resumeRoom() {
    if (referenceFrame) { freezeRoom(); return; }
    const video = activeVideo();
    if (!reduced.matches) await video.play().catch(() => {});
    frozen.hidden = true; app.classList.remove('is-frozen');
  }
  function cancelCamera() {
    window.studioAudio?.stopMotion();
    cameraAnimations.forEach(animation => animation.cancel()); cameraAnimations = [];
    app.classList.remove('rushing');
  }
  function animateRush(duration) {
    const overlay = $('#speed-lines'), mobile = phone();
    const screen = screenRect();
    overlay.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    overlay.replaceChildren();
    // Project the actual monitor centre halfway through the rush. All streaks
    // point away from it, like the room passing the viewer during a forward dive.
    const scale = roomFrame.scale * (cameraFrame.scale / roomFrame.scale) ** .52;
    const t = (scale-roomFrame.scale) / (cameraFrame.scale-roomFrame.scale || 1);
    const origin = {
      x: roomFrame.x + (cameraFrame.x-roomFrame.x)*t + (screen.x+screen.width/2)*scale,
      y: roomFrame.y + (cameraFrame.y-roomFrame.y)*t + (screen.y+screen.height/2)*scale
    };
    // A phone shortcut can start with the small CRT outside the room crop.
    // Keep the visible rush centred enough for both edges to move outward.
    if (mobile) origin.x = Math.max(innerWidth*.25,Math.min(innerWidth*.75,origin.x));
    const edges = mobile ? [[.035,.17],[.055,.85],[.965,.12],[.945,.88]] :
      [[.035,.16],[.015,.49],[.055,.87],[.965,.11],[.985,.55],[.945,.90]];
    const pixel = value => Math.round(value / 2) * 2;
    app.classList.add('rushing');
    return edges.map(([x,y],index) => {
      const end = {x:x*innerWidth,y:y*innerHeight};
      const distance = Math.hypot(end.x-origin.x,end.y-origin.y);
      const u = {x:(end.x-origin.x)/distance,y:(end.y-origin.y)/distance};
      const length = mobile ? 56 : Math.min(140,innerWidth*.097);
      const thickness = mobile ? 4 : 6, travel = mobile ? 36 : 80;
      const point = (along,across) => `${pixel(end.x+u.x*along-u.y*across)},${pixel(end.y+u.y*along+u.x*across)}`;
      const streak = document.createElementNS('http://www.w3.org/2000/svg','polygon');
      // A narrow inward tip and wider outer tail, with crisp two-pixel vertices.
      streak.setAttribute('points',[point(-length,0),point(-length*.45,-thickness/2),point(0,-thickness/2),point(0,thickness/2),point(-length*.45,thickness/2)].join(' '));
      overlay.append(streak);
      const move = amount => `translate(${u.x*amount}px, ${u.y*amount}px)`;
      const phase = (index%3)*.014, opacity = mobile ? .58 : .68;
      const animation = streak.animate([
        {offset:0,opacity:0,transform:move(-travel*.45)},
        {offset:.20+phase,opacity:0,transform:move(-travel*.45)},
        {offset:.31+phase,opacity,transform:move(0)},
        {offset:.51+phase,opacity,transform:move(travel*.5)},
        {offset:.64+phase,opacity:opacity*.65,transform:move(travel*.8)},
        {offset:.77+phase,opacity:0,transform:move(travel)},
        {offset:1,opacity:0,transform:move(travel)}
      ],{duration,easing:'linear',fill:'both'});
      animation.id = 'studio-rush';
      return animation;
    });
  }
  async function animateCamera(entering) {
    cancelCamera();
    if (reduced.matches) { world.style.transform = transform(entering ? cameraFrame : roomFrame); return; }
    const duration = phone() ? (entering ? 420 : 360) : (entering ? 560 : 460);
    window.studioAudio?.play(entering?'rush':'return');
    const offsets = [0,.08,.18,.28,.36,.44,.52,.60,.68,.76,.84,.92,1];
    const distances = [0,0,.02,.07,.17,.32,.52,.72,.86,.94,.98,1,1];
    const from = entering ? roomFrame : cameraFrame, to = entering ? cameraFrame : roomFrame;
    const samples = offsets.map((offset,i) => ({offset,p:entering ? distances[i] : 1-distances[distances.length-1-i]}));
    const frames = samples.map(({offset,p,easing = 'linear'}) => {
      const scale = from.scale * (to.scale / from.scale) ** p;
      const t = (scale-from.scale) / (to.scale-from.scale || 1);
      return { offset, easing, transform: transform({scale,x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t}) };
    });
    const screen = screenRect();
    const cropped = `inset(${screen.y}px ${SOURCE.width-screen.x-screen.width}px ${SOURCE.height-screen.y-screen.height}px ${screen.x}px)`;
    const clipFrames = entering ? [{clipPath:'inset(0px)',offset:0},{clipPath:'inset(0px)',offset:.77},{clipPath:cropped,offset:1}] : [{clipPath:cropped,offset:0},{clipPath:'inset(0px)',offset:.23},{clipPath:'inset(0px)',offset:1}];
    const camera = world.animate(frames,{duration,easing:'linear',fill:'forwards'});
    camera.id = 'studio-camera';
    const clipping = world.animate(clipFrames,{duration,easing:'linear',fill:'forwards'});
    cameraAnimations = [camera,clipping];
    if (entering) cameraAnimations.push(...animateRush(duration));
    const started = performance.now(), times = []; let measuring = true;
    const measure = (t) => { if (measuring) { times.push(t); requestAnimationFrame(measure); } };
    if (qa) requestAnimationFrame(measure);
    await camera.finished.catch(() => {}); measuring = false;
    if (qa) diagnostics.cameraRuns.push({ cameraVariant, section:activeSection, entering, requestedMs:duration, actualMs:performance.now()-started, frameGaps:times.slice(1).map((t,i)=>t-times[i]) });
    app.classList.remove('rushing');
  }
  function showList(focus = true) {
    panelVisible(objectPanel,false);
    panelVisible(aboutPanel,false);
    detail.hidden = true; stage.hidden = false; panel.hidden = false; panel.inert = false; panel.setAttribute('aria-hidden','false');
    setState('projects'); controlsEnabled(false); positionStage();
    if (phone()) selectedCard()?.scrollIntoView({block:'nearest',inline:'center',behavior:'instant'});
    if (focus) $('#projects-title')?.focus({preventScroll:true});
  }
  function showDetail(slug, focus = true) {
    panelVisible(objectPanel,false);
    panelVisible(aboutPanel,false);
    const index = projects.findIndex(p => p.slug === slug);
    if (index < 0) {
      detail.innerHTML = '<div class="detail-inner"><button class="detail-back" data-back-list>← PROJECTS</button><h1 class="detail-heading" tabindex="-1">Project not found</h1><p>This project is not published or is unavailable.</p></div>';
    } else {
      updateSelection(index,false); const p = projects[index];
      if(detailSlug!==slug) { detailFile='overview';detailSlug=slug;detailImage=0; }
      detail.innerHTML = `<div class="detail-inner"><header class="detail-toolbar"><button class="detail-back" data-back-list>← PROJECTS</button><span>PROJECT FILE / ${String(index+1).padStart(2,'0')}</span></header><h1 class="detail-heading" tabindex="-1">${esc(p.title)}</h1>${p.preview ? '<p class="detail-preview">ARTWORK PREVIEW · SAMPLE PROJECT</p>' : ''}<p class="detail-summary">${esc(p.shortSummary)}</p>${projectLinks(p)}<div class="project-file"><nav class="project-file-index" aria-label="Project file sections">${[['overview','Overview'],['engineering','How it works'],['evidence','In pictures'],['stack','Stack & links']].map(([id,label])=>`<button type="button" data-project-file="${id}" aria-pressed="${detailFile===id}">${label}</button>`).join('')}</nav><article id="project-file-content"></article></div></div>`;
      renderProjectFile(detailFile);
    }
    panel.hidden = false; panel.inert = false; panel.setAttribute('aria-hidden','false'); stage.hidden = true; detail.hidden = false;
    detail.scrollTop = 0; setState('detail'); controlsEnabled(false);
    if (focus) detail.querySelector('h1')?.focus({preventScroll:true});
  }
  function projectLinks(project) {
    return `<div class="detail-links">${safeUrl(project.liveUrl)?`<a href="${safeUrl(project.liveUrl)}" target="_blank" rel="noopener noreferrer">LIVE PROJECT ↗</a>`:''}${safeUrl(project.repositoryUrl)?`<a href="${safeUrl(project.repositoryUrl)}" target="_blank" rel="noopener noreferrer">REPOSITORY ↗</a>`:''}</div>`;
  }
  function projectImages(project) {
    return (project.gallery||[]).map(image=>typeof image==='string'?{url:image,alt:`${project.title} screenshot`}:image).filter(image=>safeUrl(image.url));
  }
  function pictureMarkup(image,small=false) {
    return `<figure class="project-picture${small?' picture-overview':''}"><a href="${safeUrl(image.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open full image: ${esc(image.alt)}"><img src="${safeUrl(image.url)}" alt="${esc(image.alt)}" loading="${small?'eager':'lazy'}" decoding="async"></a><figcaption>${esc(image.alt)} <a href="${safeUrl(image.url)}" target="_blank" rel="noopener noreferrer">FULL SIZE ↗</a></figcaption></figure>`;
  }
  function renderProjectGallery(focusIndex) {
    const host=$('#project-gallery'),images=projectImages(projects[selected]);if(!host||!images.length)return;
    detailImage=(detailImage+images.length)%images.length;
    host.innerHTML=`${pictureMarkup(images[detailImage])}<div class="gallery-controls"><button type="button" data-picture-step="-1" aria-label="Previous project image" ${images.length===1?'disabled':''}>←</button><span role="status" aria-live="polite">${String(detailImage+1).padStart(2,'0')} / ${String(images.length).padStart(2,'0')}</span><button type="button" data-picture-step="1" aria-label="Next project image" ${images.length===1?'disabled':''}>→</button></div>${images.length>1?`<div class="gallery-index" aria-label="Project images">${images.map((image,i)=>`<button type="button" data-picture="${i}" aria-label="Show image ${i+1}: ${esc(image.alt)}" aria-pressed="${i===detailImage}"><img src="${safeUrl(image.url)}" alt="" loading="lazy"><span>${String(i+1).padStart(2,'0')}</span></button>`).join('')}</div>`:''}`;
    if(focusIndex!==undefined)host.querySelector(`[${focusIndex}]`)?.focus({preventScroll:true});
  }
  const technologyIcons={
    Python:'python',FastAPI:'fastapi','Next.js':'nextjs',React:'react',PostgreSQL:'postgresql','Supabase Auth':'supabase',TypeScript:'typescript',Flask:'flask','Scikit-learn':'scikitlearn','TensorFlow / Keras':'tensorflow',SQLite:'sqlite','GitHub Actions':'githubactions',Docker:'docker','Amazon ECR':'aws','Amazon EC2':'aws','AWS Systems Manager Parameter Store':'aws','Amazon CloudWatch':'aws','Amazon SNS':'aws','AWS IAM / OIDC':'aws','Node.js':'nodejs',Express:'express',MongoDB:'mongodb',Mongoose:'mongoose','HTML / CSS':'html5',JavaScript:'javascript'
  };
  function technologyMarkup(name) {
    const icon=technologyIcons[name],plain=['flask','express'].includes(icon);
    return `<li>${icon?`<img src="./assets/technologies/${icon}.svg" class="${icon==='nextjs'?'tech-nextjs':plain?'tech-monochrome':''}" alt="" width="26" height="26" loading="lazy">`:`<span class="tech-initial" aria-hidden="true">${esc(name==='Python AST'?'{}':name.slice(0,2).toUpperCase())}</span>`}<span>${esc(name)}</span></li>`;
  }
  function renderProjectFile(file, focus=false) {
    if(!['overview','engineering','evidence','stack'].includes(file))return;
    const project=projects[selected],host=$('#project-file-content');if(!project || !host)return;
    detailFile=file;
    detail.querySelectorAll('[data-project-file]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.projectFile===file)));
    const title={overview:'At a glance',engineering:'How it works',evidence:'In pictures',stack:'Stack & links'}[file];
    let content='';
    if(file==='overview') {const image=projectImages(project)[0];content=`<div class="project-intro"><div class="project-emblem">${artMarkup(project)}</div><p>${esc(project.problem || 'Details coming soon.')}</p></div>${project.highlights?.length?`<dl class="project-highlights">${project.highlights.map(note=>`<div><dt>${esc(note.title)}</dt><dd>${esc(note.body)}</dd></div>`).join('')}</dl>`:''}${image?pictureMarkup(image,true):''}`;}
    if(file==='engineering') content=`${project.flow?.length?`<ol class="project-flow" aria-label="Application flow">${project.flow.map((step,i)=>`<li><span aria-hidden="true">${String(i+1).padStart(2,'0')}</span>${esc(step)}</li>`).join('')}</ol>`:''}<p class="engineering-intro">${esc(project.approach || 'Engineering notes will appear here.')}</p>${project.technicalNotes?.length?`<dl class="engineering-notes">${project.technicalNotes.map(note=>`<div><dt>${esc(note.title)}</dt><dd>${esc(note.body)}</dd></div>`).join('')}</dl>`:''}`;
    if(file==='evidence') content=`${projectImages(project).length?'<div id="project-gallery"></div>':'<p class="file-muted">Pictures will appear here when added.</p>'}${project.outcomes?`<ul class="project-receipt">${project.outcomes.split(/\n+/).filter(Boolean).map(line=>`<li>${esc(line)}</li>`).join('')}</ul>`:''}`;
    if(file==='stack') content=`<ul class="technology-list" aria-label="Technology stack">${(project.technologies || []).map(technologyMarkup).join('')}</ul>${projectLinks(project)}`;
    host.innerHTML=`<h2 tabindex="-1">${title}</h2>${content}`;
    if(file==='evidence')renderProjectGallery();
    if(focus)host.querySelector('h2').focus({preventScroll:true});
  }
  function showAbout() {
    panelVisible(objectPanel,false);
    panelVisible(panel,false); panelVisible(aboutPanel,true);
    if (state !== 'about') aboutPanel.scrollTop = 0;
    setState('about'); controlsEnabled(false); positionStage();
    $('#about-title')?.focus({preventScroll:true});
  }
  function showObject(view) {
    const changed = state !== view || objectPanel.hidden;
    hidePanels(); panelVisible(objectPanel,true); objectPanel.dataset.section=view;
    objectPanel.setAttribute('aria-label',view==='journey'?'My journey':view==='resume'?'Resume':view==='bookshelf'?'Certifications and learning':'Contact');
    if (changed) { objectPanel.innerHTML=sections.render(view); sections.activate(view,objectPanel); objectPanel.scrollTop=0; }
    setState(view); controlsEnabled(false);
    $('#object-title')?.focus({preventScroll:true});
  }
  async function syncRoute(immediate = false) {
    const token = ++navigationToken, route = currentRoute();
    const hadPanel = panels.some(host=>!host.hidden), busy = ['entering','leaving'].includes(state);
    if (busy) { cancelCamera(); immediate = true; }
    if (route.view === 'room') {
      if (state !== 'room' && !immediate) {
        setState('leaving'); hidePanels();
        await animateCamera(false); if (token !== navigationToken) return;
      }
      cancelCamera(); setState('room'); world.style.transform = transform(roomFrame); world.style.clipPath = 'none';
      hidePanels(); controlsEnabled(true); await resumeRoom();
      if (hadPanel || busy || previousRoute !== 'room') {
        const hotspot = sectionButton(activeSection);
        const fallback = sectionShortcut(activeSection);
        const bounds = hotspot.getBoundingClientRect();
        const preferred = returnControls[activeSection];
        const rect = preferred?.getBoundingClientRect();
        const preferredVisible = preferred?.getClientRects().length && rect.right>0 && rect.left<innerWidth && rect.bottom>0 && rect.top<innerHeight;
        const hotspotVisible = bounds.right>0 && bounds.left<innerWidth && bounds.bottom>0 && bounds.top<innerHeight;
        const origin = phone() ? fallback : preferredVisible ? preferred : hotspotVisible ? hotspot : fallback;
        origin.focus({preventScroll:true});
      }
    } else {
      const target = route.view === 'detail' ? 'projects' : route.view;
      if (activeSection !== target) {
        cancelCamera(); activeSection = target; layout();
        if (state !== 'room') world.style.transform = transform(cameraFrame);
      }
      if (state === 'room') {
        freezeRoom(); controlsEnabled(false);
        if (!immediate) { setState('entering'); await animateCamera(true); if (token !== navigationToken) return; }
        else world.style.transform = transform(cameraFrame);
      }
      if (route.view === 'about') showAbout();
      else if (objectViews.includes(route.view)) showObject(route.view);
      else if (route.view === 'detail') showDetail(route.slug); else showList();
    }
    previousRoute = route.view;
  }
  function waitForVideo(video) {
    if (video.readyState >= 2) return Promise.resolve();
    return new Promise((resolve,reject) => {
      const timeout = setTimeout(() => finish(new Error('Video loading timed out')),8000);
      const finish = (error) => { clearTimeout(timeout); video.removeEventListener('loadeddata',loaded); video.removeEventListener('error',failed); error ? reject(error) : resolve(); };
      const loaded = () => finish(); const failed = () => finish(new Error('Video could not load'));
      video.addEventListener('loadeddata',loaded,{once:true}); video.addEventListener('error',failed,{once:true});
    });
  }
  function setActiveVideo(video) { Object.values(videos).forEach(v=>v.classList.toggle('is-active',v === video)); }
  async function lightLamp() {
    if (lamp === 'lighting' || state !== 'room') return;
    cancelAutoLamp();
    window.studioAudio?.play('lamp');
    hideHint();
    if(lamp==='lit') {
      // The dark loop is already loaded. Switch its visibility in this task;
      // there is no reverse clip, fade, timer or wait for a playback promise.
      videos.lit.pause();setActiveVideo(videos.dark);setLamp('dark');
      if(referenceFrame)freezeRoom();
      else {
        frozen.hidden=true;app.classList.remove('is-frozen');
        if(!reduced.matches)videos.dark.play().catch(()=>{});
      }
      controlsEnabled(true);$('#announcer').textContent='Desk lamp off. Studio lighting is dark.';
      return;
    }
    frozen.hidden=true;app.classList.remove('is-frozen');
    setLamp('lighting'); controlsEnabled(true); lightingAbort = new AbortController();
    try {
      await waitForVideo(videos.lit);
      if (!reduced.matches) {
        const clip = videos.lighting; await waitForVideo(clip); clip.currentTime = 0;
        await clip.play(); setActiveVideo(clip); videos.dark.pause();
        await new Promise((resolve,reject) => {
          if (lightingAbort.signal.aborted || reduced.matches) { clip.pause(); resolve(); return; }
          const timeout = setTimeout(()=>finish(new Error('Lighting playback timed out')),6000);
          const finish = error => { clearTimeout(timeout); clip.removeEventListener('ended',ended); clip.removeEventListener('error',failed); lightingAbort.signal.removeEventListener('abort',stop); clip.pause(); error ? reject(error) : resolve(); };
          const ended = ()=>finish(); const failed = ()=>finish(new Error('Lighting playback failed'));
          const stop = ()=>finish(); lightingAbort.signal.addEventListener('abort',stop,{once:true});
          clip.addEventListener('ended',ended,{once:true}); clip.addEventListener('error',failed,{once:true});
        });
      }
      videos.lit.currentTime = 0; if (!reduced.matches) await videos.lit.play();
      setActiveVideo(videos.lit); setLamp('lit');
      if(referenceFrame)freezeRoom();
      $('#announcer').textContent = 'Desk lamp on. Studio lighting is warm.';
    } catch {
      setLamp('dark'); setActiveVideo(videos.dark); if (!reduced.matches) videos.dark.play().catch(()=>{});
      $('#announcer').textContent = 'The lamp transition could not play. Please try again.';
    }
    lightingAbort = null; controlsEnabled(true);
  }
  function trapFocus(event) {
    const host = panels.find(host=>!host.hidden);
    if (!host || event.key !== 'Tab') return;
    const selector='button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled)';
    const buttons = [...host.querySelectorAll(selector),...$('.sound-controls').querySelectorAll(selector)].filter(el=>el.tabIndex>=0 && el.getClientRects().length > 0 && !el.closest('[hidden]'));
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); buttons.at(-1).focus(); }
    else if (!event.shiftKey && (index < 0 || index === buttons.length-1)) { event.preventDefault(); buttons[0].focus(); }
  }
  views.forEach(name=> {
    for(const button of [sectionButton(name),sectionShortcut(name)]) button.addEventListener('click',()=>{
      if(['entering','leaving'].includes(state) || lamp==='lighting')return;
      window.studioAudio?.play({projects:'click',about:'crt',journey:'paper',bookshelf:'book',contact:'phone'}[name]);
      returnControls[name]=button;navigate(name);
    });
  });
  objectPanel.addEventListener('click',event=> { if(event.target.closest('[data-back-room]')) goBack('room'); });
  aboutStage.addEventListener('click',event=> { if(event.target.closest('[data-back-room]')) goBack('room'); });
  lampButton.addEventListener('click',lightLamp);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAutoLamp();else scheduleAutoLamp();});
  addEventListener('pagehide',pauseAutoLamp);
  addEventListener('pageshow',scheduleAutoLamp);
  catButton.addEventListener('click',()=> {
    if(state!=='room' || catButton.disabled)return;
    window.studioAudio?.play('purr');
    $('#announcer').textContent='The cat settles comfortably.';
  });
  stage.addEventListener('click',event=> {
    if (event.target.closest('[data-back-room]')) return goBack('room');
    const arrow = event.target.closest('[data-direction]');
    if (arrow) {window.studioAudio?.play('key');return updateSelection(selected+(arrow.dataset.direction === 'next' ? 1 : -1));}
    const card = event.target.closest('[data-project]'); if (card) {window.studioAudio?.play('click');navigate('detail',card.dataset.project);}
  });
  detail.addEventListener('click',event=> {
    if (event.target.closest('[data-back-list]')) goBack('projects');
    const file=event.target.closest('[data-project-file]');if(file){if(file.getAttribute('aria-pressed')!=='true')window.studioAudio?.play('key');renderProjectFile(file.dataset.projectFile,true);}
    const picture=event.target.closest('[data-picture]');if(picture){detailImage=Number(picture.dataset.picture);renderProjectGallery(`data-picture="${detailImage}"`);}
    const step=event.target.closest('[data-picture-step]');if(step){detailImage+=Number(step.dataset.pictureStep);renderProjectGallery(`data-picture-step="${step.dataset.pictureStep}"`);}
  });
  addEventListener('keydown',event=> {
    trapFocus(event);
    if(event.key==='Escape')hideHint();
    if (state === 'projects' && ['ArrowLeft','ArrowRight'].includes(event.key) && !event.target.closest('.sound-controls')) { event.preventDefault();window.studioAudio?.play('key'); updateSelection(selected+(event.key === 'ArrowRight' ? 1 : -1)); }
    if (event.key === 'Escape') { if (state === 'detail') goBack('projects'); else if (views.includes(state)) goBack('room'); }
  });
  addEventListener('popstate',event=> { historyDepth = event.state?.afterHours ? event.state.depth : 0; syncRoute(); });
  addEventListener('resize',()=> {
    layout();
    if (state !== 'room') { cancelCamera(); syncRoute(true); }
  });
  reduced.addEventListener('change',()=> {
    if (reduced.matches) Object.values(videos).forEach(v=>v.pause());
    if (lamp === 'lighting' && reduced.matches) lightingAbort?.abort();
    layout(); cancelCamera(); syncRoute(true);
  });
  let drag = null;
  scene.addEventListener('pointerdown',event=> {
    if (!phone() || state !== 'room' || event.target.closest('button')) return;
    drag = { x:event.clientX, start:roomFrame.x }; scene.setPointerCapture(event.pointerId);
    document.dispatchEvent(new CustomEvent('studio:drag',{detail:true}));
  });
  scene.addEventListener('pointermove',event=> {
    if (!drag) return;
    roomFrame.x = Math.max(innerWidth-SOURCE.width*roomFrame.scale,Math.min(0,drag.start+event.clientX-drag.x));
    panCenter = (innerWidth/2-roomFrame.x)/roomFrame.scale; world.style.transform = transform(roomFrame);
    if (Math.abs(event.clientX-drag.x)>10) app.classList.add('has-panned');
  });
  const endDrag=()=> {drag=null;document.dispatchEvent(new CustomEvent('studio:drag',{detail:false}));};
  scene.addEventListener('pointerup',endDrag);scene.addEventListener('pointercancel',endDrag);scene.addEventListener('lostpointercapture',endDrag);
  addEventListener('blur',endDrag);
  // Native horizontal swipe also updates the miniature's selected card.
  stage.addEventListener('scrollend',event=> {
    if (!phone() || state !== 'projects' || !event.target.matches('.project-track')) return;
    const track = event.target, center = track.getBoundingClientRect().left+track.clientWidth/2;
    const cards = [...track.querySelectorAll('.pixel-card')];
    const closest = cards.reduce((best,card)=> Math.abs(card.getBoundingClientRect().left+card.clientWidth/2-center)<Math.abs(best.getBoundingClientRect().left+best.clientWidth/2-center) ? card : best,cards[0]);
    const index = projects.findIndex(p=>p.id === closest?.dataset.projectId); if (index>=0 && index !== selected) updateSelection(index,false);
  },true);
  function loadImage(url) { return new Promise((resolve,reject)=> {const image = new Image(); image.onload=()=>resolve(image); image.onerror=reject; image.src=url;}); }
  const hint=$('#object-hint');let hintedButton=null,hintSize={width:0,height:0},hintPointer=null;
  function hideHint() {
    hint.hidden=true;hintedButton?.removeAttribute('aria-describedby');hintedButton=null;
  }
  function moveHint(x,y) {
    const left=Math.max(8,Math.min(innerWidth-hintSize.width-8,x+16));
    const top=y+18+hintSize.height>innerHeight-8 ? y-hintSize.height-12 : y+18;
    hint.style.left=`${Math.round(left/2)*2}px`;hint.style.top=`${Math.max(8,Math.round(top/2)*2)}px`;
  }
  function showHint(button,x,y) {
    if(state!=='room' || button.disabled)return;
    hideHint();hintedButton=button;hint.textContent=button.dataset.label;
    hint.hidden=false;button.setAttribute('aria-describedby','object-hint');
    hintSize=hint.getBoundingClientRect();moveHint(x,y);
  }
  for(const button of document.querySelectorAll('.hotspot')) {
    button.addEventListener('pointerenter',event=> {hintPointer={x:event.clientX,y:event.clientY,type:event.pointerType};if(event.pointerType!=='touch')showHint(button,event.clientX,event.clientY);});
    button.addEventListener('pointermove',event=> {hintPointer={x:event.clientX,y:event.clientY,type:event.pointerType};if(hintedButton===button && event.pointerType!=='touch')moveHint(event.clientX,event.clientY);});
    button.addEventListener('pointerleave',()=> {if(hintedButton===button)hideHint();});
    button.addEventListener('focus',()=> {
      if(button.matches(':focus-visible')) {const rect=button.getBoundingClientRect();showHint(button,rect.left+rect.width/2,rect.top+rect.height/2);}
    });
    button.addEventListener('blur',()=> {if(hintedButton===button)hideHint();});
  }
  addEventListener('resize',hideHint);
  async function init() {
    setLamp('dark');
    controlsEnabled(false); miniature.hidden = true;
    historyDepth = history.state?.afterHours ? history.state.depth : 0;
    history.replaceState({afterHours:true,depth:historyDepth},'',location.href);
    const [dark,lit] = await Promise.all([loadImage('./assets/studio-dark.png'),loadImage('./assets/studio-lit.png'),document.fonts.load('20px StudioPixel')]);
    posterDark = dark; posterLit = lit;
    try { projects = (await window.projectRepository.listPublished()).filter(p=>p.status === 'published').sort((a,b)=>a.sortOrder-b.sortOrder); }
    catch { dataError = true; }
    try { const record = await window.aboutRepository.getPublished(); profile = record?.status === 'published' ? record : null; }
    catch { profileError = true; }
    const slug = currentRoute().slug; const index = projects.findIndex(p=>p.slug === slug); if (index>=0) selected=index;
    await sections.load();
    renderScreens(); renderAbout(); layout();
    if (reduced.matches) Object.values(videos).forEach(v=>v.pause());
    if (currentRoute().view !== 'room') await syncRoute(true); else { controlsEnabled(true); if (!reduced.matches && !referenceFrame) videos.dark.play().catch(()=>{}); }
    if (referenceFrame && state === 'room') freezeRoom();
    app.dataset.ready = 'true';
    studioReady = true; scheduleAutoLamp();
  }
  init().catch(()=> { $('#announcer').textContent = 'Studio assets could not load. Please refresh the page.'; });
})();
