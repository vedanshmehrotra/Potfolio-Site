'use strict';
const {randomBytes}=require('node:crypto');
async function bootstrap(){
  const {database}=require('../server/db.cjs');const {makeAuth}=require('../server/auth.cjs');
  const email=process.env.ADMIN_EMAIL?.toLowerCase();if(!email)throw new Error('ADMIN_EMAIL is required.');
  const existing=await database().query('SELECT id FROM "user" WHERE lower(email)=$1',[email]);
  if(existing.rowCount){console.log('Owner account already exists; its password was not changed.');await database().end();return;}
  // A random password is never printed. The owner sets a private password with
  // the emailed reset link; development tests can supply their own secret.
  const password=process.env.CMS_TEST_PASSWORD || randomBytes(36).toString('base64url');
  const auth=await makeAuth({bootstrap:true});
  await auth.api.signUpEmail({body:{email,password,name:'Vedansh Mehrotra'}});
  console.log('Owner account created. Use the dashboard password-reset email to set your password.');await database().end();
}
if(require.main===module)bootstrap().catch(error=>{console.error('Owner setup failed:',error.code || error.name);process.exitCode=1;});
