'use strict';
// Explicit maintenance command, never imported by the website or migrations.
// Uses the same content validation/publication model and keeps a local backup.
const fs=require('node:fs/promises');const path=require('node:path');const {isDeepStrictEqual,parseEnv}=require('node:util');
const {validate,publishable,mediaIds}=require('../server/content.cjs');
async function run(){
  const production=process.argv.includes('--production'),apply=process.argv.includes('--apply'),publish=process.argv.includes('--publish');
  const expected=production?'https://after-hours-portfolio-virid.vercel.app':'http://127.0.0.1:4180';
  if(process.env.SITE_ORIGIN!==expected)throw new Error('The content import target does not match SITE_ORIGIN.');
  const productionSettings=parseEnv(await fs.readFile(path.join(__dirname,'../.env.production.local'),'utf8'));
  const sameDatabase=new URL(process.env.DATABASE_URL).hostname===new URL(productionSettings.DATABASE_URL).hostname;
  if(production!==sameDatabase)throw new Error('The database does not match the selected environment.');
  const bundle=Object.fromEntries(Object.entries(require('../content/portfolio.cjs')).map(([key,data])=>[key,validate(key,data)]));
  const summary=Object.fromEntries(Object.entries(bundle).map(([key,data])=>[key,{records:Array.isArray(data)?data.length:1,publicRecords:Array.isArray(data)?publishable(data).length:1}]));
  if(!apply){console.log(JSON.stringify({target:production?'production':'development',mode:'validation only',sections:summary},null,2));return;}
  const {database,transaction}=require('../server/db.cjs');const original=JSON.parse(JSON.stringify(await require('./seed-content.cjs').fixtures()));
  // An explicit, reviewed baseline permits a later content revision without
  // allowing the import to overwrite intervening owner-dashboard edits.
  const expectedFile=process.argv.find(arg=>arg.startsWith('--expected='))?.slice('--expected='.length);
  const baseline=expectedFile?JSON.parse(await fs.readFile(path.resolve(expectedFile),'utf8')):original;
  for(const [key,value] of Object.entries(baseline))validate(key,value);
  const directory=path.join(__dirname,'../qa/content');await fs.mkdir(directory,{recursive:true});
  const backup=path.join(directory,`${production?'production':'development'}-before-${Date.now()}.json`);
  try{
    await transaction(async client=>{
      const rows=(await client.query('SELECT key,draft,published,revision,published_at,updated_at FROM portfolio_sections ORDER BY key FOR UPDATE')).rows;
      if(rows.length!==Object.keys(bundle).length)throw new Error('The existing CMS sections need review before importing.');
      // Never replace unrelated edits made in the owner dashboard.
      for(const row of rows){
        if(!isDeepStrictEqual(row.draft,baseline[row.key])&&!isDeepStrictEqual(row.draft,bundle[row.key]))throw new Error(`Saved ${row.key} edits differ from the reviewed baseline/import. Review before replacing them.`);
        if(row.published!==null&&!isDeepStrictEqual(row.published,publishable(baseline[row.key]))&&!isDeepStrictEqual(row.published,publishable(bundle[row.key])))throw new Error(`Published ${row.key} content changed. Review before replacing it.`);
      }
      await fs.writeFile(backup,JSON.stringify({exportedAt:new Date().toISOString(),sections:rows},null,2),{flag:'wx'});
      for(const row of rows){
        const draft=bundle[row.key],published=publish?publishable(draft):row.published;
        if(isDeepStrictEqual(row.draft,draft)&&isDeepStrictEqual(row.published,published))continue;
        if(publish){
          const ids=mediaIds(published);
          if(ids.length&&(await client.query('SELECT id FROM portfolio_media WHERE id=ANY($1::uuid[])',[ids])).rowCount!==ids.length)throw new Error('A referenced upload is missing.');
          await client.query('DELETE FROM portfolio_media_references WHERE section_key=$1',[row.key]);
          for(const id of ids)await client.query('INSERT INTO portfolio_media_references(section_key,media_id) VALUES($1,$2)',[row.key,id]);
        }
        await client.query('UPDATE portfolio_sections SET draft=$1,published=$2,revision=revision+1,updated_at=now(),published_at=CASE WHEN $3 THEN now() ELSE published_at END WHERE key=$4 AND revision=$5',[JSON.stringify(draft),published===null?null:JSON.stringify(published),publish,row.key,row.revision]);
      }
    });
    const report={target:production?'production':'development',mode:publish?'saved and published':'private drafts saved',sections:summary,backup:path.basename(backup)};
    await fs.writeFile(path.join(directory,`${production?'production':'development'}-import.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{await database().end();}
}
run().catch(error=>{console.error('Content import stopped:',error.code||error.message);process.exitCode=1;});
