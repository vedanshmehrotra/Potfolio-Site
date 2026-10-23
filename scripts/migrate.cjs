'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
async function migrate(){
  // Use the direct connection for DDL; runtime traffic uses the pooled URL.
  if(process.env.DATABASE_URL_UNPOOLED)process.env.DATABASE_URL=process.env.DATABASE_URL_UNPOOLED;
  const {database,transaction}=require('../server/db.cjs');
  const {makeAuth}=require('../server/auth.cjs');
  const {getMigrations}=await import('better-auth/db/migration');
  const auth=await makeAuth();const migrations=await getMigrations(auth.options);
  await migrations.runMigrations();
  await transaction(async client=>{
    await client.query(await fs.readFile(path.join(__dirname,'../db/001-content.sql'),'utf8'));
    await require('./seed-content.cjs').seed(client);
  });
  console.log('Auth and portfolio schema ready. Existing content was preserved.');
  await database().end();
}
if(require.main===module)migrate().catch(error=>{console.error('Migration failed:',error.code || error.name);process.exitCode=1;});
module.exports={migrate};
