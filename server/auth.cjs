'use strict';
const {database}=require('./db.cjs');
const {HttpError,origin}=require('./http.cjs');
let instance;
async function makeAuth({bootstrap=false}={}){
  if(!process.env.BETTER_AUTH_SECRET || !process.env.ADMIN_EMAIL)throw new HttpError(503,'Owner sign-in is not configured yet.');
  const {betterAuth}=await import('better-auth');
  return betterAuth({
    appName:'After Hours',baseURL:origin(),basePath:'/api/auth',secret:process.env.BETTER_AUTH_SECRET,
    database:database(),trustedOrigins:[origin()],
    emailAndPassword:{enabled:true,disableSignUp:!bootstrap,minPasswordLength:14,maxPasswordLength:128,autoSignIn:false,revokeSessionsOnPasswordReset:true,
      sendResetPassword:async({user,url})=>{if(user.email.toLowerCase()!==process.env.ADMIN_EMAIL.toLowerCase())return;await require('./mail.cjs').sendMail({to:user.email,subject:'After Hours / owner password reset',text:`You requested a password reset for your portfolio.\n\n${url}\n\nIf you did not request it, ignore this email.`});}},
    session:{expiresIn:60*60*24,updateAge:60*60},
    advanced:{cookiePrefix:'after-hours',useSecureCookies:origin().startsWith('https:'),ipAddress:{ipAddressHeaders:['x-real-ip']}},
    rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{'/sign-in/email':{window:300,max:5},'/request-password-reset':{window:900,max:3}}}
  });
}
async function auth(){return instance ||= makeAuth();}
async function owner(req,{optional=false}={}){
  const {fromNodeHeaders}=await import('better-auth/node');
  const session=await(await auth()).api.getSession({headers:fromNodeHeaders(req.headers)});
  if(session?.user?.email?.toLowerCase()===process.env.ADMIN_EMAIL?.toLowerCase())return session;
  if(optional)return null;
  throw new HttpError(401,'Please sign in to the owner dashboard.');
}
module.exports={auth,makeAuth,owner};
