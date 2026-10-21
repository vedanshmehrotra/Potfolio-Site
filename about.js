/**
 * Editable starter copy based on the supplied AI/ML undergraduate background.
 * Replace getPublished with a CMS/API adapter when the profile copy is ready.
 * @typedef {Object} AboutProfile
 * @property {string} title
 * @property {string} role
 * @property {string} bio
 * @property {string[]} focus
 * @property {string[]} toolkit
 * @property {{label:string,url:string}[]} links
 * @property {string} note
 * @property {'draft'|'published'} status
 */
window.aboutRepository = {
  /** @returns {Promise<AboutProfile|null>} */
  async getPublished() {
    return {
      title: 'About Me',
      role: 'AI / ML undergraduate',
      bio: 'A little space for who I am, what keeps me curious, and the things I enjoy making. More personal notes will be added here later.',
      focus: ['Things I am curious about', 'Ideas I want to explore'],
      toolkit: ['Interests beyond work', 'Little things about me'],
      note: 'Personal notes · copy to come',
      links: [{label:'GitHub',url:'https://github.com/vedanshmehrotra'},{label:'LinkedIn',url:'https://www.linkedin.com/in/vedansh-mehrotra-05b41331b'}],
      status: 'published'
    };
  }
};
