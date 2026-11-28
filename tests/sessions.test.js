'use strict';
const {loadApp,sleep,clone}=require('./helpers/app');const fs=require('fs'),path=require('path');
const fx=n=>fs.readFileSync(path.join(__dirname,'fixtures',n),'utf8');
module.exports={name:'Sesiones de estudio (bloque C): fuente única, cálculo, pantallas y datos',run:async({ok})=>{
  const a=await loadApp(),HT=a.HT,doc=a.doc,w=a.window;doc.querySelectorAll('dialog').forEach(d=>d.remove());
  const S=()=>HT.S,subj=S().subjects[0],sid=subj.id;S().settings.todayOverride='2026-10-21';
  const timeHab=S().habits.find(h=>h.type==='qty'&&h.unit==='min')||(()=>{const x={id:'hMin',name:'Saxo (práctica)',cat:S().cats[0].id,type:'qty',mode:'daily',sense:'min',nature:'habit',unit:'min',od:60,ow:null,om:null,freq:null,from:'',to:'',noct:false,days:[],active:true,role:''};S().habits.push(x);return x})();
  timeHab.od=60;timeHab.mode='daily';timeHab.sense='min';HT.save();
  const lit=S().habits.find(h=>h.type==='qty'&&h.unit==='L');
  /* ---------- datos y migración ---------- */
  ok(Array.isArray(S().sessions)&&S().sessions.length===0&&HT.SCHEMA===5,'datos nuevos: lista de sesiones vacía y formato 5');
  const v2=clone(S());delete v2.sessions;v2.schema=2;const m=HT.migrate(v2);ok(m.schema===5&&Array.isArray(m.sessions),'migración 2→4 añade las sesiones sin tocar nada más');
  const old=HT.migrate(JSON.parse(fx('legacy-schema1-v1.json')));ok(old.schema===5&&old.sessions.length===0&&old.meta.migratedFrom===1,'una copia del formato 1 migra de 1 a 5 en cadena');
  /* ---------- una sesión suma a la asignatura (sin tocar lo manual) ---------- */
  HT.setLog('2026-10-20',sid,1);HT.addSession({date:'2026-10-20',ref:sid,min:45,activity:'Estudio'});
  ok(HT.S.logs['2026-10-20'][sid]===1,'lo apuntado a mano no se modifica');
  ok(Math.abs(HT.rawTotal(sid,'2026-10-20')-1.75)<1e-9&&Math.abs(HT.sessSum(sid,'2026-10-20')-0.75)<1e-9,'horas del día = manual (1 h) + sesión (45 min) = 1,75 h');
  const noClass=(d)=>HT.dayStudy(d)-HT.dayClassHours(d);ok(Math.abs(noClass('2026-10-20')-1.75)<1e-9,'las horas de estudio del día incluyen la sesión');
  ok(Math.abs(HT.subjManual(HT.S.subjects.find(x=>x.id===sid),'2026-10-14','2026-10-21')-1.75)<1e-9,'el total de la asignatura incluye la sesión');
  HT.addSession({date:'2026-10-20',ref:sid,min:15});ok(Math.abs(HT.sessSum(sid,'2026-10-20')-1)<1e-9,'varias sesiones el mismo día se suman');
  ok(HT.sessSum(sid,'2026-10-19')===null&&HT.rawTotal(sid,'2026-10-19')===undefined||HT.rawTotal(sid,'2026-10-19')===null||HT.rawTotal(sid,'2026-10-19')===HT.S.logs['2026-10-19'],'un día sin sesiones no cambia');
  /* ---------- una sesión suma al hábito (instrumento) ---------- */
  HT.addSession({date:'2026-10-20',ref:timeHab.id,min:40});ok(HT.sessSum(timeHab.id,'2026-10-20')===40,'sesión de un hábito en minutos: +40 min');
  ok(HT.score(timeHab,'2026-10-20')<1,'40 de 60 min: aún no cumple');HT.setLog('2026-10-20',timeHab.id,20);ok(HT.score(timeHab,'2026-10-20')===1&&HT.S.logs['2026-10-20'][timeHab.id]===20,'20 min a mano + 40 min en sesiones = 60: cumple, y lo manual sigue en 20');
  const ev=HT.evalHabit(timeHab,'2026-10-14','2026-10-21');ok(ev.met===1&&ev.ev===1,'los cálculos del hábito (cumplimiento) usan el total');
  timeHab.unit='h';timeHab.od=1;ok(Math.abs(HT.sessSum(timeHab.id,'2026-10-20')-40/60)<1e-9,'si el hábito está en horas, convierte minutos a horas');timeHab.unit='min';timeHab.od=60;
  if(lit){HT.addSession({date:'2026-10-20',ref:lit.id,min:30});ok(HT.sessSum(lit.id,'2026-10-20')===null,'un hábito que no es de tiempo (litros) ignora las sesiones');}
  HT.setLog('2026-10-22',timeHab.id,'rest');HT.addSession({date:'2026-10-22',ref:timeHab.id,min:30});ok(HT.rawTotal(timeHab.id,'2026-10-22')==='rest','«Descanso» manual manda sobre las sesiones');
  /* ---------- clases y estudio siguen separados ---------- */
  const cl=HT.S.classes[0];HT.setLog('2026-10-19','a:'+cl.id,'yes');const ch0=HT.dayClassHours('2026-10-19');HT.addSession({date:'2026-10-19',ref:sid,min:60});
  ok(HT.dayClassHours('2026-10-19')===ch0&&ch0>0&&HT.attStats('2026-10-14','2026-10-21').yes>=1,'las sesiones no cambian horas de clase ni asistencia');
  ok(HT.S.sessions.every(x=>!('cls' in x)&&!HT.S.classes.some(c=>c.id===x.ref)),'las sesiones no se asocian a clases');
  /* ---------- pantalla Hoy ---------- */
  HT.UI.tab='hoy';HT.UI.date='2026-10-20';HT.render();const app=doc.getElementById('app');
  ok(app.textContent.includes('Sesiones de estudio y práctica')&&app.textContent.includes('+ Sesión'),'Hoy tiene el grupo de sesiones');
  ok(app.textContent.includes('+ 1 h en sesiones')||/\+ 1(,\d+)? h en sesiones/.test(app.textContent),'junto a las horas manuales se indica lo que viene de sesiones');
  const inp=[...app.querySelectorAll('input[type=number]')].find(i=>i.getAttribute('aria-label')===subj.name+' (horas)');ok(inp&&+inp.value===1,'la casilla manual muestra solo lo manual (no duplica las sesiones)');
  ok(app.textContent.includes('en sesiones'),'el hábito muestra los minutos de sesiones');
  /* ---------- formulario ---------- */
  const fld=(dl,label)=>[...dl.querySelectorAll('label.f')].find(l=>l.firstChild.textContent===label).querySelector('input,select,textarea');
  const set=(el,v)=>{el.value=v;el.dispatchEvent(new w.Event('input'));el.dispatchEvent(new w.Event('change'))};
  [...app.querySelectorAll('button')].find(b=>b.textContent==='+ Sesión').click();let dl=doc.querySelector('dialog[open]');
  ok(dl&&dl.textContent.includes('Nueva sesión')&&dl.textContent.includes('Crear hábito de práctica'),'el formulario abre con opción de crear un hábito de práctica');
  const n0=HT.S.sessions.length;[...dl.querySelectorAll('button')].find(b=>b.textContent==='Guardar').click();ok(HT.S.sessions.length===n0&&!!doc.querySelector('dialog[open]'),'sin asignatura ni minutos no se guarda');
  set(fld(dl,'Asignatura o hábito (instrumento)'),timeHab.id);set(fld(dl,'Minutos'),'25');set(fld(dl,'Tipo de trabajo'),'Práctica');set(fld(dl,'Objetivo de la sesión (opcional)'),'Escalas');
  [...dl.querySelectorAll('button')].find(b=>b.textContent==='Guardar').click();
  const nuevo=HT.S.sessions[HT.S.sessions.length-1];ok(HT.S.sessions.length===n0+1&&nuevo.ref===timeHab.id&&nuevo.min===25&&nuevo.activity==='Práctica'&&nuevo.goal==='Escalas'&&nuevo.date==='2026-10-20','una sesión nueva se guarda con sus datos');
  ok(doc.getElementById('app').textContent.includes('Escalas'),'aparece en la lista del día');
  ok(Math.abs(HT.sessSum(timeHab.id,'2026-10-20')-65)<1e-9,'y suma al hábito (40 + 25 = 65 min)');
  /* editar y borrar */
  const row=[...doc.querySelectorAll('#app .item')].find(r=>r.textContent.includes('Escalas'));row.click();dl=doc.querySelector('dialog[open]');set(fld(dl,'Minutos'),'30');[...dl.querySelectorAll('button')].find(b=>b.textContent==='Guardar').click();
  ok(HT.S.sessions.find(x=>x.id===nuevo.id).min===30,'editar una sesión');
  [...doc.querySelectorAll('#app .item')].find(r=>r.textContent.includes('Escalas')).click();dl=doc.querySelector('dialog[open]');[...dl.querySelectorAll('button')].find(b=>b.textContent==='Eliminar').click();
  ok(!HT.S.sessions.some(x=>x.id===nuevo.id),'borrar una sesión');
  /* ---------- historial ---------- */
  HT.UI.tab='estudio';HT.UI.sessP=30;HT.UI.sessRef='';HT.render();const t=doc.getElementById('app').textContent;
  ok(t.includes('Horas por semana')&&t.includes('Reparto en el periodo')&&doc.querySelectorAll('.cols .c').length===8,'pantalla Estudio: horas por semana (8) y reparto');
  ok(/\d+ sesiones/.test(t)&&doc.querySelectorAll('#app .item').length>=3,'lista de sesiones con total del periodo');
  HT.UI.sessRef=timeHab.id;HT.render();ok([...doc.querySelectorAll('#app .item b')].every(b=>b.textContent===timeHab.name),'filtrar por asignatura o hábito');
  /* ---------- deshacer, exportar, importar, validar ---------- */
  const ns=HT.S.sessions.length;HT.addSession({date:'2026-10-21',ref:sid,min:10});HT.undo();ok(HT.S.sessions.length===ns,'deshacer quita la última sesión añadida (y se recalculan los totales)');
  const exp=JSON.parse(HT.exportData());ok(exp.sessions.length===ns&&exp.meta.counts.sessions===ns,'la exportación incluye las sesiones y su recuento');
  ok(HT.analyzeImport(JSON.stringify(exp)).ok&&HT.analyzeImport(JSON.stringify(exp)).warnings.length===0,'la exportación con sesiones se valida sin avisos');
  const dup=clone(exp);dup.sessions.push(clone(dup.sessions[0]));ok(HT.analyzeImport(JSON.stringify(dup)).errors.some(x=>/repetidos/.test(x)),'sesiones con identificador repetido: se rechaza');
  const cur=clone(HT.S),imp=clone(HT.S);imp.sessions=[{id:'xNEW',date:'2026-10-18',ref:sid,min:50,activity:'Estudio',goal:'',notes:''}];
  const mg=HT.applyImport(cur,imp,{mode:'sel',sets:{sessions:'merge'}});ok(mg.sessions.length===cur.sessions.length+1&&mg.habits.length===cur.habits.length,'importar solo sesiones (añadir): suma las nuevas y no toca nada más');
  const rp=HT.applyImport(cur,imp,{mode:'sel',sets:{sessions:'replace'}});ok(rp.sessions.length===1,'importar solo sesiones (reemplazar)');
  const noSess=HT.analyzeImport(fx('legacy-schema1-v5.json'));ok(noSess.ok&&noSess.data.sessions.length===0,'una copia antigua sin sesiones se importa con la lista vacía');
  /* ---------- persistencia ---------- */
  HT.save();const dump={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);dump[k]=w.localStorage.getItem(k)}a.close();
  const b=await loadApp({storage:dump});ok(b.HT.S.sessions.length===ns&&Math.abs(b.HT.sessSum(sid,'2026-10-20')-1)<1e-9,'al volver a abrir, las sesiones siguen y los totales se recalculan');
  ok(!/cron[oó]metro/i.test(b.doc.getElementById('app').textContent),'sigue sin haber cronómetro');b.close();
}};
