'use strict';
// Local Node server mirrors Vercel handlers without adding a web framework.
const http=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');
const root=path.resolve(__dirname,'..');const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.ttf':'font/ttf','.mp4':'video/mp4','.mp3':'audio/mpeg','.wav':'audio/wav','.json':'application/json','.pdf':'application/pdf'};
const handlers={content:require('../api/content.js'),admin:require('../api/admin.js'),media:require('../api/media.js'),contact:require('../api/contact.js'),auth:require('../api/auth.js')};
const server=http.createServer(async(req,res)=>{
  req.headers['x-real-ip']=req.socket.remoteAddress;
  res.status=code=>{res.statusCode=code;return res;};res.json=body=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));};
  try{
    const url=new URL(req.url,'http://127.0.0.1:4180');
    if(url.pathname.startsWith('/api/')){
      const name=url.pathname.split('/')[2];if(!handlers[name])return res.status(404).json({error:'Not found.'});
      if(name==='contact'){try{req.body=await require('../server/http.cjs').body(req,16000);}catch(error){return res.status(error.status||400).json({ok:false,error:error.message});}}
      return await handlers[name](req,res);
    }
    let relative=decodeURIComponent(url.pathname);if(relative==='/')relative='/index.html';if(relative==='/admin'||relative==='/admin/')relative='/admin/index.html';
    // Match the deployment's public allowlist; never serve the working tree.
    if(!/^\/(?:assets\/|admin\/|(?:index\.html|[\w-]+\.(?:js|css|mp4))$)/.test(relative)||relative.includes('..'))return res.status(404).end();
    let data=await fs.readFile(path.join(root,relative));
    if(relative==='/index.html')data=Buffer.from(data.toString().replace('<head>','<head><meta name="studio-content-source" content="api">'));
    res.setHeader('Content-Type',types[path.extname(relative)]||'application/octet-stream');res.end(data);
  }catch(error){res.statusCode=error.code==='ENOENT'?404:500;res.end('Not found.');}
});
server.listen(4180,'127.0.0.1',()=>console.log('CMS development server: http://127.0.0.1:4180 (development database only)'));
