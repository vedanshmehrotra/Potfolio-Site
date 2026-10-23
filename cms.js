(() => {
  // The public scene keeps its existing adapters. One API snapshot feeds every
  // miniature and expanded view; failed configured reads never reveal drafts.
  const local=['127.0.0.1','localhost'].includes(location.hostname);
  if(local && document.querySelector('meta[name="studio-content-source"]')?.content!=='api')return;
  let snapshot;
  const draft=new URLSearchParams(location.search).get('preview')==='draft';
  const read=()=>snapshot ||= fetch(`/api/content${draft?'?draft=1':''}`,{cache:'no-store',signal:AbortSignal.timeout(15000)}).then(async response=>{if(!response.ok)throw new Error('Content unavailable');const result=await response.json();window.studioContactReady=!!result.contactAvailable;if(result.draft){const note=document.createElement('a');note.textContent='DRAFT PREVIEW · OWNER ONLY';note.href='/admin';Object.assign(note.style,{position:'fixed',left:'8px',top:'8px',zIndex:99,background:'#102b27',color:'#fff0ba',padding:'5px',font:'18px StudioPixel,monospace'});document.body.append(note);}return result;});
  for(const [key,repository,method] of [
    ['projects','projectRepository','listPublished'],['about','aboutRepository','getPublished'],
    ['journey','journeyRepository','listPublished'],['resume','resumeRepository','getPublished'],['notes','notesRepository','listPublished']
  ]){
    const fallback=window[repository][method].bind(window[repository]);
    window[repository][method]=async()=>{const result=await read();return result.configured?result.sections[key]??(method==='listPublished'?[]:null):fallback();};
  }
})();
