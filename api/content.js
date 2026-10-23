'use strict';
const {handle,json}=require('../server/http.cjs');
module.exports=handle(async(req,res)=>{
  if(req.method!=='GET'){res.setHeader('Allow','GET');return json(res,405,{ok:false,error:'Use GET to read content.'});}
  if(!process.env.DATABASE_URL)return json(res,200,{configured:false});
  if(new URL(req.url,'http://localhost').searchParams.get('draft')==='1'){
    await require('../server/auth.cjs').owner(req);const rows=await require('../server/content.cjs').sections();
    const sections=Object.fromEntries(rows.map(row=>[row.key,Array.isArray(row.draft)?row.draft.map(record=>({...record,status:'published'})):{...row.draft,status:'published'}]));
    return json(res,200,{configured:true,draft:true,contactAvailable:require('../server/mail.cjs').connected(),sections});
  }
  return json(res,200,{configured:true,contactAvailable:require('../server/mail.cjs').connected(),sections:await require('../server/content.cjs').published()});
});
