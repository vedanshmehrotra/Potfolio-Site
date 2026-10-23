'use strict';

// Only these runtime files enter the public website. API code remains outside
// the static output so Vercel compiles it as a server function.
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'public');
const runtimeFiles=[
  'index.html','styles.css','sections.css','feedback.css',
  'projects.js','about.js','content.js','cms.js','audio.js','cursor.js',
  'sections.js','app.js','parrot.js','cat.js',
  'after_hours_dark_ambient_canonical_v1_4s.mp4',
  'after_hours_lit_ambient_breathing_v3_4s.mp4',
  'after_hours_transition_clean_2s.mp4'
];

async function prepare() {
  await fs.mkdir(output,{recursive:true});
  for(const name of runtimeFiles)await fs.copyFile(path.join(root,name),path.join(output,name));
  await fs.cp(path.join(root,'assets'),path.join(output,'assets'),{recursive:true});
  await fs.cp(path.join(root,'admin'),path.join(output,'admin'),{recursive:true});
  console.log(`Prepared ${runtimeFiles.length} runtime files and public assets.`);
}

if(require.main===module)prepare().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={prepare,runtimeFiles};
