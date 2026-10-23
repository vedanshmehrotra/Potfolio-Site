'use strict';
const {Pool}=require('pg');
const {HttpError}=require('./http.cjs');
let pool;
function database(){
  if(!process.env.DATABASE_URL)throw new HttpError(503,'Content storage is not connected yet.');
  if(!pool){const connection=new URL(process.env.DATABASE_URL);if(connection.searchParams.get('sslmode')==='require')connection.searchParams.set('sslmode','verify-full');pool=new Pool({connectionString:connection.href,max:3,idleTimeoutMillis:3000,connectionTimeoutMillis:12000,allowExitOnIdle:true});pool.on('error',error=>console.error('[database]',error.code || 'connection error'));if(process.env.VERCEL)require('@vercel/functions').attachDatabasePool(pool);}
  return pool;
}
async function transaction(fn){const client=await database().connect();try{await client.query('BEGIN');const result=await fn(client);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
module.exports={database,transaction};
