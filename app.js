(() => {
  'use strict';
  const SOURCE = { width: 1672, height: 942 };
  const SCREEN = { x: 544, y: 322, width: 568, height: 268 };
  const ABOUT_SCREEN = { x: 1165, y: 493, width: 132, height: 108 };
  const ABOUT_LAYOUT = { width: 528, height: 432 };
  const $ = (selector) => document.querySelector(selector);
  const app = $('#app'), world = $('#world'), scene = $('#scene-viewport');
  const miniature = $('#monitor-live'), panel = $('#projects-panel'), stage = $('#expanded-stage');
  const detail = $('#project-detail'), monitorButton = $('#monitor-hotspot'), lampButton = $('#lamp-hotspot');
  const mobileButton = $('#mobile-projects'), mobileAccess = $('#mobile-access');
  const aboutButton = $('#about-hotspot'), mobileAbout = $('#mobile-about');
  const aboutMiniature = $('#about-live'), aboutPanel = $('#about-panel'), aboutStage = $('#about-stage');
  const objectPanel = $('#object-panel'), sections = window.studioSections;
  const objectViews = Object.keys(sections.targets), views = ['projects','about',...objectViews];
  const panels = [panel,aboutPanel,objectPanel];
  const returnControls = {};
  const sectionButton = name => $(`#${name==='projects'?'monitor':name}-hotspot`);
  const sectionShortcut = name => $(`#mobile-${name}`);
  for (const [name,rect] of Object.entries(sections.targets)) {
    Object.assign(sectionButton(name).style,{left:`${rect.x}px`,top:`${rect.y}px`,width:`${rect.width}px`,height:`${rect.height}px`});
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
  let profile = null, profileError = false, activeSection = 'projects', detailFile = 'overview', detailSlug = null;
  let roomFrame, cameraFrame, cameraAnimations = [], navigationToken = 0, panCenter = null, lightingAbort = null;
  let historyDepth = 0, previousRoute = 'room', posterDark, posterLit;
  const diagnostics = { cameraRuns: [], source: SOURCE, screen: SCREEN, screens:{projects:SCREEN,about:ABOUT_SCREEN,...sections.targets}, cameraVariant };
  if (qa) window.__studioDiagnostics = diagnostics;

  function setState(value) { state = value; app.dataset.state = value; }
  function setLamp(value) { lamp = value; app.dataset.lamp = value; }
  function transform(frame) { return `translate(${frame.x}px, ${frame.y}px) scale(${frame.scale})`; }
  function screenRect() { return diagnostics.screens[activeSection]; }
  function hidePanels() { panels.forEach(host=>panelVisible(host,false)); }
  function panelVisible(host, visible) {
    host.hidden = !visible; host.inert = !visible; host.setAttribute('aria-hidden',String(!visible));
  }
  function roomMapping() {
    // Full bleed. Portrait users can drag through the original wide room.
    const scale = Math.max(innerWidth / SOURCE.width, innerHeight / SOURCE.height);
    const center = phone() ? (panCenter ?? 680) : SOURCE.width / 2;
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
    return `<${tag} class="pixel-card ${index === selected ? 'is-selected' : ''}" ${attributes} data-project-id="${esc(project.id)}"><span class="card-cover">${artMarkup(project)}</span><span class="card-copy"><span class="card-title">${esc(project.title)}</span><span class="card-summary">${esc(project.shortSummary)}</span><span class="card-tags">${(project.tags || []).slice(0,3).map(t => `<span class="card-tag">${esc(t)}</span>`).join('')}</span></span></${tag}>`;
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
    lampButton.disabled = !enabled || lamp !== 'dark';
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
      if(detailSlug!==slug) { detailFile='overview';detailSlug=slug; }
      detail.innerHTML = `<div class="detail-inner"><header class="detail-toolbar"><button class="detail-back" data-back-list>← PROJECTS</button><span>PROJECT FILE / ${String(index+1).padStart(2,'0')}</span></header><h1 class="detail-heading" tabindex="-1">${esc(p.title)}</h1>${p.preview ? '<p class="detail-preview">ARTWORK PREVIEW · SAMPLE PROJECT</p>' : ''}<p class="detail-summary">${esc(p.shortSummary)}</p><div class="project-file"><nav class="project-file-index" aria-label="Project file sections">${[['overview','Overview'],['engineering','Engineering'],['evidence','Evidence'],['stack','Stack & links']].map(([id,label])=>`<button type="button" data-project-file="${id}" aria-pressed="${detailFile===id}">${label}</button>`).join('')}</nav><article id="project-file-content"></article></div></div>`;
      renderProjectFile(detailFile);
    }
    panel.hidden = false; panel.inert = false; panel.setAttribute('aria-hidden','false'); stage.hidden = true; detail.hidden = false;
    detail.scrollTop = 0; setState('detail'); controlsEnabled(false);
    if (focus) detail.querySelector('h1')?.focus({preventScroll:true});
  }
  function renderProjectFile(file, focus=false) {
    if(!['overview','engineering','evidence','stack'].includes(file))return;
    const project=projects[selected],host=$('#project-file-content');if(!project || !host)return;
    detailFile=file;
    detail.querySelectorAll('[data-project-file]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.projectFile===file)));
    const title={overview:'Overview',engineering:'Engineering decisions',evidence:'Evidence & limitations',stack:'Stack & links'}[file];
    let content='';
    if(file==='overview') content=`<div class="detail-cover">${artMarkup(project)}</div><h3>The problem</h3><p>${esc(project.problem || 'Details coming soon.')}</p>`;
    if(file==='engineering') content=`<p>${esc(project.approach || 'Engineering notes will appear here.')}</p>${(project.technicalNotes || []).map(note=>`<section><h3>${esc(note.title)}</h3><p>${esc(note.body)}</p></section>`).join('')}`;
    if(file==='evidence') content=`<p>${esc(project.outcomes || 'Evidence and limitations have not been supplied yet.')}</p><div class="detail-gallery">${(project.gallery || []).map(image=>typeof image==='string'?{url:image,alt:`${project.title} implementation screenshot`}:image).filter(image=>safeUrl(image.url)).map(image=>`<img src="${safeUrl(image.url)}" alt="${esc(image.alt)}" loading="lazy">`).join('')}</div>`;
    if(file==='stack') content=`<h3>Tools used</h3><p>${esc((project.technologies || []).join(' · ') || 'Not supplied yet.')}</p><div class="detail-links">${safeUrl(project.repositoryUrl)?`<a href="${safeUrl(project.repositoryUrl)}" target="_blank" rel="noopener noreferrer">REPOSITORY ↗</a>`:''}${safeUrl(project.liveUrl)?`<a href="${safeUrl(project.liveUrl)}" target="_blank" rel="noopener noreferrer">LIVE PROJECT ↗</a>`:''}</div>${!safeUrl(project.repositoryUrl)&&!safeUrl(project.liveUrl)?'<p class="file-muted">No public links have been added yet.</p>':''}`;
    host.innerHTML=`<h2 tabindex="-1">${title}</h2>${content}`;
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
    objectPanel.setAttribute('aria-label',view==='journey'?'My journey':view==='resume'?'Resume':view==='bookshelf'?'Reading and notes':'Contact');
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
    if (lamp !== 'dark' || state !== 'room') return;
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
      setActiveVideo(videos.lit); setLamp('lit'); lampButton.setAttribute('aria-pressed','true'); lampButton.setAttribute('aria-label','Desk lamp is on');
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
    const buttons = [...host.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled)')].filter(el=>el.tabIndex>=0 && el.getClientRects().length > 0 && !el.closest('[hidden]'));
    if (!buttons.length) return;
    const index = buttons.indexOf(document.activeElement);
    if (event.shiftKey && index <= 0) { event.preventDefault(); buttons.at(-1).focus(); }
    else if (!event.shiftKey && (index < 0 || index === buttons.length-1)) { event.preventDefault(); buttons[0].focus(); }
  }
  monitorButton.addEventListener('click',()=>navigate('projects'));
  mobileButton.addEventListener('click',()=>navigate('projects'));
  aboutButton.addEventListener('click',()=>navigate('about'));
  mobileAbout.addEventListener('click',()=>navigate('about'));
  objectViews.forEach(name=> {
    for(const button of [sectionButton(name),sectionShortcut(name)]) button.addEventListener('click',()=>{returnControls[name]=button;navigate(name);});
  });
  objectPanel.addEventListener('click',event=> { if(event.target.closest('[data-back-room]')) goBack('room'); });
  aboutStage.addEventListener('click',event=> { if(event.target.closest('[data-back-room]')) goBack('room'); });
  lampButton.addEventListener('click',lightLamp);
  stage.addEventListener('click',event=> {
    if (event.target.closest('[data-back-room]')) return goBack('room');
    const arrow = event.target.closest('[data-direction]');
    if (arrow) return updateSelection(selected+(arrow.dataset.direction === 'next' ? 1 : -1));
    const card = event.target.closest('[data-project]'); if (card) navigate('detail',card.dataset.project);
  });
  detail.addEventListener('click',event=> {
    if (event.target.closest('[data-back-list]')) goBack('projects');
    const file=event.target.closest('[data-project-file]');if(file)renderProjectFile(file.dataset.projectFile,true);
  });
  addEventListener('keydown',event=> {
    trapFocus(event);
    if (state === 'projects' && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); updateSelection(selected+(event.key === 'ArrowRight' ? 1 : -1)); }
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
  });
  scene.addEventListener('pointermove',event=> {
    if (!drag) return;
    roomFrame.x = Math.max(innerWidth-SOURCE.width*roomFrame.scale,Math.min(0,drag.start+event.clientX-drag.x));
    panCenter = (innerWidth/2-roomFrame.x)/roomFrame.scale; world.style.transform = transform(roomFrame);
    if (Math.abs(event.clientX-drag.x)>10) app.classList.add('has-panned');
  });
  scene.addEventListener('pointerup',()=>{drag=null;}); scene.addEventListener('pointercancel',()=>{drag=null;});
  // Native horizontal swipe also updates the miniature's selected card.
  stage.addEventListener('scrollend',event=> {
    if (!phone() || state !== 'projects' || !event.target.matches('.project-track')) return;
    const track = event.target, center = track.getBoundingClientRect().left+track.clientWidth/2;
    const cards = [...track.querySelectorAll('.pixel-card')];
    const closest = cards.reduce((best,card)=> Math.abs(card.getBoundingClientRect().left+card.clientWidth/2-center)<Math.abs(best.getBoundingClientRect().left+best.clientWidth/2-center) ? card : best,cards[0]);
    const index = projects.findIndex(p=>p.id === closest?.dataset.projectId); if (index>=0 && index !== selected) updateSelection(index,false);
  },true);
  function loadImage(url) { return new Promise((resolve,reject)=> {const image = new Image(); image.onload=()=>resolve(image); image.onerror=reject; image.src=url;}); }
  async function init() {
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
  }
  init().catch(()=> { $('#announcer').textContent = 'Studio assets could not load. Please refresh the page.'; });
})();
