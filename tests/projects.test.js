'use strict';
const {loadApp,sleep,clone}=require('./helpers/app');const fs=require('fs'),path=require('path');
const fx=n=>fs.readFileSync(path.join(__dirname,'fixtures',n),'utf8');
module.exports={name:'Proyectos y objetivos (bloque D): progreso, pantallas, tareas y datos',run:async({ok})=>{
  const a=await loadApp(),HT=a.HT,doc=a.doc,w=a.window;doc.querySelectorAll('dialog').forEach(d=>d.remove());
  const S=()=>HT.S,sid=S().subjects[0].id;S().settings.todayOverride='2026-10-21';
  const near=(x,y)=>Math.abs(x-y)<1e-9;
  /* ---------- datos y migración ---------- */
  ok(Array.isArray(S().projects)&&Array.isArray(S().goals)&&HT.SCHEMA===5,'datos nuevos: listas de proyectos y objetivos, formato 5');
  const v3=clone(S());delete v3.projects;delete v3.goals;v3.schema=3;const m3=HT.migrate(v3);ok(m3.schema===5&&m3.projects.length===0&&m3.goals.length===0,'migración 3→4 añade las listas sin tocar nada más');
  const m1=HT.migrate(JSON.parse(fx('legacy-schema1-v1.json')));ok(m1.schema===5&&m1.projects.length===0&&m1.sessions.length===0,'una copia del formato 1 migra en cadena hasta el 4');
  /* ---------- progreso de objetivos ---------- */
  S().projects.push({id:'p1',name:'Memoria del máster',desc:'',subject:sid,from:'2026-10-14',due:'2026-10-31',status:'active'});
  HT.setLog('2026-10-20',sid,1);HT.addSession({date:'2026-10-20',ref:sid,min:45});
  S().goals.push({id:'g1',title:'5 h de estudio',project:'p1',kind:'hours',ref:sid,target:5,from:'2026-10-14',to:'2026-10-31'});
  let r=HT.goalProgress(S().goals[0]);ok(near(r.cur,1.75)&&near(r.pct,0.35)&&r.status==='on'&&r.unit==='h','objetivo de horas: cuenta lo manual (1 h) y las sesiones (45 min) = 1,75 h → 35 %');
  ok(r.exp>0.3&&r.exp<0.5,'calcula el ritmo esperado según las fechas ('+(r.exp&&r.exp.toFixed(2))+')');
  const timeHab=S().habits.find(h=>h.type==='qty'&&h.unit==='min')||(()=>{const x={id:'hMin',name:'Saxo (práctica)',cat:S().cats[0].id,type:'qty',mode:'daily',sense:'min',nature:'habit',unit:'min',od:60,ow:null,om:null,freq:null,from:'',to:'',noct:false,days:[],active:true,role:''};S().habits.push(x);return x})();
  HT.setLog('2026-10-19',timeHab.id,30);HT.addSession({date:'2026-10-19',ref:timeHab.id,min:90});
  r=HT.goalProgress({kind:'hours',ref:timeHab.id,target:4,from:'2026-10-14',to:'2026-10-31'});ok(near(r.cur,2)&&near(r.pct,0.5),'objetivo de horas con un hábito en minutos: 30 + 90 min = 2 h de 4');
  S().tasks.push({id:'t1',subject:'',project:'p1',title:'Introducción',due:'2026-10-25',est:2,done:0,priority:'mid',status:'done',notes:'',sub:[]},{id:'t2',subject:'',project:'p1',title:'Bibliografía',due:'2026-10-28',est:2,done:0,priority:'mid',status:'todo',notes:'',sub:[]},{id:'t3',subject:'',project:'',title:'Otra cosa',due:'',est:1,done:0,priority:'low',status:'done',notes:'',sub:[]});
  r=HT.goalProgress({kind:'tasks',project:'p1'});ok(r.cur===1&&r.target===2&&near(r.pct,0.5),'objetivo de tareas: 1 de 2 hechas (no cuenta las de otros proyectos)');
  r=HT.goalProgress({kind:'manual',cur:3,target:12,unit:'obras'});ok(r.cur===3&&near(r.pct,0.25)&&r.unit==='obras','objetivo manual');
  ok(HT.goalProgress({kind:'manual',cur:5,target:5}).done===true&&HT.goalProgress({kind:'manual',cur:5,target:5}).status==='done','al llegar a la meta queda cumplido');
  ok(HT.goalProgress({kind:'manual',cur:1,target:5,to:'2026-10-20'}).status==='late'&&HT.goalProgress({kind:'manual',cur:1,target:5,to:'2026-10-25'}).status==='on','vencido solo si pasó la fecha sin llegar');
  ok(HT.goalProgress({kind:'tasks',project:'no-existe'}).pct===null,'sin tareas no hay porcentaje (no divide por cero)');
  const pp=HT.projectProgress(S().projects[0]);ok(near(pp.pct,0.35)&&pp.tasks===2&&pp.tasksDone===1&&pp.daysLeft===10,'progreso del proyecto: media de objetivos, tareas y días que quedan');
  /* ---------- pantalla y formularios ---------- */
  const fld=(dl,label)=>[...dl.querySelectorAll('label.f')].find(l=>l.firstChild.textContent===label).querySelector('input,select,textarea');
  const set=(el,v)=>{el.value=v;el.dispatchEvent(new w.Event('input'));el.dispatchEvent(new w.Event('change'))};
  const btn=(root,t)=>[...root.querySelectorAll('button')].find(b=>b.textContent===t);
  HT.UI.tab='proyectos';HT.render();const t0=doc.getElementById('app').textContent;
  ok(t0.includes('Memoria del máster')&&t0.includes('35 %')&&t0.includes('1/2 tareas')&&t0.includes('límite'),'la pantalla muestra el proyecto con su progreso, tareas y fecha límite');
  btn(doc,'+ Proyecto').click();let dl=doc.querySelector('dialog[open]');btn(dl,'Guardar').click();ok(S().projects.length===1&&!!doc.querySelector('dialog[open]'),'un proyecto sin nombre no se guarda');
  set(fld(dl,'Nombre'),'Repertorio de recital');set(fld(dl,'Fecha límite'),'2026-12-15');btn(dl,'Guardar').click();
  const np=S().projects[1];ok(S().projects.length===2&&np.name==='Repertorio de recital'&&np.due==='2026-12-15'&&np.status==='active'&&!!np.mod,'un proyecto nuevo se guarda con su fecha de modificación');
  btn(doc,'+ Objetivo en este proyecto')&&0;const addBtns=[...doc.querySelectorAll('#app button')].filter(b=>b.textContent==='+ Objetivo en este proyecto');addBtns[addBtns.length-1].click();dl=doc.querySelector('dialog[open]');
  ok(fld(dl,'Proyecto').value===np.id,'«+ Objetivo en este proyecto» ya viene con ese proyecto');
  btn(dl,'Guardar').click();ok(S().goals.length===1&&!!doc.querySelector('dialog[open]'),'objetivo sin título: no se guarda');
  set(fld(dl,'Objetivo'),'Estudiar 20 h de saxo');btn(dl,'Guardar').click();ok(S().goals.length===1,'objetivo de horas sin asignatura ni meta: no se guarda');
  set(fld(dl,'Asignatura o hábito'),timeHab.id);set(fld(dl,'Meta (horas)'),'20');btn(dl,'Guardar').click();
  const ng=S().goals[S().goals.length-1];ok(S().goals.length===2&&ng.kind==='hours'&&ng.ref===timeHab.id&&ng.target===20&&ng.project===np.id&&!!ng.mod,'objetivo de horas nuevo guardado');
  btn(doc,'+ Objetivo').click();dl=doc.querySelector('dialog[open]');set(fld(dl,'Objetivo'),'Entregar');set(fld(dl,'Cómo se mide'),'tasks');btn(dl,'Guardar').click();ok(S().goals.length===2,'objetivo de tareas sin proyecto: no se guarda');
  set(fld(dl,'Proyecto'),'p1');btn(dl,'Guardar').click();ok(S().goals.length===3&&S().goals[2].kind==='tasks','objetivo de tareas con proyecto');
  ok(!doc.getElementById('app').textContent.includes('NaN')&&!doc.getElementById('app').textContent.includes('undefined'),'la pantalla no muestra NaN ni undefined');
  /* editar y borrar objetivo */
  [...doc.querySelectorAll('#app .item')].find(r=>r.textContent.includes('Estudiar 20 h de saxo')).click();dl=doc.querySelector('dialog[open]');set(fld(dl,'Meta (horas)'),'10');btn(dl,'Guardar').click();ok(S().goals.find(x=>x.id===ng.id).target===10,'editar un objetivo');
  [...doc.querySelectorAll('#app .item')].find(r=>r.textContent.includes('Estudiar 20 h de saxo')).click();dl=doc.querySelector('dialog[open]');btn(dl,'Eliminar').click();ok(!S().goals.some(x=>x.id===ng.id),'borrar un objetivo');
  /* ---------- tareas enlazadas a proyecto ---------- */
  w.editTask({title:'',subject:'',project:'',assigned:'',due:'',est:null,done:0,priority:'mid',status:'todo',notes:''});dl=doc.querySelector('dialog[open]');
  ok([...fld(dl,'Proyecto (opcional)').options].some(o=>o.value==='p1'),'el formulario de tareas permite elegir proyecto');
  set(fld(dl,'Tarea / deberes'),'Capítulo 2');set(fld(dl,'Proyecto (opcional)'),'p1');btn(dl,'Guardar').click();
  ok(S().tasks.some(x=>x.title==='Capítulo 2'&&x.project==='p1')&&HT.projectProgress(S().projects[0]).tasks===3,'la tarea queda enlazada y cuenta en el proyecto');
  /* ---------- borrar proyecto: copia previa, objetivos fuera, tareas desenlazadas ---------- */
  const nSnap=(await HT.listSnaps()).length;HT.UI.tab='proyectos';HT.render();
  [...doc.querySelectorAll('#app h3')].find(x=>x.textContent.startsWith('Memoria')).closest('.row').click();dl=doc.querySelector('dialog[open]');btn(dl,'Eliminar').click();await sleep(400);
  ok(!S().projects.some(p=>p.id==='p1')&&!S().goals.some(g=>g.project==='p1')&&S().tasks.filter(x=>x.project).length===0&&S().tasks.some(x=>x.title==='Introducción'),'borrar un proyecto borra sus objetivos pero conserva sus tareas (sin proyecto)');
  const pre=(await HT.listSnaps()).find(s=>/borrar el proyecto/.test(s.reason));ok((await HT.listSnaps()).length>nSnap&&pre&&JSON.parse(pre.json).projects.some(p=>p.id==='p1'),'antes de borrar se guardó una copia recuperable');
  await HT.restoreSnapshot(pre.id);ok(S().projects.some(p=>p.id==='p1')&&S().goals.some(g=>g.project==='p1'),'…y se puede recuperar el proyecto con sus objetivos');
  /* ---------- exportar, importar, validar ---------- */
  const exp=JSON.parse(HT.exportData());ok(exp.projects.length===S().projects.length&&exp.meta.counts.projects===S().projects.length&&exp.meta.counts.goals===S().goals.length,'la exportación incluye proyectos y objetivos con su recuento');
  const an=HT.analyzeImport(JSON.stringify(exp));ok(an.ok&&an.warnings.length===0,'se valida sin avisos');
  const dup=clone(exp);dup.goals.push(clone(dup.goals[0]));ok(HT.analyzeImport(JSON.stringify(dup)).errors.some(x=>/repetidos/.test(x)),'objetivos con identificador repetido: se rechaza');
  const orph=clone(exp);orph.goals[0].project='fantasma';orph.tasks.push({id:'tx',title:'x',project:'fantasma',status:'todo',sub:[]});const ao=HT.analyzeImport(JSON.stringify(orph));ok(ao.ok&&ao.warnings.some(x=>/objetivos apuntan/.test(x))&&ao.warnings.some(x=>/tareas apuntan/.test(x)),'enlaces rotos: solo avisa');
  const cur=clone(S()),imp=clone(S());imp.projects=[{id:'pX',name:'Otro',status:'active'}];imp.goals=[{id:'gX',title:'Meta',project:'pX',kind:'manual',target:3,cur:1}];
  const mg=HT.applyImport(cur,imp,{mode:'sel',sets:{projects:'merge'}});ok(mg.projects.length===cur.projects.length+1&&mg.goals.length===cur.goals.length+1&&mg.tasks.length===cur.tasks.length,'importar solo proyectos (añadir): suma sin tocar lo demás');
  ok(HT.applyImport(cur,imp,{mode:'sel',sets:{projects:'replace'}}).projects.length===1,'importar solo proyectos (reemplazar)');
  const old=HT.analyzeImport(fx('legacy-schema1-v5.json'));ok(old.ok&&old.data.projects.length===0&&old.data.goals.length===0,'una copia antigua se importa con proyectos vacíos');
  /* ---------- persistencia ---------- */
  HT.save();const pct0=HT.projectProgress(S().projects[0]).pct,ng0=S().goals.length,np0=S().projects.length;const dump={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);dump[k]=w.localStorage.getItem(k)}a.close();
  const b=await loadApp({storage:dump});b.HT.S.settings.todayOverride='2026-10-21';ok(b.HT.S.projects.length===np0&&b.HT.S.goals.length===ng0&&near(b.HT.projectProgress(b.HT.S.projects[0]).pct,pct0),'al volver a abrir, proyectos y objetivos siguen y el progreso se recalcula');b.close();
}};
