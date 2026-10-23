'use strict';
// Real isolated Postgres, controlled email transport. This never sends mail.
const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');
const fs=require('node:fs/promises');const path=require('node:path');const {parseEnv}=require('node:util');
async function verify(){
  const production=parseEnv(await fs.readFile(path.join(__dirname,'../.env.production.local'),'utf8'));
  if(new URL(process.env.DATABASE_URL).hostname===new URL(production.DATABASE_URL).hostname)throw new Error('Use the development database.');
  const {database,transaction}=require('../server/db.cjs');const {deliver}=require('../server/contact.cjs');
  const initialLimits=(await database().query('SELECT * FROM portfolio_limits')).rows;
  const fetchBefore=global.fetch,calls=[];const suffix=randomUUID();
  Object.assign(process.env,{CONTACT_ENABLED:'true',CONTACT_FROM:'studio@example.test',CONTACT_TO:'owner@example.test',RESEND_API_KEY:'test-only-placeholder'});
  const request={headers:{origin:process.env.CONTACT_ORIGIN,'x-real-ip':`development-test-${suffix}`}};
  let fail=false;
  global.fetch=async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');calls.push(options);return {ok:!fail,json:async()=>fail?{error:'private provider detail'}:{id:'controlled-provider-result'}};};
  const message={name:'Development contact test',email:'reply@example.test',message:`Contact storage proof ${suffix}`};
  try{
    await deliver(request,message);await deliver(request,message);assert.equal(calls.length,1);
    assert.deepEqual(JSON.parse(calls[0].body).to,['owner@example.test']);assert.equal(JSON.parse(calls[0].body).reply_to,'reply@example.test');
    const status=await database().query('SELECT status FROM portfolio_messages WHERE message=$1',[message.message]);assert.equal(status.rows[0].status,'sent');
    fail=true;const retry={...message,message:`Retry proof ${suffix}`};await assert.rejects(deliver(request,retry),error=>error.status===502);
    assert.equal((await database().query('SELECT status FROM portfolio_messages WHERE message=$1',[retry.message])).rows[0].status,'failed');
    fail=false;await deliver(request,retry);assert.equal(calls[1].headers['Idempotency-Key'],calls[2].headers['Idempotency-Key']);
    await deliver(request,message);await assert.rejects(deliver(request,{...message,message:`Limited proof ${suffix}`}),error=>error.status===429);
    const report={passed:true,database:'real isolated development Postgres',mailTransport:'controlled stub; no email sent',checks:['Persisted accepted provider result','Duplicate request sends once','Recipient stays server configured; visitor is Reply-To only','Failed delivery retained and safely retried with the same idempotency key','Durable per-client rate limit enforced']};
    await fs.mkdir(path.join(__dirname,'../qa/cms'),{recursive:true});await fs.writeFile(path.join(__dirname,'../qa/cms/contact-storage.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{
    global.fetch=fetchBefore;
    await transaction(async client=>{await client.query('DELETE FROM portfolio_messages WHERE message LIKE $1',[`%${suffix}`]);await client.query('DELETE FROM portfolio_limits');for(const row of initialLimits)await client.query('INSERT INTO portfolio_limits(key,count,expires_at) VALUES($1,$2,$3)',[row.key,row.count,row.expires_at]);});await database().end();
  }
}
verify().catch(error=>{console.error('Contact storage check failed:',error.code || error.name);process.exitCode=1;});
