'use strict';
// Hand-authored pixel geometry, kept as editable SVG. No studio pixels change.
const fs=require('node:fs/promises');const path=require('node:path');
const c={ink:'#061422',edge:'#28445b',muted:'#365b70',mint:'#8cd6ba',light:'#d1e5d5',gold:'#e5b96e',blue:'#6dadd0',red:'#d68978',paper:'#d5c9a6'};
const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c[color]||color}"/>`;
const line=(d,color,width=2)=>`<path d="${d}" fill="none" stroke="${c[color]}" stroke-width="${width}"/>`;
const base=(title,inside)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 96" shape-rendering="crispEdges"><title>${title}</title>${rect(0,0,160,96,'ink')}${rect(8,8,144,1,'edge')}${rect(8,87,144,1,'edge')}${rect(8,8,1,80,'edge')}${rect(151,8,1,80,'edge')}${[18,34,50,66,82,98,114,130].map(x=>rect(x,18,1,1,'muted')+rect(x,77,1,1,'muted')).join('')}${inside}</svg>`;
const covers={
  pathforge:base('PathForge · code and branching paths',[
    rect(34,23,92,50,'edge'),rect(37,26,86,44,'ink'),rect(37,26,86,7,'muted'),rect(41,28,2,2,'red'),rect(46,28,2,2,'gold'),rect(51,28,2,2,'mint'),
    line('M55 41h-4v4h-4v7h4v4h4','mint',3),line('M105 41h4v4h4v7h-4v4h-4','mint',3),
    line('M70 61V44h20V38M70 51h19v10','gold',3),rect(67,58,6,6,'mint'),rect(87,35,6,6,'gold'),rect(86,58,6,6,'blue'),rect(67,41,6,6,'light'),rect(29,73,102,3,'muted'),rect(65,76,30,3,'edge')
  ].join('')),
  resolveflow:base('ResolveFlow · one message, several teams',[
    line('M80 58V40M46 35v9h68v-9','mint',2),rect(32,24,28,17,'muted'),rect(35,27,22,11,'ink'),rect(43,29,6,4,'blue'),rect(40,34,12,2,'blue'),
    rect(66,22,28,17,'muted'),rect(69,25,22,11,'ink'),rect(77,27,6,4,'gold'),rect(74,32,12,2,'gold'),
    rect(100,24,28,17,'muted'),rect(103,27,22,11,'ink'),rect(111,29,6,4,'red'),rect(108,34,12,2,'red'),
    rect(55,54,50,24,'mint'),rect(58,57,44,18,'edge'),line('M58 57l12 8h20l12-8','light',2),line('M58 75l12-10M102 75l-12-10','mint',2),rect(77,47,6,6,'gold')
  ].join('')),
  'automated-cicd-framework':base('Automated CI/CD · cloud releases and recovery',[
    rect(68,23,25,7,'blue'),rect(59,30,42,8,'blue'),rect(54,38,52,8,'blue'),rect(63,33,34,10,'edge'),
    line('M80 47v11M44 60h72','gold',2),rect(31,55,25,21,'muted'),rect(34,58,19,15,'ink'),rect(36,61,3,3,'mint'),rect(42,61,8,2,'blue'),rect(36,67,14,2,'edge'),
    rect(68,55,25,21,'muted'),rect(71,58,19,15,'ink'),rect(73,61,3,3,'mint'),rect(79,61,8,2,'blue'),rect(73,67,14,2,'edge'),
    rect(105,55,25,21,'muted'),rect(108,58,19,15,'ink'),rect(110,61,3,3,'mint'),rect(116,61,8,2,'blue'),rect(110,67,14,2,'edge'),
    line('M43 52V45h8M117 79v4H43v-4','mint',2),line('M114 81l3 3 3-3','mint',2),rect(115,48,6,4,'gold')
  ].join('')),
  planease:base('PlanEase · tasks, notes and a pencil',[
    rect(48,22,52,55,'edge'),rect(52,19,52,55,'paper'),rect(52,19,8,55,'muted'),rect(57,22,1,49,'ink'),
    ...[29,41,53].map(y=>rect(66,y,6,6,'muted')+line(`M67 ${y+2}l1 2 3-4`,'mint',1)+rect(77,y+1,17,2,'edge')+rect(77,y+5,12,1,'muted')),
    rect(66,65,22,2,'muted'),rect(99,35,6,8,'gold'),rect(103,43,6,8,'gold'),rect(107,51,6,8,'gold'),rect(111,59,6,8,'gold'),rect(115,67,5,5,'paper'),rect(118,72,3,3,'ink'),rect(97,31,6,6,'red')
  ].join(''))
};
async function build(){const dir=path.join(__dirname,'../assets/projects');await fs.mkdir(dir,{recursive:true});for(const [id,svg] of Object.entries(covers))await fs.writeFile(path.join(dir,`${id}-cover.svg`),svg);console.log('Built four project covers from pixel geometry.');}
build().catch(error=>{console.error(error.message);process.exitCode=1;});
