/**
 * Public content adapters. Replace these methods with API reads when the CMS is
 * connected. Files live in object storage; records contain their URL and alt text.
 * @typedef {{id:string,title:string,date:string|null,kind:string,summary:string,
 * description:string,result:string|null,imageUrl:string|null,imageAlt:string,
 * sortOrder:number,status:'draft'|'published',preview?:boolean}} JourneyMilestone
 */
window.journeyRepository = {
  /** @returns {Promise<JourneyMilestone[]>} */
  async listPublished() {
    return [
      ['school', 'School', 'education', 'An early chapter. Class 10 or 12 results can sit inside these details, if you choose to include them.'],
      ['university', 'University', 'education', 'Starting university, finding a direction, and learning through the work. Results can be supporting details here.'],
      ['first-project', 'First project', 'project', 'A project that marked a new step: what you built, what challenged you, and what you learned.'],
      ['internship', 'Internship', 'experience', 'A role, a team, or a responsibility that moved your professional journey forward.'],
      ['milestone', 'Milestone', 'achievement', 'A meaningful achievement or a challenge overcome. Only add a chapter when there is something worth sharing.'],
      ['next-role', 'Next role', 'experience', 'Room for a future role or professional chapter. This is a placeholder, not a claimed job.']
    ].map(([id,title,kind,description],index) => ({
      id,title,kind,date:null,result:null,imageUrl:null,imageAlt:'',sortOrder:index,
      summary:'Layout preview', status:'published', preview:true,
      description
    }));
  }
};

/**
 * @typedef {{id:string,title:string,entries:{heading:string,meta?:string,body:string[]}[]}} ResumeSection
 * @typedef {{name:string,role:string,sections:ResumeSection[],downloadUrl:string|null,
 * downloadName:string,status:'draft'|'published',preview?:boolean}} ResumeDocument
 */
window.resumeRepository = {
  /** @returns {Promise<ResumeDocument|null>} */
  async getPublished() {
    return {
      name:'Vedansh Mehrotra',role:'AI / ML undergraduate',status:'published',preview:true,
      downloadUrl:'./assets/Vedansh-Mehrotra-CV.pdf',downloadName:'Vedansh-Mehrotra-CV.pdf',
      sections:[
        {id:'profile',title:'Profile',entries:[{heading:'A short introduction',body:['A readable, pixel typeset version of the resume lives in this journal. Final copy will be added later.']}]},
        {id:'education',title:'Education',entries:[{heading:'Education',meta:'CONTENT TO COME',body:['Degree, institution, and dates. The Journey board tells the broader professional story; academic results can remain supporting details.']}]},
        {id:'experience',title:'Experience',entries:[{heading:'Experience',meta:'CONTENT TO COME',body:['Role, organization, dates, and a few concise notes about the work.']}]},
        {id:'skills',title:'Skills',entries:[{heading:'Skills & training',meta:'CONTENT TO COME',body:['Languages, tools, and relevant training. The downloadable PDF can be replaced independently.']}]}]
    };
  }
};

window.contactRepository = {
  /** Send only through the backend. The recipient is never part of public data. */
  async send(message) {
    const response=await fetch('/api/contact',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(message),signal:AbortSignal.timeout(15000)
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok || result?.ok!==true) {
      throw new Error(result?.error || (response.status===501 || response.status===404 ?
        'Message delivery is not connected yet. Your draft is still here.' :
        'Your message could not be sent. Please try again.'));
    }
    return result;
  }
};

/** Published reading notes, learning notes or short technical write-ups. */
window.notesRepository = {
  async listPublished() {
    return [
      {id:'field-notes',title:'Field notes',category:'LEARNING',summary:'A place for ideas worth keeping.',body:'Short notes about something learned, tried, or understood. This is a layout preview; the first real entry will be added later.',sortOrder:0,status:'published',preview:true},
      {id:'reading',title:'Reading list',category:'READING',summary:'Books, papers, and things to return to.',body:'A future reading note can include a short reflection and a link to the original source. No reading history is claimed by this placeholder.',sortOrder:1,status:'published',preview:true}
    ];
  }
};
