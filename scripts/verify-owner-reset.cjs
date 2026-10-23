'use strict';
// Real development auth flow, without sending email or exposing reset tokens.
const {chromium,expect}=require('@playwright/test');
const {randomBytes}=require('node:crypto');const {parseEnv}=require('node:util');
const fs=require('node:fs/promises');const path=require('node:path');
const root=path.resolve(__dirname,'..'),origin='http://127.0.0.1:4180';
async function verify(){
  const production=parseEnv(await fs.readFile(path.join(root,'.env.production.local'),'utf8'));
  if(process.env.SITE_ORIGIN!==origin||!process.env.CMS_TEST_PASSWORD||new URL(process.env.DATABASE_URL).hostname===new URL(production.DATABASE_URL).hostname)throw new Error('Reset checks require isolated development settings.');
  const {database}=require('../server/db.cjs');const auth=await require('../server/auth.cjs').auth();const adapter=(await auth.$context).internalAdapter;
  const user=(await database().query('SELECT id FROM "user" WHERE lower(email)=$1',[process.env.ADMIN_EMAIL.toLowerCase()])).rows[0];
  if(!user)throw new Error('Development owner is not provisioned.');
  const token=randomBytes(18).toString('base64url'),identifier=`reset-password:${token}`;
  const report={checks:[],errors:[]};const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const context=await browser.newContext(),oldSession=await browser.newContext();
    const signedIn=await oldSession.request.post(origin+'/api/auth/sign-in/email',{headers:{origin},data:{email:process.env.ADMIN_EMAIL,password:process.env.CMS_TEST_PASSWORD}});expect(signedIn.status()).toBe(200);
    expect((await oldSession.request.get(origin+'/api/admin')).status()).toBe(200);
    await adapter.createVerificationValue({identifier,value:user.id,expiresAt:new Date(Date.now()+300000)});
    const rewritten=await context.request.get(origin+`/api/auth?authPath=reset-password/${token}&callbackURL=%2Fadmin%2Freset.html`,{maxRedirects:0});expect(rewritten.status()).toBe(302);expect(new URL(rewritten.headers().location).searchParams.get('token')).toBe(token);
    const unsafe=await context.request.get(origin+`/api/auth/reset-password/${token}?callbackURL=https%3A%2F%2Funtrusted.example%2F`,{maxRedirects:0});expect(unsafe.status()).toBe(403);
    const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
    await page.goto(origin+`/api/auth/reset-password/${token}?callbackURL=%2Fadmin%2Freset.html`);
    await expect(page).toHaveURL(origin+'/admin/reset.html');await expect(page.locator('form')).toBeVisible();
    report.checks.push('A real private development token follows the library callback; the form clears its URL; foreign callback origins are rejected');
    await page.locator('#password').fill('short');await page.locator('#confirm-password').fill('short');
    await page.locator('form button').click();await expect(page.locator('#desk-status')).toContainText('between 14 and 128');
    const weak=await context.request.post(origin+'/api/auth/reset-password',{headers:{origin},data:{token,newPassword:'short'}});expect(weak.status()).toBe(400);
    await page.locator('#password').fill(process.env.CMS_TEST_PASSWORD);await page.locator('#confirm-password').fill('does-not-match');
    await page.locator('form button').click();await expect(page.locator('#desk-status')).toContainText('do not match');
    await page.locator('#confirm-password').fill(process.env.CMS_TEST_PASSWORD);
    const reset=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith('/api/auth/reset-password'));
    await page.locator('form button').click();expect((await reset).status()).toBe(200);await expect(page.locator('#desk-status')).toContainText('Password saved');
    const replay=await context.request.post(origin+'/api/auth/reset-password',{headers:{origin},data:{token,newPassword:process.env.CMS_TEST_PASSWORD}});expect(replay.status()).toBe(400);
    expect((await oldSession.request.get(origin+'/api/admin')).status()).toBe(401);
    report.checks.push('Short and mismatched passwords are rejected; the real reset succeeds once and revokes existing owner sessions');
    await page.goto(origin+'/admin');await page.locator('#owner-email').fill(process.env.ADMIN_EMAIL);await page.locator('#owner-password').fill(process.env.CMS_TEST_PASSWORD);
    const login=page.waitForResponse(response=>response.request().method()==='POST'&&response.url().endsWith('/api/auth/sign-in/email'));
    await page.getByRole('button',{name:'OPEN DESK'}).click();expect((await login).status()).toBe(200);await expect(page.getByRole('navigation',{name:'Content sections'})).toBeVisible({timeout:20000});
    await page.getByRole('button',{name:'SIGN OUT',exact:true}).click();await expect(page.locator('#owner-email')).toBeVisible();
    expect(report.errors).toEqual([]);report.checks.push('The unchanged development password signs in after reset; logout works; no mail or production data was used');report.passed=true;
  }catch(error){report.passed=false;report.error=String(error.stack).replaceAll(token,'[REDACTED TOKEN]').replaceAll(process.env.CMS_TEST_PASSWORD,'[REDACTED PASSWORD]');process.exitCode=1;}
  finally{try{await adapter.deleteVerificationByIdentifier(identifier);}finally{await browser.close();await database().end();await fs.writeFile(path.join(root,'qa/cms/owner-reset.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}}
}
verify().catch(error=>{console.error('Reset verification failed:',error.code||error.name);process.exitCode=1;});
