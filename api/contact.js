'use strict';
// Vercel Node function. Keep credentials and the inbox address server-side.
// Delivery is opt-in and remains disabled until deployment is configured.
module.exports=async function contact(req,res) {
  res.setHeader('Cache-Control','no-store');
  const respond=(code,body)=>res.status(code).json(body);
  if(req.method!=='POST') { res.setHeader('Allow','POST');return respond(405,{ok:false,error:'Use POST to send a message.'}); }
  if(String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase()!=='application/json') return respond(415,{ok:false,error:'Send a JSON message.'});
  let body=req.body;
  try { if(typeof body==='string')body=JSON.parse(body); }
  catch {return respond(400,{ok:false,error:'The message could not be read.'});}
  if(!body || Array.isArray(body) || typeof body!=='object')return respond(400,{ok:false,error:'The message could not be read.'});
  if(Buffer.byteLength(JSON.stringify(body),'utf8')>16000)return respond(413,{ok:false,error:'The message is too large.'});
  const {name='',email='',message='',company=''}=body;
  if([name,email,message,company].some(value=>typeof value!=='string'))return respond(400,{ok:false,error:'Please check the message fields.'});
  // Quietly reject automated submissions without sending anything.
  if(company)return respond(400,{ok:false,error:'The message could not be accepted.'});
  if(name.length>100 || email.length>254 || message.length>3000 || message.trim().length<2)return respond(400,{ok:false,error:'Write a message between 2 and 3000 characters.'});
  const reply=email.trim();
  if(reply && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reply) || /[\r\n]/.test(reply)))return respond(400,{ok:false,error:'Enter a valid reply email, or leave it blank.'});
  const {RESEND_API_KEY,CONTACT_FROM,CONTACT_TO,CONTACT_ORIGIN,CONTACT_ENABLED}=process.env;
  if(CONTACT_ENABLED!=='true' || !RESEND_API_KEY || !CONTACT_FROM || !CONTACT_TO || !CONTACT_ORIGIN)return respond(503,{ok:false,error:'Message delivery is not connected yet. Your draft is still here.'});
  if(req.headers.origin!==CONTACT_ORIGIN)return respond(403,{ok:false,error:'This request could not be accepted.'});
  try {
    const response=await fetch('https://api.resend.com/emails',{
      method:'POST',signal:AbortSignal.timeout(10000),
      headers:{Authorization:`Bearer ${RESEND_API_KEY}`,'Content-Type':'application/json'},
      body:JSON.stringify({from:CONTACT_FROM,to:[CONTACT_TO],subject:'Portfolio / new message',
        text:`Name: ${name.trim() || 'Not supplied'}\nReply email: ${reply || 'Not supplied'}\n\n${message.trim()}`,
        ...(reply?{reply_to:reply}:{})})
    });
    const result=await response.json().catch(()=>null);
    if(!response.ok || !result?.id)return respond(502,{ok:false,error:'Delivery failed. Your draft is still here; please try again.'});
    return respond(200,{ok:true});
  } catch {return respond(502,{ok:false,error:'Delivery could not be confirmed. Your draft is still here.'});}
};
