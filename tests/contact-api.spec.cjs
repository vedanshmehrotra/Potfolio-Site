const {test,expect}=require('@playwright/test');
const handler=require('../api/contact.js');
const keys=['CONTACT_ENABLED','RESEND_API_KEY','CONTACT_FROM','CONTACT_TO','CONTACT_ORIGIN'];
let previous,originalFetch,calls;
test.beforeEach(()=>{
  previous=Object.fromEntries(keys.map(key=>[key,process.env[key]]));originalFetch=global.fetch;calls=[];
  keys.forEach(key=>delete process.env[key]);
  // Every outbound call is replaced; these tests never send email.
  global.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>({id:'test-message'})};};
});
test.afterEach(()=>{
  global.fetch=originalFetch;
  for(const [key,value] of Object.entries(previous)) {if(value===undefined)delete process.env[key];else process.env[key]=value;}
});
const invoke=async(body,overrides={})=>{
  const output={headers:{}};
  const res={setHeader:(key,value)=>output.headers[key]=value,status:code=>{output.status=code;return res;},json:body=>{output.body=body;return output;}};
  await handler({method:'POST',headers:{'content-type':'application/json',origin:'https://portfolio.example'},body,...overrides},res);
  return output;
};
const configure=()=>Object.assign(process.env,{CONTACT_ENABLED:'true',RESEND_API_KEY:'test-only-placeholder',CONTACT_FROM:'studio@example.test',CONTACT_TO:'owner@example.test',CONTACT_ORIGIN:'https://portfolio.example'});
test('Contact API rejects invalid input and remains disabled without configuration',async()=>{
  expect((await invoke({message:'Hello'})).status).toBe(503);
  for(const body of [{message:' '},{message:'x'.repeat(3001)},{message:'Hello',email:'bad'},{message:'Hello',email:'ok@example.test\r\nBcc:other@example.test'},{message:[]},{message:'Hello',company:'bot'}]) expect((await invoke(body)).status).toBe(400);
  expect((await invoke({message:'Hello'},{method:'GET'})).status).toBe(405);
  expect((await invoke({message:'Hello'},{headers:{'content-type':'text/plain'}})).status).toBe(415);
  expect((await invoke({message:'Hello',extra:'x'.repeat(17000)})).status).toBe(413);
  expect(calls).toHaveLength(0);
});
test('Contact API uses only the configured recipient and optional visitor Reply-To',async()=>{
  configure();
  expect((await invoke({name:'Visitor',email:'visitor@example.test',message:'A project idea.',to:'attacker@example.test'})).body).toEqual({ok:true});
  expect(calls).toHaveLength(1);expect(calls[0].url).toBe('https://api.resend.com/emails');
  const payload=JSON.parse(calls[0].options.body);
  expect(payload.to).toEqual(['owner@example.test']);expect(payload.from).toBe('studio@example.test');expect(payload.reply_to).toBe('visitor@example.test');expect(payload.text).toContain('A project idea.');
  expect((await invoke({message:'Anonymous feedback.'})).status).toBe(200);
  expect(JSON.parse(calls[1].options.body).reply_to).toBeUndefined();
});
test('Contact API rejects foreign origins and does not claim success on provider failure',async()=>{
  configure();
  expect((await invoke({message:'Hello'},{headers:{'content-type':'application/json',origin:'https://foreign.example'}})).status).toBe(403);
  expect(calls).toHaveLength(0);
  global.fetch=async()=>({ok:false,json:async()=>({error:'Private provider diagnostic'})});
  const failed=await invoke({message:'Hello'});expect(failed.status).toBe(502);expect(failed.body.ok).toBe(false);expect(JSON.stringify(failed.body)).not.toContain('Private provider diagnostic');
  global.fetch=async()=>{throw new Error('offline');};expect((await invoke({message:'Hello'})).status).toBe(502);
});
