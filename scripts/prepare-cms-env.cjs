'use strict';
const fs=require('node:fs');const path=require('node:path');const {randomBytes}=require('node:crypto');const {parseEnv}=require('node:util');
for(const [file,site] of [['.env.local','http://127.0.0.1:4180'],['.env.production.local','https://after-hours-portfolio-virid.vercel.app']]){
  const target=path.join(__dirname,'..',file);const original=fs.readFileSync(target,'utf8');const values=parseEnv(original);
  const ownerEmail=values.ADMIN_EMAIL || process.env.OWNER_EMAIL;if(!ownerEmail)throw new Error('Set OWNER_EMAIL privately before preparing CMS settings.');
  const settings={SITE_ORIGIN:site,BETTER_AUTH_URL:site,BETTER_AUTH_SECRET:randomBytes(48).toString('base64url'),ADMIN_EMAIL:ownerEmail,CONTACT_TO:ownerEmail,CONTACT_FROM:'onboarding@resend.dev',CONTACT_ORIGIN:site,CONTACT_ENABLED:'false',...(file==='.env.local'?{CMS_TEST_PASSWORD:randomBytes(24).toString('base64url')}:{})};
  fs.appendFileSync(target,'\n'+Object.entries(settings).filter(([key])=>values[key]===undefined).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n');
  console.log(`Prepared private CMS settings in ${file}; secret values were not printed.`);
}
