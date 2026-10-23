'use strict';
const {HttpError}=require('./http.cjs');
const connected=()=>process.env.CONTACT_ENABLED==='true'&&!!process.env.RESEND_API_KEY&&!!process.env.CONTACT_FROM&&!!process.env.CONTACT_TO;
async function sendMail({subject,text,to=process.env.CONTACT_TO,replyTo,idempotencyKey}){
  if(!connected())throw new HttpError(503,'Message delivery is not connected yet. Your draft is still here.');
  const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(12000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:JSON.stringify({from:process.env.CONTACT_FROM,to:[to],subject,text,...(replyTo?{reply_to:replyTo}:{})})});
  const result=await response.json().catch(()=>null);
  if(!response.ok || !result?.id)throw new HttpError(502,'Delivery could not be confirmed. Your draft is still here.');
  return result.id;
}
module.exports={connected,sendMail};
