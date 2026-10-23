'use strict';
const {handle,json,sameOrigin,HttpError}=require('../server/http.cjs');
module.exports=handle(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const url=new URL(req.url,'http://localhost');
  // The explicit Vercel rewrite passes nested routes to this single function.
  const routed=req.query?.authPath||url.searchParams.get('authPath');
  if(routed){
    const route=Array.isArray(routed)?routed.join('/'):routed;
    if(!/^[A-Za-z0-9_/-]{1,250}$/.test(route))return json(res,404,{ok:false,error:'Not found.'});
    url.pathname=`/api/auth/${route}`;url.searchParams.delete('authPath');req.url=url.pathname+url.search;
  }
  const pathname=url.pathname.replace(/\.js$/,'');
  const allowed=['/api/auth/sign-in/email','/api/auth/sign-out','/api/auth/get-session','/api/auth/ok','/api/auth/request-password-reset','/api/auth/reset-password','/api/auth/change-password'];
  // Better Auth emails this GET callback before redirecting to our reset form.
  const resetCallback=req.method==='GET'&&/^\/api\/auth\/reset-password\/[A-Za-z0-9_-]{1,128}$/.test(pathname);
  if(!allowed.includes(pathname)&&!resetCallback)return json(res,404,{ok:false,error:'Not found.'});
  if(!['GET','POST'].includes(req.method))throw new HttpError(405,'Method not allowed.');
  if(req.method==='POST')sameOrigin(req);
  const {auth}=require('../server/auth.cjs');const {toNodeHandler}=await import('better-auth/node');
  return toNodeHandler(await auth())(req,res);
});
module.exports.config={api:{bodyParser:false}};
