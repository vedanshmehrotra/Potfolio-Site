/**
 * The only public project-data boundary. Swap listPublished for a CMS/API adapter.
 * @typedef {Object} Project
 * @property {string} id
 * @property {string} slug
 * @property {string} title
 * @property {string} shortSummary
 * @property {string|null} coverImage
 * @property {string[]} tags
 * @property {string[]} technologies
 * @property {string} problem
 * @property {string} approach
 * @property {string} outcomes
 * @property {(string|{url:string,alt:string})[]} gallery
 * @property {{title:string,body:string}[]} [technicalNotes]
 * @property {{title:string,body:string}[]} [highlights]
 * @property {string[]} [flow]
 * @property {string|null} repositoryUrl
 * @property {string|null} liveUrl
 * @property {boolean} featured
 * @property {number} sortOrder
 * @property {'draft'|'published'} status
 * @property {boolean} [preview]
 * @property {{x:number,y:number,width:number,height:number}} [previewCrop]
 */
window.projectRepository = {
  /** @returns {Promise<Project[]>} */
  async listPublished() {
    // Original artwork's sample cards, explicitly marked as previews.
    // previewCrop changes the viewport onto the locked image; it generates no artwork.
    return [
      { id: "preview-trail", slug: "trailmap-preview", title: "TrailMap", shortSummary: "Sample project preview", coverImage: "./assets/studio-lit.png", previewCrop: {x:580,y:400,width:146,height:94}, tags: ["Preview", "01"], technologies: [], problem: "This is the sample mountain card from the original studio artwork. Your published project description will replace this text.", approach: "Engineering decisions and implementation evidence will appear here when a real project is connected.", outcomes: "This is preview data; no project outcomes are claimed.", gallery: [], repositoryUrl: null, liveUrl: null, featured: true, sortOrder: 1, status: "published", preview: true },
      { id: "preview-journal", slug: "pixeljournal-preview", title: "PixelJournal", shortSummary: "Sample project preview", coverImage: "./assets/studio-lit.png", previewCrop: {x:750,y:400,width:153,height:94}, tags: ["Preview", "02"], technologies: [], problem: "This is the sample cabin card from the original studio artwork. Your published project description will replace this text.", approach: "Engineering decisions and implementation evidence will appear here when a real project is connected.", outcomes: "This is preview data; no project outcomes are claimed.", gallery: [], repositoryUrl: null, liveUrl: null, featured: false, sortOrder: 2, status: "published", preview: true },
      { id: "preview-tools", slug: "devtools-preview", title: "DevTools", shortSummary: "Sample project preview", coverImage: "./assets/studio-lit.png", previewCrop: {x:928,y:400,width:146,height:94}, tags: ["Preview", "03"], technologies: [], problem: "This is the sample campfire card from the original studio artwork. Your published project description will replace this text.", approach: "Engineering decisions and implementation evidence will appear here when a real project is connected.", outcomes: "This is preview data; no project outcomes are claimed.", gallery: [], repositoryUrl: null, liveUrl: null, featured: false, sortOrder: 3, status: "published", preview: true }
    ];
  }
};
