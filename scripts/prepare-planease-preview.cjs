'use strict';
const fs=require('node:fs/promises');const path=require('node:path');
const commit='7dc20ef222704f91929982e64aba345aa93dd29a';
async function run(){const dir=path.join(__dirname,'../tmp/project-previews/planease');await fs.mkdir(path.join(dir,'js'),{recursive:true});for(const name of ['homepage.html','homepage-new.css','animated-background.css']){const response=await fetch(`https://raw.githubusercontent.com/vedanshmehrotra/PlanEase/${commit}/${name}`);if(!response.ok)throw new Error(`${name}: HTTP ${response.status}`);await fs.writeFile(path.join(dir,name),await response.text());}
  // Interface-only fixture. These modules are never served by the portfolio.
  const modules={
    'auth.js':'export const requireAuth=()=>true; export const getAuthHeaders=()=>({});',
    'taskService.js':`export const loadTasks=async()=>[{_id:'sample-task',title:'Prepare release checklist',category:'Work',priority:'High',completed:false},{_id:'sample-done',title:'Review API routes',category:'Project',priority:'Medium',completed:true}]; export const getTaskDateCategory=task=>task.completed?'completed':'today'; export const deleteTask=()=>{}; export const editTask=()=>{};`,
    'noteService.js':`export const loadNotes=async()=>[{_id:'sample-note',name:'Deployment notes',description:'Keep the health check and rollback steps together.',alarmDate:'2026-01-15',alarmTime:'10:00'}]; export const getNoteDateCategory=()=> 'today'; export const deleteNote=()=>{}; export const editNote=()=>{};`,
    'notificationService.js':'export const checkAndScheduleNotifications=()=>{};',
    'quotes.js':`export const getRandomQuote=()=>({text:'A place for the things you need to do and remember.',author:'PlanEase'});`
  };for(const [name,content] of Object.entries(modules))await fs.writeFile(path.join(dir,'js',name),content);
  console.log('Prepared original PlanEase dashboard/CSS with explicit sample-data modules.');}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
