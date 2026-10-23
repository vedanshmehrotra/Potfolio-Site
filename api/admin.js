'use strict';
const {handle,json,body,sameOrigin,HttpError}=require('../server/http.cjs');
const {owner}=require('../server/auth.cjs');
const content=require('../server/content.cjs');
module.exports=handle(async(req,res)=>{
  const session=await owner(req);
  if(req.method==='GET'){
    if(new URL(req.url,'http://localhost').searchParams.get('export')==='1'){
      const {database}=require('../server/db.cjs');const sections=(await database().query('SELECT * FROM portfolio_sections ORDER BY key')).rows;
      const media=(await database().query('SELECT id,filename,content_type,bytes FROM portfolio_media')).rows.map(item=>({...item,url:`/api/media?id=${item.id}`}));
      return json(res,200,{ok:true,sections,media});
    }
    return json(res,200,{ok:true,email:session.user.email,sections:await content.sections(),mailConnected:require('../server/mail.cjs').connected()});
  }
  if(!['PUT','POST'].includes(req.method))throw new HttpError(405,'Method not allowed.');
  sameOrigin(req);const input=await body(req);
  if(!Number.isInteger(input.revision)||input.revision<1)throw new HttpError(400,'Reload this section and try again.');
  if(req.method==='PUT')return json(res,200,{ok:true,...await content.save(input.key,input.draft,input.revision)});
  if(!['publish','unpublish'].includes(input.action))throw new HttpError(400,'Unknown action.');
  return json(res,200,{ok:true,...await content.publish(input.key,input.revision,input.action==='unpublish')});
});
