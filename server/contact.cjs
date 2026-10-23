'use strict';
const {createHmac,randomUUID}=require('node:crypto');
const {database,transaction}=require('./db.cjs');
const {HttpError,origin}=require('./http.cjs');
const {connected,sendMail}=require('./mail.cjs');
const hash=value=>createHmac('sha256',process.env.BETTER_AUTH_SECRET).update(value).digest('hex');
async function consumeLimit(ip){
  const now=Date.now(),minute=Math.floor(now/600000),day=Math.floor(now/86400000);
  await transaction(async client=>{
    for(const [key,maximum,expires] of [[`contact:${hash(ip)}:${minute}`,5,(minute+1)*600000],[`contact-day:${day}`,40,(day+1)*86400000]]){
      const {rows}=await client.query('INSERT INTO portfolio_limits(key,count,expires_at) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=portfolio_limits.count+1 RETURNING count',[key,new Date(expires)]);
      if(rows[0].count>maximum)throw new HttpError(429,'The postbox is busy. Please try again later.');
    }
    await client.query('DELETE FROM portfolio_limits WHERE expires_at < now()');
  });
}
async function deliver(req,input){
  if(!connected()||!process.env.DATABASE_URL||!process.env.BETTER_AUTH_SECRET)throw new HttpError(503,'Message delivery is not connected yet. Your draft is still here.');
  if(req.headers.origin!==(process.env.CONTACT_ORIGIN||origin()))throw new HttpError(403,'This request could not be accepted.');
  await consumeLimit(String(req.headers['x-real-ip']||req.socket?.remoteAddress||'unknown'));
  const {name,email,message}=input;const dedupe=hash(JSON.stringify([name,email,message,Math.floor(Date.now()/86400000)]));
  const {rows}=await database().query("INSERT INTO portfolio_messages(id,dedupe,name,email,message,status) VALUES($1,$2,$3,$4,$5,'sending') ON CONFLICT(dedupe) DO UPDATE SET status='sending',updated_at=now() WHERE portfolio_messages.status='failed' OR (portfolio_messages.status='sending' AND portfolio_messages.updated_at<now()-interval '2 minutes') RETURNING id",[randomUUID(),dedupe,name,email,message]);
  if(!rows.length){const found=await database().query('SELECT status FROM portfolio_messages WHERE dedupe=$1',[dedupe]);if(found.rows[0]?.status==='sent')return;throw new HttpError(409,'This message is already being sent. Please wait before trying again.');}
  try{
    const providerId=await sendMail({subject:'Portfolio / new message',text:`Name: ${name||'Not supplied'}\nReply email: ${email||'Not supplied'}\n\n${message}`,replyTo:email||undefined,idempotencyKey:`portfolio-${dedupe}`});
    await database().query("UPDATE portfolio_messages SET status='sent',provider_id=$1,updated_at=now() WHERE id=$2",[providerId,rows[0].id]);
  }catch(error){await database().query("UPDATE portfolio_messages SET status='failed',updated_at=now() WHERE id=$1",[rows[0].id]);throw error.status?error:new HttpError(502,'Delivery could not be confirmed. Your draft is still here.');}
}
module.exports={deliver,consumeLimit};
