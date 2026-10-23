'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const data=require('../content/portfolio.cjs');const {validate,publishable,mediaIds}=require('../server/content.cjs');
test('the source-backed import validates and contains exactly the four requested projects',()=>{
  for(const [key,value] of Object.entries(data))assert.deepEqual(validate(key,value),value);
  assert.deepEqual(data.projects.map(project=>project.title),['PathForge','ResolveFlow','Automated CI/CD Framework','PlanEase']);
  assert.equal(data.projects.every(project=>!project.preview&&project.status==='published'),true);
  assert.equal(data.projects[0].technologies.includes('FastAPI'),true);
});
test('six AWS training badges and the verified edX certificate are public; other courses remain private',()=>{
  const publicRecords=publishable(data.notes);assert.equal(publicRecords.length,7);
  for(const item of publicRecords.filter(item=>item.id.startsWith('aws-'))){assert.equal(item.credentialType,'training-badge');assert.match(item.sourceUrl,/^https:\/\/www\.credly\.com\/badges\/[a-f0-9-]{36}$/);assert.equal(item.issuedAt,'May 2026');assert.equal(fs.existsSync(path.join(__dirname,'..',item.imageUrl)),true);}
  const edx=publicRecords.find(item=>item.id==='edx-sustainable-development');assert.equal(edx.issuedAt,'16 January 2025');assert.equal(edx.sourceUrl,'https://courses.edx.org/certificates/7ceeabda2ff14749b8694c877aae928b');
  assert.equal(data.notes.filter(item=>item.status==='draft').length,4);
  assert.equal(publicRecords.some(item=>item.id==='google-vertex-ai'),false);
});

test('short project presentations retain their editable structured fields',()=>{
  for(const project of validate('projects',data.projects)){
    assert.equal(project.highlights.length,3);assert.equal(project.technicalNotes.length,3);assert.equal(project.flow.length,4);
    assert.ok(project.problem.split(/\s+/).length<45);assert.ok(project.approach.split(/\s+/).length<30);
    assert.equal(project.previewCrop,undefined);assert.match(project.coverImage,/assets\/projects\/.*-cover\.svg$/);
    assert.ok(fs.existsSync(path.join(__dirname,'..',project.coverImage)));
    for(const image of project.gallery)assert.ok(fs.existsSync(path.join(__dirname,'..',image.url)),`Missing project picture: ${image.url}`);
  }
  assert.equal(data.projects[0].gallery.length,4);
  assert.throws(()=>validate('projects',[{...data.projects[0],flow:Array(7).fill('Step')}]));
  assert.throws(()=>validate('projects',[{...data.projects[0],technicalNotes:[{title:'Invalid',body:'x'.repeat(501)}]}]));
});
test('credential metadata survives validation and unsafe verification or certificate links fail',()=>{
  const credential=data.notes[0];assert.deepEqual(validate('notes',[credential]),[credential]);
  assert.throws(()=>validate('notes',[{...credential,sourceUrl:'javascript:alert(1)'}]));
  assert.throws(()=>validate('notes',[{...credential,certificateUrl:'https://user:secret@example.test/file.pdf'}]));
  assert.throws(()=>validate('notes',[{...credential,credentialType:'AWS-certified'}]));
});
test('published certificate files participate in existing media-reference permissions',()=>{
  const id='a1d0b8df-e9b3-451a-899b-a8e1dcb91e35';
  assert.deepEqual(mediaIds({...data.notes[0],imageUrl:`/api/media?id=${id}`,certificateUrl:`/api/media?id=${id}`}),[id]);
});

test('Journey follows the confirmed career order and stays within the admin schema',()=>{
  assert.deepEqual(data.journey.map(item=>item.id),['university','airbornehrs','robotics-club','think-computers','academic-recognition']);
  assert.deepEqual(data.journey.map(item=>item.sortOrder),[0,1,2,3,4]);
  assert.equal(data.journey[2].date,null);assert.equal(data.journey[4].date,null);
  assert.equal(data.journey.some(item=>item.kind==='project'),false);
  assert.match(data.journey[4].summary,/top 10.*two academic years/);
  assert.deepEqual(validate('journey',Array.from({length:100},(_,i)=>({...data.journey[0],id:'chapter-'+i,sortOrder:i}))).length,100);
  assert.throws(()=>validate('journey',Array.from({length:101},(_,i)=>({...data.journey[0],id:'chapter-'+i,sortOrder:i}))));
});
