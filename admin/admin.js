(() => {
  'use strict';
  const desk=document.querySelector('#desk'),status=document.querySelector('#desk-status');
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const names={projects:'Projects',about:'About me',journey:'Journey',resume:'Resume',notes:'Certifications & learning'};
  let records={},active='projects',selected=0,dirty=false,busy=false,issues=[],fieldId=0,mailConnected=false;
  const announce=message=>{status.textContent=message;};
  async function request(url,{method='GET',data}={}){
    const response=await fetch(url,{method,credentials:'same-origin',cache:'no-store',...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
    const result=await response.json().catch(()=>null);
    if(!response.ok){const error=new Error(result?.error?.message || result?.message || result?.error || 'The request failed. Please try again.');error.status=response.status;error.issues=result?.issues;throw error;}return result;
  }
  function login(){
    desk.setAttribute('aria-busy','false');desk.innerHTML=`<section class="login" aria-labelledby="login-title"><h2 id="login-title">OWNER SIGN-IN</h2><p>Private desk. Public registration is closed.</p><form id="login-form" novalidate><label for="owner-email">EMAIL</label><input id="owner-email" name="email" type="email" autocomplete="username" required><label for="owner-password">PASSWORD</label><input id="owner-password" name="password" type="password" autocomplete="current-password" required><button type="submit">OPEN DESK &gt;</button><button type="button" class="reset-button" id="reset-password">FIRST LOGIN / RESET PASSWORD</button></form><p>For your first login, enter your owner email and request a private password link.</p></section>`;
    document.querySelector('#login-form').onsubmit=async event=>{
      event.preventDefault();const email=document.querySelector('#owner-email'),password=document.querySelector('#owner-password');
      if(!email.validity.valid || !password.value){announce('Enter your email and password.');(!email.validity.valid?email:password).focus();return;}
      setBusy(true);try{await request('/api/auth/sign-in/email',{method:'POST',data:{email:email.value,password:password.value}});password.value='';await load();announce('Owner desk open.');}catch(error){announce('Sign-in failed. Check your credentials or use the password link.');}finally{setBusy(false);}
    };
    document.querySelector('#reset-password').onclick=async()=>{
      const email=document.querySelector('#owner-email');if(!email.validity.valid || !email.value){announce('Enter your owner email first.');email.focus();return;}
      setBusy(true);try{await request('/api/auth/request-password-reset',{method:'POST',data:{email:email.value,redirectTo:'/admin/reset.html'}});announce('If this is the owner address, a password link will arrive shortly.');}catch(error){announce('The password email could not be sent. Mail setup may still be pending.');}finally{setBusy(false);}
    };
  }
  function setBusy(value){busy=value;desk.setAttribute('aria-busy',String(value));desk.querySelectorAll('button').forEach(button=>{button.disabled=value || button.dataset.savedOnly==='true'&&dirty;});}
  function valueAt(path){return path.reduce((value,key)=>value?.[key],records[active].draft);}
  function setAt(path,value){const parent=valueAt(path.slice(0,-1));parent[path.at(-1)]=value;dirty=true;issues=[];const note=document.querySelector('#edit-state');if(note)note.textContent='Unsaved edits';desk.querySelectorAll('[data-saved-only]').forEach(button=>{button.disabled=true;});}
  const f=(key,label,type='text',extra={})=>({key,label,type,...extra});
  const entry=[f('heading','Heading'),f('meta','Dates / subtitle'),f('body','Paragraphs','lines')];
  const projectNote=[f('title','Short heading'),f('body','One-sentence explanation','long')];
  const models={
    projects:[f('title','Project title'),f('slug','URL slug'),f('shortSummary','Card summary'),f('coverImage','Cover image','image'),f('tags','Card labels','lines'),f('technologies','Technology stack','lines'),f('problem','Short introduction','long'),f('highlights','At a glance','objects',{fields:projectNote,create:()=>({title:'New highlight',body:''})}),f('flow','How it works: steps','lines'),f('approach','How it works: introduction','long'),f('technicalNotes','Engineering notes','objects',{fields:projectNote,create:()=>({title:'New decision',body:''})}),f('outcomes','Supporting notes (one per line)','long'),f('gallery','Project pictures','objects',{fields:[f('url','Image','image'),f('alt','Caption / image description')],create:()=>({url:'',alt:''})}),f('repositoryUrl','Repository link'),f('liveUrl','Live project link'),f('featured','Featured project','check')],
    about:[f('title','Heading'),f('role','Role / subtitle'),f('bio','About you','long'),f('focus','Curiosities (one per line)','lines'),f('toolkit','Off the clock (one per line)','lines'),f('note','Footer note'),f('links','Social links','objects',{fields:[f('label','Label'),f('url','HTTPS link')],create:()=>({label:'New link',url:''})})],
    journey:[f('title','Milestone title'),f('date','Date / period'),f('kind','Chapter type','select',{choices:['education','project','experience','achievement']}),f('summary','Short summary'),f('description','The story','long'),f('result','Supporting result (optional)'),f('imageUrl','Pinned image','image'),f('imageAlt','Image description')],
    resume:[f('name','Your name'),f('role','Role / subtitle'),f('downloadUrl','Downloadable resume','pdf'),f('downloadName','Download filename'),f('sections','Journal chapters','objects',{fields:[f('id','Chapter ID'),f('title','Chapter title'),f('entries','Entries','objects',{fields:entry,create:()=>({heading:'New entry',meta:'',body:['']})})],create:()=>({id:`chapter-${crypto.randomUUID().slice(0,8)}`,title:'New chapter',entries:[]})})],
    notes:[f('title','Credential / entry title'),f('credentialType','Entry type','select',{choices:['note','certification','skill-badge','training-badge','course-certificate'],choiceLabels:{note:'Learning note',certification:'Certification','skill-badge':'Skill badge','training-badge':'Training badge','course-certificate':'Course certificate'}}),f('issuer','Issuer'),f('issuedAt','Issued / completed'),f('credentialId','Credential ID (optional)'),f('category','Topic / category'),f('summary','Short summary'),f('body','What you learned','long'),f('sourceUrl','Verification / source link'),f('imageUrl','Badge or certificate image','image'),f('imageAlt','Image description'),f('certificateUrl','Certificate PDF (optional)','pdf')]
  };
  function fields(definitions,prefix=[]){return definitions.map(field=>{
    const path=[...prefix,field.key],serialized=esc(JSON.stringify(path));let value=valueAt(path);const id=`field-${++fieldId}`;
    if(field.type==='objects'){
      if(active==='projects'&&field.key==='gallery'&&Array.isArray(value)&&value.some(item=>typeof item==='string')){value=value.map(item=>typeof item==='string'?{url:item,alt:''}:item);setAt(path,value);}
      return `<fieldset class="nested"><legend>${esc(field.label)}</legend>${(value||[]).map((_,index)=>`<div class="nested-item">${fields(field.fields,[...path,index])}<button class="small-button remove" type="button" data-remove="${esc(JSON.stringify([...path,index]))}">− REMOVE ITEM</button></div>`).join('')}<button class="small-button" type="button" data-add="${serialized}">+ ADD ITEM</button></fieldset>`;
    }
    const error=issues.find(issue=>JSON.stringify(issue.path)===JSON.stringify(path));const attrs=`id="${id}" data-path="${serialized}" ${error?`aria-invalid="true" aria-describedby="${id}-error"`:''}`;
    let input=field.type==='check'?`<input ${attrs} type="checkbox" ${value?'checked':''}>`:field.type==='select'?`<select ${attrs}>${field.choices.map(choice=>`<option value="${esc(choice)}" ${value===choice?'selected':''}>${esc(field.choiceLabels?.[choice]||choice)}</option>`).join('')}</select>`:['long','lines'].includes(field.type)?`<textarea ${attrs} rows="${field.type==='long'?5:3}">${esc(field.type==='lines'?(value||[]).join('\n'):value)}</textarea>`:`<input ${attrs} type="text" value="${esc(value)}" maxlength="${field.type==='image'||field.type==='pdf'?2000:12000}">`;
    const upload=['image','pdf'].includes(field.type)?`<div class="upload-row"><button type="button" data-upload="${serialized}" data-file-kind="${field.type}">UPLOAD ${field.type==='pdf'?'PDF':'IMAGE'}</button>${value&&/^(https:\/\/|\/api\/media\?|\.\/assets\/)/.test(value)?`<a href="${esc(value.startsWith('./')?'/'+value.slice(2):value)}" target="_blank" rel="noopener">VIEW FILE ↗</a>`:''}</div><p class="field-help">${field.type==='pdf'?'PDF':'PNG, JPEG or WebP'} · up to 4 MB. Uploads stay private until published.</p>`:'';
    return `<div class="field"><label for="${id}">${esc(field.label)}${field.type==='lines'?' · one per line':''}</label>${input}${error?`<p id="${id}-error" class="field-error">${esc(error.message)}</p>`:''}${upload}</div>`;
  }).join('');}
  function controls(prefix){return fields([f('status','Include in published section','select',{choices:['draft','published']}),...(active==='about'?[]:[f('preview','Mark as layout preview','check')]),...(Array.isArray(records[active].draft)?[f('sortOrder','Display order','number')]:[])],prefix);}
  function render(){
    fieldId=0;const record=records[active],collection=Array.isArray(record.draft),prefix=collection?[selected]:[];
    const item=collection?record.draft[selected]:record.draft;
    desk.innerHTML=`<div class="workspace"><div class="owner-strip"><p>OWNER DESK · <span>${mailConnected?'MAIL CONNECTED':'MAIL SETUP PENDING'}</span></p><div class="owner-actions"><a href="/?preview=draft" target="_blank" rel="noopener">PREVIEW DRAFT ↗</a><a href="/" target="_blank" rel="noopener">LIVE STUDIO ↗</a><button type="button" data-action="export">EXPORT BACKUP</button><button type="button" data-action="logout">SIGN OUT</button></div></div><nav class="section-nav" aria-label="Content sections">${Object.entries(names).map(([key,name])=>`<button type="button" data-section="${key}" ${active===key?'aria-current="page"':''}>${name}</button>`).join('')}</nav><section class="editor-frame" aria-labelledby="section-title"><header class="editor-top"><div><h2 id="section-title">${names[active]}</h2><p class="publication"><span id="edit-state">${dirty?'Unsaved edits':'Draft saved'}</span> · REV ${record.revision}${record.hasPublished?' · PUBLIC VERSION EXISTS':' · NOT PUBLISHED'}</p></div><div class="toolbar"><button type="button" data-action="save">SAVE DRAFT</button><button type="button" data-action="discard">DISCARD EDITS</button><button type="button" class="publish" data-action="publish" data-saved-only="true" ${dirty?'disabled':''}>PUBLISH</button><button type="button" data-action="unpublish" data-saved-only="true" ${dirty?'disabled':''}>UNPUBLISH</button></div></header><div class="editing">${collection?`<aside class="record-list" aria-label="${names[active]} records">${record.draft.map((item,index)=>`<button type="button" data-record="${index}" aria-pressed="${index===selected}">${esc(item.title)}<br><small>${esc(item.status.toUpperCase())}</small></button>`).join('')}<button class="new-record" type="button" data-action="new">+ NEW RECORD</button></aside>`:'<aside class="record-list"><p>PRIVATE DRAFT</p><p>Save first, then publish when ready.</p></aside>'}<div class="editor-fields">${item?`${fields(models[active],prefix)}<h3>Publication</h3>${controls(prefix)}${collection?'<button type="button" class="small-button remove" data-action="remove-record">− REMOVE FROM DRAFT</button>':''}`:'<p class="empty-record">No records yet. Add the first one to this draft.</p>'}</div></div></section><p class="private-note">SAVE DRAFT keeps changes private. PUBLISH replaces this section’s public version with the saved records marked “published”. A draft preview shows all saved records to the signed-in owner.</p><input id="upload-file" type="file"></div>`;
    desk.oninput=event=>{
      const input=event.target.closest('[data-path]');if(!input)return;
      const path=JSON.parse(input.dataset.path),definition=findDefinition(path);
      const old=valueAt(path);let value=input.type==='checkbox'?input.checked:definition?.type==='lines'?input.value.split('\n').filter(line=>line.trim()):path.at(-1)==='sortOrder'?Number(input.value):input.value;
      if(old===null && value==='')value=null;
      setAt(path,value);if(active==='projects'&&path.at(-1)==='coverImage')delete records[active].draft[path[0]].previewCrop;
    };
    desk.onclick=event=>click(event).catch(error=>announce(error.message || 'This action could not be completed.'));setBusy(busy);
  }
  function findDefinition(path){let definitions=models[active];for(const key of path){if(typeof key==='number')continue;const found=definitions.find(field=>field.key===key);if(!found)return null;if(key===path.at(-1))return found;definitions=found.fields||[];}return null;}
  function defaults(){const id=`record-${crypto.randomUUID().slice(0,8)}`;const base={id,title:'Untitled',status:'draft',preview:false,sortOrder:records[active].draft.length};return active==='projects'?{...base,slug:id,shortSummary:'',coverImage:null,tags:[],technologies:[],problem:'',approach:'',outcomes:'',gallery:[],repositoryUrl:null,liveUrl:null,featured:false}:active==='journey'?{...base,date:null,kind:'achievement',summary:'',description:'',result:null,imageUrl:null,imageAlt:''}:{...base,category:'CLOUD',summary:'',body:'',sourceUrl:null,credentialType:'training-badge',issuer:'',issuedAt:'',credentialId:'',imageUrl:null,imageAlt:'',certificateUrl:null};}
  async function load(){const result=await request('/api/admin');records=Object.fromEntries(result.sections.map(record=>[record.key,{...record,saved:clone(record.draft)}]));mailConnected=result.mailConnected;dirty=false;selected=0;issues=[];render();}
  async function click(event){
    const target=event.target.closest('button');if(!target||busy)return;
    if(target.dataset.section || target.dataset.record!==undefined){
      if(dirty){announce('Save or discard your edits before switching records.');return;}
      if(target.dataset.section){active=target.dataset.section;selected=0;}else selected=Number(target.dataset.record);issues=[];render();return;
    }
    if(target.dataset.add){const path=JSON.parse(target.dataset.add);const items=valueAt(path)||[];items.push(findDefinition(path).create());setAt(path,items);render();return;}
    if(target.dataset.remove){const path=JSON.parse(target.dataset.remove),items=valueAt(path.slice(0,-1));items.splice(path.at(-1),1);setAt(path.slice(0,-1),items);render();return;}
    if(target.dataset.upload){
      const fileInput=document.querySelector('#upload-file'),path=JSON.parse(target.dataset.upload);fileInput.accept=target.dataset.fileKind==='pdf'?'application/pdf':'image/png,image/jpeg,image/webp';
      fileInput.onchange=async()=>{const file=fileInput.files[0];if(!file)return;if(file.size>4000000){announce('Choose a file smaller than 4 MB.');return;}
        setBusy(true);announce('Uploading private file…');try{
          const response=await fetch(`/api/media?name=${encodeURIComponent(file.name)}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file,credentials:'same-origin'});const result=await response.json();if(!response.ok)throw new Error(result.error);
          setAt(path,result.url);if(active==='projects'&&path.at(-1)==='coverImage')delete records[active].draft[path[0]].previewCrop;
          if(active==='resume'&&path.at(-1)==='downloadUrl')records[active].draft.downloadName=file.name;
          announce('Private file uploaded. Save the draft before previewing or publishing.');render();
        }catch(error){announce(error.message || 'Upload failed. Your draft is unchanged.');}finally{setBusy(false);}
      };fileInput.click();return;
    }
    const action=target.dataset.action;if(!action)return;
    if(action==='new'){records[active].draft.push(defaults());selected=records[active].draft.length-1;dirty=true;render();return;}
    if(action==='remove-record'){records[active].draft.splice(selected,1);selected=Math.max(0,selected-1);dirty=true;render();announce('Removed from the local draft. Save and publish to change the public site.');return;}
    if(action==='discard'){records[active].draft=clone(records[active].saved);dirty=false;issues=[];selected=0;render();announce('Local edits discarded.');return;}
    if(action==='export'){const result=await request('/api/admin?export=1');const data=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),sections:result.sections,media:result.media},null,2)],{type:'application/json'});const url=URL.createObjectURL(data),link=document.createElement('a');link.href=url;link.download='after-hours-content-backup.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Content and file metadata exported. Uploaded file bytes are not included in this JSON backup.');return;}
    setBusy(true);try{
      if(action==='logout'){await request('/api/auth/sign-out',{method:'POST',data:{}});records={};dirty=false;login();announce('Signed out.');return;}
      if(action==='save'){
        announce('Saving draft…');
        const current=records[active],result=await request('/api/admin',{method:'PUT',data:{key:active,revision:current.revision,draft:current.draft}});current.revision=result.revision;current.saved=clone(current.draft);dirty=false;issues=[];render();announce('Draft saved privately. The public version is unchanged.');
      }else if(['publish','unpublish'].includes(action)){
        announce(action==='publish'?'Publishing…':'Unpublishing…');
        const current=records[active],result=await request('/api/admin',{method:'POST',data:{key:active,revision:current.revision,action}});current.revision=result.revision;current.hasPublished=action==='publish';render();announce(action==='publish'?'Published. Refresh the studio to see the saved version.':'Section unpublished. The private draft is retained.');
      }
    }catch(error){issues=error.issues||[];if(error.status===401){login();announce('Your session ended. Please sign in again.');}else{render();announce(error.message);}}finally{setBusy(false);}
  }
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  load().catch(error=>{login();if(error.status!==401)announce('Owner setup is not ready yet. Please try again after configuration.');});
})();
