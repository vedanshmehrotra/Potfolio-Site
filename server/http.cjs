'use strict';
class HttpError extends Error {constructor(status,message){super(message);this.status=status;}}
const origin=()=>new URL(process.env.SITE_ORIGIN || process.env.BETTER_AUTH_URL || 'http://127.0.0.1:4180').origin;
function json(res,status,body){res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');return res.status(status).json(body);}
function sameOrigin(req){if(req.headers.origin!==origin())throw new HttpError(403,'This request could not be accepted.');}
async function bytes(req,limit=256000){
  if(Number(req.headers['content-length'])>limit)throw new HttpError(413,'This upload is too large.');
  if(req.body!==undefined){const value=Buffer.isBuffer(req.body)?req.body:Buffer.from(typeof req.body==='string'?req.body:JSON.stringify(req.body));if(value.length>limit)throw new HttpError(413,'This request is too large.');return value;}
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>limit)throw new HttpError(413,'This request is too large.');chunks.push(chunk);}return Buffer.concat(chunks);
}
async function body(req,limit){if(!String(req.headers['content-type']).toLowerCase().startsWith('application/json'))throw new HttpError(415,'Send a JSON request.');try{const value=JSON.parse((await bytes(req,limit)).toString());if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'Send a JSON object.');return value;}catch(error){if(error.status)throw error;throw new HttpError(400,'The request could not be read.');}}
function handle(fn){return async(req,res)=>{try{return await fn(req,res);}catch(error){if(res.headersSent){res.end();return;}const status=error.status || (error.name==='ZodError'?400:503);if(status>=500)console.error('[studio-api]',error.code || error.name);return json(res,status,{ok:false,error:error.name==='ZodError'?'Please check the content fields below.':error.status?error.message:'The service is unavailable. Please try again shortly.',...(error.name==='ZodError'?{issues:error.issues.slice(0,12).map(issue=>({path:issue.path,message:issue.message}))}:{})});}};}
module.exports={HttpError,origin,json,sameOrigin,bytes,body,handle};
