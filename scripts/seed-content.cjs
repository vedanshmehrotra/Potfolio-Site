'use strict';
const fs=require('node:fs/promises');
const vm=require('node:vm');
const path=require('node:path');
async function fixtures(){
  const sandbox={window:{}};vm.createContext(sandbox);
  for(const file of ['projects.js','about.js','content.js'])vm.runInContext(await fs.readFile(path.join(__dirname,'..',file),'utf8'),sandbox);
  const api=sandbox.window;
  return {projects:await api.projectRepository.listPublished(),about:await api.aboutRepository.getPublished(),journey:await api.journeyRepository.listPublished(),resume:await api.resumeRepository.getPublished(),notes:await api.notesRepository.listPublished()};
}
async function seed(client){
  const {validate,publishable}=require('../server/content.cjs');
  for(const [key,value] of Object.entries(await fixtures())){
    const data=validate(key,JSON.parse(JSON.stringify(value)));
    await client.query('INSERT INTO portfolio_sections(key,draft,published,published_at) VALUES($1,$2,$3,now()) ON CONFLICT(key) DO NOTHING',[key,JSON.stringify(data),JSON.stringify(publishable(data))]);
  }
}
module.exports={fixtures,seed};
