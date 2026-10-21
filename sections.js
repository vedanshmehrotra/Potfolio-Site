(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => {
    try { const url = new URL(value,location.href); return value && ['http:','https:'].includes(url.protocol) ? esc(url.href) : ''; }
    catch { return ''; }
  };
  const positions = [[17,29,-4],[50,27,3],[83,30,-3],[83,75,4],[50,73,-3],[17,75,3]];
  let milestones = [], journeyError = false, page = 0, selectedId = null;
  let resume=null,resumeError=false,resumePage=0;
  let notes=[],notesError=false,selectedNote=null;
  let draft={name:'',email:'',message:'',company:''},sending=false,contactStatus='';
  let sectionEvents;
  const header = (title,file,extra='') => `<header class="object-header"><button type="button" data-back-room aria-label="Back to studio">&lt; STUDIO</button><span>${file}</span>${extra}</header><h1 id="object-title" tabindex="-1">${title}</h1>`;
  function pinArt(record,index) {
    const url = safeUrl(record.imageUrl);
    if (url) return `<img src="${url}" alt="${esc(record.imageAlt)}" loading="lazy">`;
    // Viewports onto the existing board photographs. No new artwork is generated.
    const crops = [[575,158,55,49],[674,196,38,45],[894,109,43,46]];
    const [x,y,w,h] = crops[index%3];
    return `<svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="./assets/studio-lit.png" width="1672" height="942"/></svg>`;
  }
  function journeyMarkup() {
    const visible = milestones.slice(page*6,page*6+6), pages = Math.ceil(milestones.length/6);
    const pins = visible.map((record,index)=> {
      const [x,y,angle] = positions[index];
      return `<button type="button" class="journey-pin" data-milestone="${esc(record.id)}" aria-pressed="${selectedId===record.id}" aria-controls="milestone-detail" style="--x:${x}%;--y:${y}%;--angle:${angle}deg"><span class="pin-head" aria-hidden="true"></span><span class="pin-photo">${pinArt(record,index)}</span><span class="pin-title">${esc(record.title)}</span>${record.preview ? '<span class="pin-preview">PREVIEW</span>' : `<span class="pin-preview">${esc(record.date || record.kind)}</span>`}</button>`;
    }).join('');
    // A serpentine path preserves chronological reading order across each row.
    const order = visible.map((_,index)=>index);
    const points = order.map(index=>`${positions[index][0]*10},${positions[index][1]*7.2-65}`).join(' ');
    return `<div class="object-shell journey-shell">${header('My journey','JOURNEY / FIELD NOTES')}<p class="object-intro">Follow the red thread. Point, focus, or tap a pinned memory.</p><div class="journey-board" aria-label="Journey board"><svg class="journey-thread" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}"/></svg>${pins}${!visible.length ? `<p class="board-empty">${journeyError ? 'Journey unavailable. Please try again later.' : 'The first chapter is still to come.'}</p>` : ''}</div><nav class="board-navigation" aria-label="Journey pages"><span>${milestones.some(m=>m.preview) ? 'SAMPLE PINS / CONTENT TO COME' : `${milestones.length} PINNED MEMORIES`}</span>${pages>1 ? `<button type="button" data-board-page="-1" ${page===0?'disabled':''} aria-label="Previous journey page">&lt;</button><span>${page+1} / ${pages}</span><button type="button" data-board-page="1" ${page===pages-1?'disabled':''} aria-label="Next journey page">&gt;</button>` : ''}</nav><section id="milestone-detail" class="milestone-detail" aria-label="Selected milestone" aria-live="polite"></section></div>`;
  }
  function selectMilestone(host,id) {
    const record = milestones.find(item=>item.id===id);
    if (!record) return;
    selectedId = id;
    host.querySelectorAll('[data-milestone]').forEach(pin=>pin.setAttribute('aria-pressed',String(pin.dataset.milestone===id)));
    host.querySelector('#milestone-detail').innerHTML = `<div><span class="file-label">${esc(record.preview?'LAYOUT PREVIEW':record.date || record.kind)}</span><h2>${esc(record.title)}</h2>${record.result ? `<strong class="milestone-result">${esc(record.result)}</strong>` : ''}</div><div><p>${esc(record.summary)}</p><p>${esc(record.description)}</p></div>`;
  }
  function activateJourney(host) {
    const first = milestones.slice(page*6,page*6+6).find(item=>item.id===selectedId) || milestones[page*6];
    if (first) selectMilestone(host,first.id);
    host.onclick = event => {
      const pin = event.target.closest('[data-milestone]');
      if (pin) selectMilestone(host,pin.dataset.milestone);
      const control = event.target.closest('[data-board-page]');
      if (control && !control.disabled) {
        page += Number(control.dataset.boardPage); host.innerHTML=journeyMarkup(); window.studioSections.activate('journey',host);
        host.querySelector('[data-milestone]')?.focus();
      }
    };
    host.addEventListener('focusin',event=> { const pin=event.target.closest('[data-milestone]'); if(pin) selectMilestone(host,pin.dataset.milestone); },{signal:sectionEvents.signal});
    host.onpointerover = event=> { if(event.pointerType==='touch') return; const pin=event.target.closest('[data-milestone]'); if(pin) selectMilestone(host,pin.dataset.milestone); };
  }
  function resumeMarkup() {
    const download=safeUrl(resume?.downloadUrl);
    return `<div class="object-shell resume-shell">${header('Resume','RESUME / PERSONAL JOURNAL',download ? `<a class="resume-download" href="${download}" download="${esc(resume.downloadName || 'resume.pdf')}">DOWNLOAD PDF ↓</a>` : '<button class="resume-download" type="button" disabled title="A public PDF has not been connected yet">PDF NOT CONNECTED</button>')}<div class="journal"><aside class="journal-index"><span class="file-label">CONTENTS</span><nav aria-label="Resume chapters">${(resume?.sections || []).map((section,index)=>`<button type="button" data-resume-page="${index}" ${index===resumePage?'aria-current="page"':''}>${String(index+1).padStart(2,'0')} / ${esc(section.title)}</button>`).join('')}</nav><span class="journal-spine" aria-hidden="true">AFTER HOURS</span></aside><article class="journal-page" aria-label="Resume page"><header><span>${resume?.preview?'LAYOUT PREVIEW':'PERSONAL FILE'}</span><span id="resume-page-count"></span></header><p class="resume-name">${esc(resume?.name || 'Resume')}</p><p class="resume-role">${esc(resume?.role)}</p><div id="resume-page-content"></div></article></div></div>`;
  }
  function selectResumePage(host,index,focus=false) {
    const section=resume?.sections[index];
    const content=host.querySelector('#resume-page-content');
    if(!section) { content.innerHTML=`<h2>${resumeError?'Resume unavailable':'Resume coming soon'}</h2><p>${resumeError?'Please try again later.':'The next page is still being written.'}</p>`;return; }
    resumePage=index;
    host.querySelectorAll('[data-resume-page]').forEach(button=> { if(Number(button.dataset.resumePage)===index)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current'); });
    host.querySelector('#resume-page-count').textContent=`${index+1} / ${resume.sections.length}`;
    content.innerHTML=`<h2 tabindex="-1">${esc(section.title)}</h2>${section.entries.map(entry=>`<section><h3>${esc(entry.heading)}</h3>${entry.meta?`<p class="resume-meta">${esc(entry.meta)}</p>`:''}${entry.body.map(text=>`<p>${esc(text)}</p>`).join('')}</section>`).join('')}`;
    if(focus) content.querySelector('h2').focus({preventScroll:true});
  }
  function activateResume(host) {
    selectResumePage(host,resumePage);
    host.onclick=event=> { const button=event.target.closest('[data-resume-page]');if(button)selectResumePage(host,Number(button.dataset.resumePage),true); };
  }
  function contactMarkup() {
    return `<div class="object-shell contact-shell">${header('Contact','POSTBOX / NEW MESSAGE')}<div class="mail-window"><div class="mail-title"><span aria-hidden="true">▣</span> STUDIO MAIL <span aria-hidden="true">─ □</span></div><form id="contact-form"><p class="mail-recipient"><span>TO</span> Studio inbox</p><p class="mail-note">A project, a hello, or a little feedback.</p><label for="contact-name">YOUR NAME <span>(optional)</span></label><input id="contact-name" name="name" autocomplete="name" maxlength="100" value="${esc(draft.name)}"><label for="contact-email">REPLY EMAIL <span>(optional)</span></label><input id="contact-email" name="email" type="email" autocomplete="email" maxlength="254" value="${esc(draft.email)}" aria-describedby="reply-note"><p id="reply-note" class="field-note">Leave this if you would like a reply.</p><label for="contact-message">MESSAGE <span>(required)</span></label><textarea id="contact-message" name="message" required minlength="2" maxlength="3000" rows="6" aria-describedby="message-count">${esc(draft.message)}</textarea><div class="contact-trap" aria-hidden="true"><label for="contact-company">Leave blank</label><input id="contact-company" name="company" tabindex="-1" autocomplete="off"></div><footer class="mail-actions"><span id="message-count">${draft.message.length} / 3000</span><button type="submit" ${sending?'disabled':''}>${sending?'SENDING…':'SEND MESSAGE →'}</button></footer><p id="contact-status" role="status" aria-live="polite">${esc(contactStatus || 'Delivery will be connected during backend setup.')}</p></form></div></div>`;
  }
  function activateContact(host) {
    const form=host.querySelector('form');
    form.oninput=()=> {
      draft=Object.fromEntries(new FormData(form));
      host.querySelector('#message-count').textContent=`${draft.message.length} / 3000`;
    };
    form.onsubmit=async event=> {
      event.preventDefault();if(sending)return;
      draft=Object.fromEntries(new FormData(form));
      if(draft.message.trim().length<2) { form.elements.message.setCustomValidity('Please write a message with at least two characters.');form.elements.message.reportValidity();return; }
      sending=true;const button=form.querySelector('[type=submit]'),status=host.querySelector('#contact-status');
      button.disabled=true;button.textContent='SENDING…';form.setAttribute('aria-busy','true');
      contactStatus='Sending your message…';status.textContent=contactStatus;
      try {
        await window.contactRepository.send({...draft});
        draft={name:'',email:'',message:'',company:''};form.reset();
        // reset() restores default markup values, so explicitly clear the draft.
        [...form.elements].filter(el=>['INPUT','TEXTAREA'].includes(el.tagName)).forEach(el=>el.value='');
        host.querySelector('#message-count').textContent='0 / 3000';
        contactStatus='Message sent. Thank you for writing.';
      } catch(error) { contactStatus=error.name==='TimeoutError'?'Delivery timed out. Your draft is still here.':error.message; }
      finally {
        sending=false;button.disabled=false;button.textContent='SEND MESSAGE →';form.removeAttribute('aria-busy');status.textContent=contactStatus;
        if(host.dataset.section==='contact' && !host.hidden && host.querySelector('form')!==form) {
          host.innerHTML=contactMarkup();activateContact(host);
        }
      }
    };
    form.elements.message.addEventListener('input',()=>form.elements.message.setCustomValidity(''));
  }
  function bookshelfMarkup() {
    return `<div class="object-shell bookshelf-shell">${header('Reading & notes','SHELF / COLLECTED PAGES')}<p class="object-intro">A small collection of things learned and things to return to.</p><div class="notes-cabinet"><nav class="notes-index" aria-label="Shelf entries">${notes.map((note,index)=>`<button type="button" data-note="${esc(note.id)}" style="--book-color:${['#466c61','#715b46','#4d627b'][index%3]}"><span class="note-number">${String(index+1).padStart(2,'0')}</span><span>${esc(note.title)}<small>${esc(note.preview?'LAYOUT PREVIEW':note.category)}</small></span></button>`).join('') || `<p>${notesError?'Notes unavailable. Please try again later.':'The first note is still to come.'}</p>`}</nav><article class="note-page" id="note-page" aria-label="Selected note"></article></div></div>`;
  }
  function selectNote(host,id,focus=false) {
    const note=notes.find(record=>record.id===id);if(!note)return;selectedNote=id;
    host.querySelectorAll('[data-note]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.note===id)));
    host.querySelector('#note-page').innerHTML=`<span class="file-label">${esc(note.preview?'LAYOUT PREVIEW':note.category)}</span><h2 tabindex="-1">${esc(note.title)}</h2><p class="note-summary">${esc(note.summary)}</p><p>${esc(note.body)}</p>${safeUrl(note.sourceUrl)?`<a href="${safeUrl(note.sourceUrl)}" target="_blank" rel="noopener noreferrer">ORIGINAL SOURCE ↗</a>`:''}`;
    if(focus)host.querySelector('#note-page h2').focus({preventScroll:true});
  }
  function activateBookshelf(host) {
    if(notes.length)selectNote(host,notes.find(note=>note.id===selectedNote)?.id || notes[0].id);
    host.onclick=event=> {const button=event.target.closest('[data-note]');if(button)selectNote(host,button.dataset.note,true);};
  }
  window.studioSections = {
    targets:{journey:{x:536,y:32,width:470,height:278},resume:{x:248,y:657,width:315,height:110},contact:{x:549,y:677,width:90,height:50},bookshelf:{x:38,y:121,width:258,height:112}},
    async load() {
      try { milestones=(await window.journeyRepository.listPublished()).filter(record=>record.status==='published').sort((a,b)=>a.sortOrder-b.sortOrder); }
      catch { journeyError=true; }
      try {const record=await window.resumeRepository.getPublished();resume=record?.status==='published'?record:null;}
      catch {resumeError=true;}
      try {notes=(await window.notesRepository.listPublished()).filter(record=>record.status==='published').sort((a,b)=>a.sortOrder-b.sortOrder);}
      catch {notesError=true;}
    },
    render:view=>view==='journey' ? journeyMarkup() : view==='resume'?resumeMarkup():view==='bookshelf'?bookshelfMarkup():contactMarkup(),
    activate(view,host) {
      sectionEvents?.abort();sectionEvents=new AbortController();
      host.onclick=null;host.onfocusin=null;host.onpointerover=null;
      if(view==='journey')activateJourney(host);else if(view==='resume')activateResume(host);else if(view==='bookshelf')activateBookshelf(host);else activateContact(host);
    }
  };
})();
