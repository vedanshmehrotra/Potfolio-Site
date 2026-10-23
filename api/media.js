'use strict';
const {randomUUID}=require('node:crypto');
const {Readable}=require('node:stream');
const {handle,json,bytes,sameOrigin,HttpError}=require('../server/http.cjs');
const {owner}=require('../server/auth.cjs');
const {database}=require('../server/db.cjs');
function fileType(buffer){
  if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return ['image/png','png'];
  if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return ['image/jpeg','jpg'];
  if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return ['image/webp','webp'];
  if(buffer.toString('ascii',0,5)==='%PDF-')return ['application/pdf','pdf'];
  throw new HttpError(400,'Choose a PNG, JPEG, WebP image or PDF.');
}
module.exports=handle(async(req,res)=>{
  const query=new URL(req.url,'http://localhost').searchParams;
  if(req.method==='GET'){
    const id=query.get('id');if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id||''))throw new HttpError(404,'File not found.');
    const {rows}=await database().query('SELECT m.*,EXISTS(SELECT 1 FROM portfolio_media_references r WHERE r.media_id=m.id) AS public FROM portfolio_media m WHERE m.id=$1',[id]);
    const media=rows[0];if(!media||!media.public&&!await owner(req,{optional:true}))throw new HttpError(404,'File not found.');
    const {get}=await import('@vercel/blob');const file=await get(media.pathname,{access:'private'});if(!file||file.statusCode!==200)throw new HttpError(404,'File not found.');
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Type',media.content_type);res.setHeader('Content-Length',media.bytes);
    res.setHeader('Content-Disposition',`${media.content_type==='application/pdf'?'attachment':'inline'}; filename="${media.filename.replace(/[^a-zA-Z0-9._-]/g,'_')}"`);
    return new Promise((resolve,reject)=>{res.on('finish',resolve);const stream=Readable.fromWeb(file.stream);stream.on('error',reject);stream.pipe(res);});
  }
  await owner(req);sameOrigin(req);
  if(req.method!=='POST')throw new HttpError(405,'Method not allowed.');
  const buffer=await bytes(req,4000000);const [contentType,extension]=fileType(buffer);const id=randomUUID();
  const filename=(query.get('name')||`upload.${extension}`).replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,150);
  const {put,del}=await import('@vercel/blob');const blob=await put(`portfolio/${id}.${extension}`,buffer,{access:'private',contentType,addRandomSuffix:false});
  try{await database().query('INSERT INTO portfolio_media(id,pathname,filename,content_type,bytes) VALUES($1,$2,$3,$4,$5)',[id,blob.pathname,filename,contentType,buffer.length]);}catch(error){await del(blob.url).catch(()=>{});throw error;}
  return json(res,201,{ok:true,id,url:`/api/media?id=${id}`,filename,contentType});
});
module.exports.config={api:{bodyParser:false}};
module.exports.fileType=fileType;
