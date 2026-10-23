'use strict';
const {z}=require('zod');
const {database,transaction}=require('./db.cjs');
const {HttpError}=require('./http.cjs');
const text=(limit=12000)=>z.string().max(limit);
const label=text(160).trim().min(1);
const id=z.string().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const url=z.string().max(2000).refine(value=>!value || /^(?:\.\/)?assets\/[\w./-]+$/.test(value)&&!value.includes('..') || /^\/api\/media\?id=[a-f0-9-]{36}$/.test(value) || (()=>{try{const parsed=new URL(value);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password;}catch{return false;}})(),'Use an HTTPS link, uploaded file or local asset.');
const maybeUrl=url.nullable().optional();
const list=z.array(text(160)).max(30);
const common={id,title:label,status:z.enum(['draft','published']),preview:z.boolean().optional(),sortOrder:z.number().int().min(0).max(9999)};
const link=z.object({label, url});
const projectNote=z.object({title:text(100),body:text(500)});
const schemas={
  projects:z.array(z.object({...common,slug:z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),shortSummary:text(240),coverImage:maybeUrl,tags:list,technologies:list,problem:text(),approach:text(),outcomes:text(),highlights:z.array(projectNote).max(6).optional(),flow:z.array(text(80)).max(6).optional(),technicalNotes:z.array(projectNote).max(8).optional(),gallery:z.array(z.union([url,z.object({url,alt:text(300)})])).max(16),repositoryUrl:maybeUrl,liveUrl:maybeUrl,featured:z.boolean(),previewCrop:z.object({x:z.number().min(0).max(1672),y:z.number().min(0).max(942),width:z.number().positive().max(1672),height:z.number().positive().max(942)}).optional()})).max(60),
  about:z.object({title:label,role:text(200),bio:text(4000),focus:list,toolkit:list,note:text(300),links:z.array(link).max(10),status:z.enum(['draft','published'])}),
  journey:z.array(z.object({...common,date:text(60).nullable(),kind:z.enum(['education','project','experience','achievement']),summary:text(400),description:text(),result:text(300).nullable(),imageUrl:maybeUrl,imageAlt:text(300)})).max(100),
  resume:z.object({name:label,role:text(200),status:z.enum(['draft','published']),preview:z.boolean().optional(),downloadUrl:maybeUrl,downloadName:text(200),sections:z.array(z.object({id,title:label,entries:z.array(z.object({heading:label,meta:text(200).optional(),body:z.array(text(4000)).max(25)})).max(20)})).max(16)}),
  notes:z.array(z.object({...common,category:text(100),summary:text(500),body:text(),sourceUrl:maybeUrl,credentialType:z.enum(['note','certification','skill-badge','training-badge','course-certificate']).optional(),issuer:text(240).optional(),issuedAt:text(60).optional(),credentialId:text(180).optional(),imageUrl:maybeUrl,imageAlt:text(300).optional(),certificateUrl:maybeUrl})).max(100)
};
function validate(key,data){
  if(!schemas[key])throw new HttpError(400,'Unknown content section.');
  const parsed=schemas[key].parse(data);
  if(Array.isArray(parsed)){
    for(const field of key==='projects'?['id','slug']:['id'])if(new Set(parsed.map(item=>item[field])).size!==parsed.length)throw new HttpError(400,`Every ${field} must be unique.`);
  }
  return parsed;
}
function publishable(value){return Array.isArray(value)?value.filter(item=>item.status==='published').sort((a,b)=>a.sortOrder-b.sortOrder):value.status==='published'?value:null;}
function mediaIds(value,ids=new Set()){
  if(typeof value==='string'){const match=value.match(/^\/api\/media\?id=([a-f0-9-]{36})$/);if(match)ids.add(match[1]);}
  else if(Array.isArray(value))value.forEach(item=>mediaIds(item,ids));
  else if(value&&typeof value==='object')Object.values(value).forEach(item=>mediaIds(item,ids));
  return [...ids];
}
async function published(){const {rows}=await database().query('SELECT key,published FROM portfolio_sections');return Object.fromEntries(rows.map(row=>[row.key,row.published]));}
async function sections(){return(await database().query('SELECT key,draft,revision,published_at AS "publishedAt",updated_at AS "updatedAt",published IS NOT NULL AS "hasPublished" FROM portfolio_sections ORDER BY key')).rows;}
async function save(key,draft,revision){
  const data=validate(key,draft);const result=await database().query('UPDATE portfolio_sections SET draft=$1,revision=revision+1,updated_at=now() WHERE key=$2 AND revision=$3 RETURNING revision',[JSON.stringify(data),key,revision]);
  if(!result.rowCount)throw new HttpError(409,'This section changed elsewhere. Reload it before saving.');
  return result.rows[0];
}
async function publish(key,revision,unpublish=false){
  if(!schemas[key])throw new HttpError(400,'Unknown content section.');
  return transaction(async client=>{
    const {rows}=await client.query('SELECT draft,revision FROM portfolio_sections WHERE key=$1 FOR UPDATE',[key]);
    if(rows[0]?.revision!==revision)throw new HttpError(409,'This section changed elsewhere. Reload it before publishing.');
    const data=unpublish?null:publishable(validate(key,rows[0].draft));const ids=mediaIds(data);
    if(ids.length){const found=await client.query('SELECT id FROM portfolio_media WHERE id=ANY($1::uuid[])',[ids]);if(found.rowCount!==ids.length)throw new HttpError(400,'A referenced upload is missing. Upload it again before publishing.');}
    await client.query('DELETE FROM portfolio_media_references WHERE section_key=$1',[key]);
    for(const mediaId of ids)await client.query('INSERT INTO portfolio_media_references(section_key,media_id) VALUES($1,$2)',[key,mediaId]);
    const result=await client.query('UPDATE portfolio_sections SET published=$1,published_at=now(),revision=revision+1,updated_at=now() WHERE key=$2 RETURNING revision',[data===null?null:JSON.stringify(data),key]);return result.rows[0];
  });
}
module.exports={schemas,validate,publishable,mediaIds,published,sections,save,publish};
