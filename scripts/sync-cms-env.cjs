'use strict';
// Credentials pass through stdin, never command-line arguments or output.
const fs=require('node:fs');const path=require('node:path');const {parseEnv}=require('node:util');const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),values=parseEnv(fs.readFileSync(path.join(root,'.env.production.local'),'utf8'));
const selected=['SITE_ORIGIN','BETTER_AUTH_URL','BETTER_AUTH_SECRET','ADMIN_EMAIL','CONTACT_TO','CONTACT_FROM','CONTACT_ORIGIN','CONTACT_ENABLED'];
for(const key of selected){
  if(!values[key])throw new Error(`Missing private setting: ${key}`);
  const run=spawnSync('npx',['--yes','vercel@65.1.0','env','add',key,'--environment','production','--sensitive','--yes','--scope','vedansh-mehrotras-projects'],{cwd:root,input:values[key],encoding:'utf8',shell:process.platform==='win32'});
  if(run.status!==0){if((run.stdout+run.stderr).includes('already exists')){console.log(`${key} already exists in Production; not overwritten.`);continue;}console.error(`Could not save ${key}. Exit: ${run.status}. Secret values were not printed.`);process.exit(1);}
  console.log(`Saved ${key} in Production.`);
}
