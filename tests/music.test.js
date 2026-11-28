'use strict';
const {loadApp,sleep,clone}=require('./helpers/app');const fs=require('fs'),path=require('path');
const fx=n=>fs.readFileSync(path.join(__dirname,'fixtures',n),'utf8');
module.exports={name:'Temas con repasos espaciados y repertorio (bloque E)',run:async({ok})=>{
  const a=await loadApp(),HT=a.HT,doc=a.doc,w=a.window;doc.querySelectorAll('dialog').forEach(d=>d.remove());
  const S=()=>HT.S;S().settings.todayOverride='2026-10-21';const sid=S().subjects[0].id,steps=HT.REV_STEPS;
  const addD=(d,n)=>HT.addD(d,n);
  /* ---------- datos y migración ---------- */
  ok(Array.isArray(S().topics)&&Array.isArray(S().pieces)&&HT.SCHEMA===5&&JSON.stringify(steps)==='[1,3,7,14,30,60,120]','datos nuevos: temas y piezas, formato 5, intervalos 1·3·7·14·30·60·120');
  const v4=clone(S());delete v4.topics;delete v4.pieces;v4.schema=4;const m4=HT.migrate(v4);ok(m4.schema===5&&m4.topics.length===0&&m4.pieces.length===0,'migración 4→5 añade las listas sin tocar nada más');
  const m1=HT.migrate(JSON.parse(fx('legacy-schema1-v1.json')));ok(m1.schema===5&&m1.topics.length===0&&m1.projects.length===0,'una copia del formato 1 migra en cadena hasta el 5');
  /* ---------- repasos espaciados ---------- */
  const t=HT.newTopic({title:'Modos griegos',subject:sid,start:'2026-10-21'});S().topics.push(t);
  ok(t.step===0&&t.next==='2026-10-22'&&t.status==='active'&&!!t.mod,'tema nuevo: primer repaso al día siguiente');
  ok(HT.topicsDue('2026-10-21').length===0&&HT.topicsDue('2026-10-22').length===1,'no vence antes de su día y sí el día que toca');
  HT.reviewTopic(t,'good','2026-10-22');ok(t.step===1&&t.next==='2026-10-25'&&t.last==='2026-10-22'&&t.history.length===1,'«Bien»: avanza y el siguiente es a los 3 días');
  HT.reviewTopic(t,'good','2026-10-25');ok(t.step===2&&t.next===addD('2026-10-25',7),'«Bien» otra vez: 7 días');
  HT.reviewTopic(t,'ok','2026-11-01');ok(t.step===2&&t.next===addD('2026-11-01',4),'«Regular»: no avanza y repite con la mitad de espera (4 días)');
  HT.reviewTopic(t,'good','2026-11-05');HT.reviewTopic(t,'good','2026-11-19');HT.reviewTopic(t,'good','2026-12-19');ok(t.step===5&&t.next===addD('2026-12-19',60),'sigue ampliando: 14, 30, 60 días');
  HT.reviewTopic(t,'good','2027-02-17');HT.reviewTopic(t,'good','2027-06-17');ok(t.step===6&&t.next===addD('2027-06-17',120),'el último intervalo (120 días) es el máximo');
  HT.reviewTopic(t,'bad','2027-10-15');ok(t.step===0&&t.next==='2027-10-16'&&t.history.length===9,'«Mal»: vuelve al principio (mañana) y se conserva el historial');
  t.status='done';ok(HT.topicsDue('2030-01-01').length===0,'un tema dominado no vuelve a salir');t.status='active';t.step=0;t.next='2026-10-20';t.history=[];HT.save();
  /* ---------- Hoy ---------- */
  HT.UI.tab='hoy';HT.UI.date='2026-10-21';HT.render();let app=doc.getElementById('app');
  ok(app.textContent.includes('Repasos de hoy')&&app.textContent.includes('Modos griegos')&&app.textContent.includes('vencido hace 1 día'),'Hoy muestra el grupo de repasos con lo que toca (aunque esté atrasado)');
  HT.UI.date='2026-10-22';HT.render();ok(!doc.getElementById('app').textContent.includes('Repasos de hoy'),'en otros días no aparece');HT.UI.date='2026-10-21';HT.render();
  [...doc.querySelectorAll('#app button')].find(b=>b.textContent==='✓ Bien').click();
  ok(t.step===1&&t.next==='2026-10-24'&&t.last==='2026-10-21'&&!doc.getElementById('app').textContent.includes('Repasos de hoy'),'pulsar «Bien»: se reprograma y desaparece de Hoy');
  /* ---------- formularios y pestañas ---------- */
  const fld=(dl,label)=>[...dl.querySelectorAll('label.f')].find(l=>l.firstChild.textContent===label).querySelector('input,select,textarea');
  const set=(el,v)=>{el.value=v;el.dispatchEvent(new w.Event('input'));el.dispatchEvent(new w.Event('change'))};
  const btn=(root,tx)=>[...root.querySelectorAll('button')].find(b=>b.textContent===tx);
  HT.UI.tab='estudio';HT.UI.estTab='ses';HT.render();ok(['Sesiones','Temas y repasos','Repertorio'].every(x=>btn(doc,x)),'Estudio tiene tres subpestañas');
  btn(doc,'Temas y repasos').click();ok(doc.getElementById('app').textContent.includes('Temas y repasos espaciados')&&doc.getElementById('app').textContent.includes('Modos griegos'),'subpestaña de temas');
  btn(doc,'+ Tema').click();let dl=doc.querySelector('dialog[open]');btn(dl,'Guardar').click();ok(S().topics.length===1&&!!doc.querySelector('dialog[open]'),'un tema sin título no se guarda');
  set(fld(dl,'Tema (qué quieres repasar)'),'Cadencias');set(fld(dl,'Fecha en que lo estudiaste'),'2026-10-20');btn(dl,'Guardar').click();
  const nt=S().topics[1];ok(S().topics.length===2&&nt.title==='Cadencias'&&nt.next==='2026-10-21'&&nt.step===0,'tema nuevo con su primer repaso un día después de estudiarlo');
  ok(doc.getElementById('app').textContent.includes('hoy'),'la lista indica cuándo toca');
  [...doc.querySelectorAll('#app .item')].find(r=>r.textContent.includes('Cadencias')).querySelector('.row').click();dl=doc.querySelector('dialog[open]');set(fld(dl,'Próximo repaso'),'2026-10-30');btn(dl,'Guardar').click();ok(S().topics[1].next==='2026-10-30','se puede mover el próximo repaso');
  [...doc.querySelectorAll('#app .item')].find(r=>r.textContent.includes('Cadencias')).querySelector('.row').click();btn(doc.querySelector('dialog[open]'),'Eliminar').click();ok(S().topics.length===1,'borrar un tema');
  /* ---------- repertorio ---------- */
  const timeHab=S().habits.find(h=>h.type==='qty'&&h.unit==='min')||(()=>{const x={id:'hMin',name:'Saxo (práctica)',cat:S().cats[0].id,type:'qty',mode:'daily',sense:'min',nature:'habit',unit:'min',od:60,ow:null,om:null,freq:null,from:'',to:'',noct:false,days:[],active:true,role:''};S().habits.push(x);return x})();HT.save();
  btn(doc,'Repertorio').click();btn(doc,'+ Pieza').click();dl=doc.querySelector('dialog[open]');btn(dl,'Guardar').click();ok((S().pieces||[]).length===0,'una pieza sin título no se guarda');
  set(fld(dl,'Título'),'Sonata en Mib');set(fld(dl,'Instrumento (hábito de práctica)'),timeHab.id);set(fld(dl,'Tempo objetivo (bpm, opcional)'),'120');set(fld(dl,'Fecha de la actuación o entrega (opcional)'),'2026-11-30');btn(dl,'Guardar').click();
  const pc=S().pieces[0];ok(S().pieces.length===1&&pc.title==='Sonata en Mib'&&pc.tempo===120&&pc.instrument===timeHab.id&&pc.status==='learning'&&!!pc.mod,'pieza nueva guardada');
  /* sesión con pieza y tempo desde el formulario */
  HT.UI.tab='hoy';HT.UI.date='2026-10-21';HT.render();btn(doc.getElementById('app'),'+ Sesión').click();dl=doc.querySelector('dialog[open]');
  ok(!![...fld(dl,'Pieza o repertorio (opcional)').options].find(o=>o.value===pc.id)&&!!fld(dl,'Tempo alcanzado (bpm, opcional)'),'el formulario de sesión ofrece pieza y tempo');
  set(fld(dl,'Asignatura o hábito (instrumento)'),timeHab.id);set(fld(dl,'Minutos'),'30');set(fld(dl,'Pieza o repertorio (opcional)'),pc.id);set(fld(dl,'Tempo alcanzado (bpm, opcional)'),'96');btn(dl,'Guardar').click();
  const ss=S().sessions[S().sessions.length-1];ok(ss.piece===pc.id&&ss.bpm===96&&ss.min===30,'la sesión guarda pieza y tempo');
  HT.addSession({date:'2026-10-19',ref:timeHab.id,min:30,piece:pc.id,bpm:80});HT.addSession({date:'2026-10-20',ref:timeHab.id,min:30,piece:pc.id,bpm:100});HT.addSession({date:'2026-10-18',ref:timeHab.id,min:20,piece:pc.id,bpm:null});
  const st=HT.pieceStats(pc);ok(st.sessions===4&&st.min===110&&st.lastBpm===96&&st.bestBpm===100&&Math.abs(st.tempoPct-0.8)<1e-9&&st.daysSince===0&&st.series.length===3&&st.daysLeft===40,'estadísticas: sesiones, minutos, tempo actual, máximo, % del objetivo y días que faltan');
  ok(doc.getElementById('app').textContent.includes('🎼 Sonata en Mib')&&doc.getElementById('app').textContent.includes('♩=96'),'la lista de sesiones muestra pieza y tempo');
  HT.UI.tab='estudio';HT.UI.estTab='musica';HT.render();const tm=doc.getElementById('app').textContent;
  ok(tm.includes('Sonata en Mib')&&tm.includes('4 sesiones')&&tm.includes('♩=96 de ♩=120')&&tm.includes('80 %')&&!tm.includes('NaN')&&!tm.includes('undefined'),'seguimiento musical: tiempo, tempo y porcentaje');
  ok(doc.querySelectorAll('.cols .c').length===3,'gráfico de evolución del tempo');
  /* borrar la pieza: copia previa y sesiones conservadas */
  const n0=(await HT.listSnaps()).length;[...doc.querySelectorAll('#app h3')].find(x=>x.textContent==='Sonata en Mib').closest('.row').click();btn(doc.querySelector('dialog[open]'),'Eliminar').click();await sleep(400);
  ok(S().pieces.length===0&&S().sessions.filter(x=>x.min).length>=4&&S().sessions.every(x=>!x.piece),'borrar la pieza conserva las sesiones, solo les quita el enlace');
  const pre=(await HT.listSnaps()).find(s=>/borrar la pieza/.test(s.reason));ok((await HT.listSnaps()).length>n0&&pre,'antes de borrar se guardó una copia recuperable');
  await HT.restoreSnapshot(pre.id);ok(S().pieces.length===1&&S().sessions.some(x=>x.piece===pc.id),'…y se puede recuperar');
  /* ---------- exportar, importar, validar ---------- */
  const exp=JSON.parse(HT.exportData());ok(exp.topics.length===1&&exp.pieces.length===1&&exp.meta.counts.topics===1&&exp.meta.counts.pieces===1,'la exportación incluye temas y piezas con su recuento');
  ok(HT.analyzeImport(JSON.stringify(exp)).ok&&HT.analyzeImport(JSON.stringify(exp)).warnings.length===0,'se valida sin avisos');
  const dup=clone(exp);dup.pieces.push(clone(dup.pieces[0]));ok(HT.analyzeImport(JSON.stringify(dup)).errors.some(x=>/repetidos/.test(x)),'piezas con identificador repetido: se rechaza');
  const orph=clone(exp);orph.topics[0].subject='fantasma';orph.sessions[0].piece='fantasma';const ao=HT.analyzeImport(JSON.stringify(orph));ok(ao.ok&&ao.warnings.some(x=>/temas apuntan/.test(x))&&ao.warnings.some(x=>/sesiones apuntan/.test(x)),'enlaces rotos: solo avisa');
  const cur=clone(S()),imp=clone(S());imp.topics=[{id:'rX',title:'Otro',subject:'',step:0,next:'2026-11-01',status:'active',history:[]}];imp.pieces=[{id:'mX',title:'Otra pieza',status:'learning'}];
  const mg=HT.applyImport(cur,imp,{mode:'sel',sets:{topics:'merge'}});ok(mg.topics.length===2&&mg.pieces.length===1&&mg.sessions.length===cur.sessions.length,'importar solo temas (añadir): no toca lo demás');
  ok(HT.applyImport(cur,imp,{mode:'sel',sets:{pieces:'replace'}}).pieces.length===1&&HT.applyImport(cur,imp,{mode:'sel',sets:{pieces:'replace'}}).pieces[0].id==='mX','importar solo repertorio (reemplazar)');
  const old=HT.analyzeImport(fx('legacy-schema1-v5.json'));ok(old.ok&&old.data.topics.length===0&&old.data.pieces.length===0,'una copia antigua se importa con temas y piezas vacíos');
  /* ---------- persistencia ---------- */
  HT.save();const nt0=S().topics.length,np0=S().pieces.length,due0=HT.topicsDue('2026-10-24').length;const dump={};for(let i=0;i<w.localStorage.length;i++){const k=w.localStorage.key(i);dump[k]=w.localStorage.getItem(k)}a.close();
  const b=await loadApp({storage:dump});ok(b.HT.S.topics.length===nt0&&b.HT.S.pieces.length===np0&&b.HT.topicsDue('2026-10-24').length===due0&&b.HT.pieceStats(b.HT.S.pieces[0]).sessions===4,'al volver a abrir, temas, piezas y sus cálculos siguen igual');b.close();
}};
