'use strict';
// Scan staged bytes, reporting paths and rule names only, never matched values.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');const {parseEnv}=require('node:util');
const all=process.argv.includes('--all');
const files=execFileSync('git',all?['ls-files','-z']:['diff','--cached','--name-only','--diff-filter=ACMR','-z']).toString().split('\0').filter(Boolean);
const rules=[
  ['GitHub token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['AWS access key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['Resend key',/\bre_[A-Za-z0-9_]{25,}\b/],
  ['Blob token',/\bvercel_blob_rw_[A-Za-z0-9_]{20,}\b/],
  ['Credentialed database URL',/postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`]+@/],
  ['Private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['JWT literal',/\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{20,}\b/]
];
const findings=[];
const localSecrets=[];
for(const file of fs.readdirSync('.').filter(file=>/^\.env(?:\.|$)/.test(file)&&file!=='.env.example')){
  for(const [key,value] of Object.entries(parseEnv(fs.readFileSync(file,'utf8')))){
    if(/SECRET|TOKEN|_KEY|PASSWORD|DATABASE_URL/.test(key)&&value.length>=12)localSecrets.push(value);
  }
}
for(const file of files){
  if((/(^|\/)\.env(?:\.|$)/.test(file)&&file!=='.env.example')||/^(?:\.vercel|\.agents|\.npm-cache|node_modules|tmp)\//.test(file))findings.push({file,rule:'Local-only path'});
  const bytes=execFileSync('git',['show',':'+file],{maxBuffer:100*1024*1024});
  if(bytes.includes(0))continue;
  const text=bytes.toString('utf8');
  for(const [rule,pattern] of rules)if(pattern.test(text))findings.push({file,rule});
  if(localSecrets.some(value=>text.includes(value)))findings.push({file,rule:'Known local credential'});
}
console.log(JSON.stringify({scope:all?'all tracked files':'staged changes',files:files.length,findings},null,2));
if(findings.length)process.exitCode=1;
