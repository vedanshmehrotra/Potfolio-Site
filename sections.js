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
  let contactErrors={};
  let sectionEvents;
  const header = (title,file,extra='') => `<header class="object-header"><button type="button" data-back-room aria-label="Back to studio">&lt; STUDIO</button><span>${file}</span>${extra}</header><h1 id="object-title" tabindex="-1">${title}</h1>`;
  function pinArt(record) {
    const url = safeUrl(record.imageUrl);
    if (url) return `<img src="${url}" alt="${esc(record.imageAlt)}" loading="lazy">`;
    // A small paper keeps unillustrated milestones readable. Admin-uploaded
    // photos use the branch above; these symbols never modify the room art.
    const symbols = {
      education:'<path d="M20 24h4v-4h4v-4h4v-4h4v4h4v4h4v4h4v4H20zM24 30h20v14H24z"/><path fill="#d9caa4" d="M28 32h4v8h-4zM36 32h4v8h-4z"/>',
      experience:'<path d="M28 16h16v6h10v24H18V22h10zm4 4v2h8v-2z"/><path fill="#d9caa4" d="M18 30h36v4H18zM32 30h8v8h-8z"/>',
      achievement:'<path d="M24 12h8v8h-8zM40 12h8v8h-8zM28 20h16v4H28zM28 24h16v4h4v12h-4v4H28v-4h-4V28h4z"/><path fill="#d9caa4" d="M32 28h8v4h4v4h-4v4h-8v-4h-4v-4h4z"/>',
      project:'<path d="M20 24h8v4h-4v8h4v4h-8v-4h-4v-8h4zM44 24h8v4h4v8h-4v4h-8v-4h4v-8h-4zM34 20h4v24h-4z"/>',
      club:'<path d="M34 10h4v8h12v24H22V18h12zM18 26h4v12h-4zM50 26h4v12h-4zM26 42h8v4h-8zM38 42h8v4h-8z"/><path fill="#d9caa4" d="M28 24h4v6h-4zM40 24h4v6h-4zM30 34h14v4H30z"/>'
    };
    const kind = record.id === 'robotics-club' ? 'club' : (Object.hasOwn(symbols,record.kind) ? record.kind : 'achievement');
    return `<svg class="pin-document" data-pin-kind="${kind}" viewBox="0 0 80 56" preserveAspectRatio="xMidYMid meet" shape-rendering="crispEdges" aria-hidden="true"><path fill="#c6b88e" d="M6 3h68v50H6z"/><path fill="#e2d3ac" d="M10 3h60v46H10z"/><path fill="#8e9577" d="M10 3h60v5H10z"/><g fill="${kind==='experience'?'#65503d':kind==='achievement'?'#926b34':'#49666a'}">${symbols[kind]}</g><path fill="#aa9d7b" d="M58 17h8v3h-8zM58 25h8v3h-8zM58 33h8v3h-8z"/></svg>`;
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
    return `<div class="object-shell journey-shell">${header('My journey','JOURNEY / FIELD NOTES')}
      <p class="object-intro">Follow the red thread. Learning, responsibility, and the steps that shaped my work.</p>
      <div class="journey-workspace"><div class="journey-board-region">
        <div class="journey-board" aria-label="Journey board"><svg class="journey-thread" viewBox="0 0 1000 720" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}"/></svg>${pins}${!visible.length ? `<p class="board-empty">${journeyError ? 'Journey unavailable. Please try again later.' : 'The first chapter is still to come.'}</p>` : ''}</div>
        <nav class="board-navigation" aria-label="Journey pages"><span>${milestones.some(m=>m.preview) ? 'SAMPLE PINS / CONTENT TO COME' : `${milestones.length} PINNED CHAPTERS`}</span>${pages>1 ? `<button type="button" data-board-page="-1" ${page===0?'disabled':''} aria-label="Previous journey page">&lt;</button><span>${page+1} / ${pages}</span><button type="button" data-board-page="1" ${page===pages-1?'disabled':''} aria-label="Next journey page">&gt;</button>` : ''}</nav>
      </div><section id="milestone-detail" class="milestone-detail" aria-label="Selected milestone" aria-live="polite"></section></div></div>`;
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
      if (pin) {window.studioAudio?.play('paper');selectMilestone(host,pin.dataset.milestone);}
      const control = event.target.closest('[data-board-page]');
      if (control && !control.disabled) {
        window.studioAudio?.play('shuffle');
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
    host.onclick=event=> {
      const button=event.target.closest('[data-resume-page]');
      if(button) {if(Number(button.dataset.resumePage)!==resumePage)window.studioAudio?.play('page');selectResumePage(host,Number(button.dataset.resumePage),true);}
      if(event.target.closest('.resume-download[href]'))window.studioAudio?.play('click');
    };
  }
  function contactError(field) {
    return `<p id="contact-${field}-error" class="field-error" ${contactErrors[field]?'':'hidden'}>${esc(contactErrors[field] || '')}</p>`;
  }
  function validateContactField(field,value) {
    if(field==='name')return value.length>100?'Keep your name within 100 characters.':'';
    if(field==='email')return value.length>254 || (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))?'Enter a valid reply email, or leave it blank.':'';
    return value.trim().length<2?'Write a message of at least 2 characters.':value.length>3000?'Keep your message within 3000 characters.':'';
  }
  function updateContactErrors(form) {
    for(const field of ['name','email','message']) {
      form.elements[field].setAttribute('aria-invalid',String(!!contactErrors[field]));
      const error=form.querySelector(`#contact-${field}-error`);
      error.textContent=contactErrors[field] || '';error.hidden=!contactErrors[field];
    }
  }
  function contactMarkup() {
    return `<div class="object-shell contact-shell">${header('Contact','POSTBOX / NEW MESSAGE')}<div class="mail-window"><div class="mail-title"><span aria-hidden="true">▣</span> STUDIO MAIL <span aria-hidden="true">─ □</span></div><form id="contact-form" novalidate${sending?' aria-busy="true"':''}><p class="mail-recipient"><span>TO</span> Studio inbox</p><p class="mail-note">A project, a hello, or a little feedback.</p><label for="contact-name">YOUR NAME <span>(optional)</span></label><input id="contact-name" name="name" autocomplete="name" maxlength="100" aria-describedby="contact-name-error" aria-invalid="${!!contactErrors.name}" value="${esc(draft.name)}">${contactError('name')}<label for="contact-email">REPLY EMAIL <span>(optional)</span></label><input id="contact-email" name="email" type="email" autocomplete="email" maxlength="254" value="${esc(draft.email)}" aria-describedby="reply-note contact-email-error" aria-invalid="${!!contactErrors.email}"><p id="reply-note" class="field-note">Leave this if you would like a reply.</p>${contactError('email')}<label for="contact-message">MESSAGE <span>(required)</span></label><textarea id="contact-message" name="message" required minlength="2" maxlength="3000" rows="6" aria-describedby="message-count contact-message-error" aria-invalid="${!!contactErrors.message}">${esc(draft.message)}</textarea>${contactError('message')}<div class="contact-trap" aria-hidden="true"><label for="contact-company">Leave blank</label><input id="contact-company" name="company" tabindex="-1" autocomplete="off"></div><footer class="mail-actions"><span id="message-count">${draft.message.length} / 3000</span><button type="submit" ${sending?'disabled':''}>${sending?'SENDING…':'SEND MESSAGE →'}</button></footer><p id="contact-status" role="status" aria-live="polite">${esc(contactStatus || (window.studioContactReady?'Your message goes to the studio inbox.':'Message delivery is unavailable right now.'))}</p></form></div></div>`;
  }
  function activateContact(host) {
    const form=host.querySelector('form');
    form.oninput=event=> {
      draft=Object.fromEntries(new FormData(form));
      host.querySelector('#message-count').textContent=`${draft.message.length} / 3000`;
      const field=event.target.name;
      if(contactErrors[field]) {contactErrors[field]=validateContactField(field,draft[field]);updateContactErrors(form);}
      if(contactStatus==='Please check the highlighted fields.' && !Object.values(contactErrors).some(Boolean)) {
        contactStatus='';host.querySelector('#contact-status').textContent='';
      }
    };
    form.onsubmit=async event=> {
      event.preventDefault();if(sending)return;
      draft=Object.fromEntries(new FormData(form));
      contactErrors=Object.fromEntries(['name','email','message'].map(field=>[field,validateContactField(field,draft[field])]));
      updateContactErrors(form);
      const invalid=['name','email','message'].find(field=>contactErrors[field]);
      if(invalid) {
        contactStatus='Please check the highlighted fields.';host.querySelector('#contact-status').textContent=contactStatus;
        form.elements[invalid].focus();return;
      }
      sending=true;const button=form.querySelector('[type=submit]'),status=host.querySelector('#contact-status');
      button.disabled=true;button.textContent='SENDING…';form.setAttribute('aria-busy','true');
      contactStatus='Sending your message…';status.textContent=contactStatus;
      try {
        await window.contactRepository.send({...draft});
        draft={name:'',email:'',message:'',company:''};contactErrors={};form.reset();updateContactErrors(form);
        // reset() restores default markup values, so explicitly clear the draft.
        [...form.elements].filter(el=>['INPUT','TEXTAREA'].includes(el.tagName)).forEach(el=>el.value='');
        host.querySelector('#message-count').textContent='0 / 3000';
        contactStatus='Message sent. Thank you for writing.';
        window.studioAudio?.play('sent');
      } catch(error) { contactStatus=error.name==='TimeoutError'?'Delivery timed out. Your draft is still here.':error.message; }
      finally {
        sending=false;button.disabled=false;button.textContent='SEND MESSAGE →';form.removeAttribute('aria-busy');status.textContent=contactStatus;
        if(host.dataset.section==='contact' && !host.hidden && host.querySelector('form')!==form) {
          host.innerHTML=contactMarkup();activateContact(host);
        }
      }
    };
  }
  function bookshelfMarkup() {
    return `<div class="object-shell bookshelf-shell">${header('Certifications & learning','SHELF / CREDENTIAL FILES')}<p class="object-intro">Training badges, certificates and notes from the things I have been learning.</p><div class="notes-cabinet"><nav class="notes-index" aria-label="Shelf entries">${notes.map((note,index)=>`<button type="button" data-note="${esc(note.id)}" style="--book-color:${['#466c61','#715b46','#4d627b'][index%3]}"><span class="note-number">${String(index+1).padStart(2,'0')}</span><span>${esc(note.title)}<small>${esc(note.preview?'LAYOUT PREVIEW':note.category)}</small></span></button>`).join('') || `<p>${notesError?'Shelf unavailable. Please try again later.':'The first entry is still to come.'}</p>`}</nav><article class="note-page" id="note-page" aria-label="Selected shelf entry"></article></div></div>`;
  }
  function selectNote(host,id,focus=false) {
    const note=notes.find(record=>record.id===id);if(!note)return;selectedNote=id;
    host.querySelectorAll('[data-note]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.note===id)));
    const credential=note.credentialType&&note.credentialType!=='note';
    const type={'training-badge':'Training badge','skill-badge':'Skill badge','course-certificate':'Course certificate',certification:'Certification'}[note.credentialType];
    const metadata=credential?`<dl class="credential-meta">${[['Issuer',note.issuer],['Completed',note.issuedAt],['Type',type],['Credential ID',note.credentialId]].filter(([,value])=>value).map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`:'';
    const image=credential&&safeUrl(note.imageUrl)?`<img class="credential-image" src="${safeUrl(note.imageUrl)}" alt="${esc(note.imageAlt||note.title)}" width="112" height="112" loading="lazy">`:'';
    host.querySelector('#note-page').innerHTML=`<span class="file-label">${esc(note.preview?'LAYOUT PREVIEW':note.category)}</span><h2 tabindex="-1">${esc(note.title)}</h2>${image}<p class="note-summary">${esc(note.summary)}</p>${metadata}<p class="credential-body">${esc(note.body)}</p><div class="credential-links">${safeUrl(note.sourceUrl)?`<a href="${safeUrl(note.sourceUrl)}" target="_blank" rel="noopener noreferrer">${credential?'VERIFY CREDENTIAL':'ORIGINAL SOURCE'} ↗</a>`:''}${credential&&safeUrl(note.certificateUrl)?`<a href="${safeUrl(note.certificateUrl)}" target="_blank" rel="noopener noreferrer">VIEW CERTIFICATE ↗</a>`:''}</div>`;
    if(focus)host.querySelector('#note-page h2').focus({preventScroll:true});
  }
  function activateBookshelf(host) {
    if(notes.length)selectNote(host,notes.find(note=>note.id===selectedNote)?.id || notes[0].id);
    host.onclick=event=> {const button=event.target.closest('[data-note]');if(button){if(button.dataset.note!==selectedNote)window.studioAudio?.play('page');selectNote(host,button.dataset.note,true);}};
  }
  window.studioSections = {
    targets:{
      journey:{x:536,y:32,width:470,height:278,hitPolygon:[[0,0],[458,76],[458,272],[0,272]]},
      resume:{x:248,y:657,width:315,height:110,hitBounds:{x:244,y:650,width:320,height:120},hitPolygon:[[9,28],[30,24],[51,21],[75,18],[98,15],[123,13],[148,11],[156,13],[171,10],[191,7],[214,5],[224,8],[241,21],[258,33],[277,47],[295,59],[311,68],[314,75],[305,80],[285,83],[263,87],[242,91],[219,94],[198,98],[176,102],[154,106],[132,110],[110,114],[89,115],[81,110],[77,102],[68,99],[64,92],[55,88],[50,81],[42,77],[36,69],[28,65],[23,57],[15,52],[12,44],[5,39],[4,33]]},
      contact:{x:549,y:677,width:90,height:50,hitPolygon:[[10,5],[43,0],[88,32],[88,40],[45,48],[3,15]]},
      bookshelf:{x:38,y:121,width:258,height:112,hitBounds:{x:125,y:110,width:144,height:115},hitPolygon:[[14,9],[34,13],[34,3],[54,7],[54,11],[64,13],[64,9],[83,13],[83,21],[105,24],[105,13],[126,17],[126,24],[141,27],[142,112],[126,111],[105,108],[83,105],[61,103],[35,101],[14,99]]}
    },
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
