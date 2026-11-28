'use strict';
/* =====================================================================
   COPIAS DE SEGURIDAD, IMPORTACIÓN, RECUPERACIÓN Y ESTADO DEL ALMACENAMIENTO (pantallas)
   La lógica (validar, migrar, aplicar, copias) está en storage.js.
   ===================================================================== */
function fmtTs(ts){const d=new Date(ts);return d.toLocaleDateString('es-ES')+' '+d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
const kbTxt=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB';
const cntTxt=c=>c?c.habits+' hábitos · '+c.subjects+' asignaturas · '+c.tasks+' tareas · '+c.diary+' diario · '+(c.sessions||0)+' sesiones · '+c.logDays+' días con registros':'datos dañados (no restaurable)';
function exportJSON(){
  try{const txt=exportData();download('mi-tracker-'+realToday()+'.json',txt,'application/json');S.settings.lastExport=realToday();save();toast('Copia exportada');render()}
  catch(e){toast('No se pudo exportar: '+(e&&e.message||e))}
}
function storageAlert(){if(Date.now()-STORAGE.notified>20000){STORAGE.notified=Date.now();if(typeof toast==='function')toast('⚠ No se pueden guardar los cambios: descarga una copia (Datos)')}}
function topBanners(app){
  if(NOSAVE)app.append(h('div',{class:'banner err'},'🛟 Modo recuperación: tus datos guardados NO se han tocado, pero lo que hagas ahora no se guarda. ',h('button',{class:'btn sm',onclick:showRecovery},'Abrir recuperación')));
  if(STORAGE.error)app.append(h('div',{class:'banner err'},'⚠ No se están guardando los cambios ('+(STORAGE.error.quota?'almacenamiento lleno':'almacenamiento no disponible o bloqueado')+'). ',h('button',{class:'btn sm',onclick:exportJSON},'Descargar copia ahora')));
  const b=backupInfo();
  if(b.due)app.append(h('div',{class:'banner'},'Última copia exportada: '+(b.last?fmtD(b.last)+' (hace '+b.ago+' días)':'nunca')+'. ',h('button',{class:'btn sm',onclick:exportJSON},'Exportar ahora')));
}
/* ---------- importación con vista previa ---------- */
function importFlow(file){
  const r=new FileReader();r.onload=()=>importPreview(String(r.result),file.name);r.onerror=()=>toast('No se pudo leer el archivo');r.readAsText(file);
}
function importPreview(text,name){
  const a=analyzeImport(text);
  if(!a.ok){dlg('No se puede importar',h('div',{},h('p',{},'«'+name+'»'),a.errors.map(e=>h('div',{class:'banner err'},e)),h('p',{class:'muted small'},'No se ha cambiado nada.')),()=>[h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close()}},'Cerrar')],'sheet');return}
  const cur=countsOf(S),im=a.counts,plan={mode:'all',sets:{}},body=h('div',{});
  const rows=[['Hábitos','habits'],['Categorías','cats'],['Asignaturas','subjects'],['Clases','classes'],['Tareas','tasks'],['Eventos','events'],['Festivos','holidays'],['Entradas del diario','diary'],['Sesiones de estudio','sessions'],['Proyectos','projects'],['Objetivos','goals'],['Temas','topics'],['Piezas','pieces'],['Días con registros','logDays']];
  const draw=()=>{
    body.innerHTML='';
    body.append(h('p',{class:'small muted'},'Archivo «'+name+'»'+(a.info.exportedAt?' · exportado el '+fmtTs(a.info.exportedAt):'')+' · formato '+a.info.fromSchema+(a.info.fromSchema<SCHEMA?' (se actualizará al formato '+SCHEMA+')':'')+(a.info.hashOk?' · integridad verificada ✓':'')));
    a.warnings.forEach(w=>body.append(h('div',{class:'banner'},w)));
    body.append(h('table',{},h('thead',{},h('tr',{},['','Ahora','En la copia'].map(x=>h('th',{},x)))),h('tbody',{},rows.map(([l,k])=>h('tr',{},h('td',{},l),h('td',{},cur[k]),h('td',{},im[k]))))));
    body.append(h('p',{class:'small muted'},'Registros: '+(cur.from?fmtDS(cur.from)+' → '+fmtDS(cur.to):'—')+' ahora · '+(im.from?fmtDS(im.from)+' → '+fmtDS(im.to):'—')+' en la copia.'));
    body.append(h('div',{class:'seg s2',style:'margin:10px 0'},[['all','Restaurar todo'],['sel','Elegir qué importar']].map(([k,l])=>h('button',{type:'button',class:plan.mode===k?'on yes':'','aria-pressed':String(plan.mode===k),onclick:()=>{plan.mode=k;draw()}},l))));
    if(plan.mode==='all')body.append(h('p',{class:'small'},'Sustituye TODOS tus datos actuales por los de la copia. Se guarda antes una copia de los actuales para poder volver atrás.'));
    else body.append(h('div',{},Object.entries(IMPORT_SETS).map(([k,d])=>h('label',{class:'f'},h('span',{},d.label),h('select',{'aria-label':d.label,onchange:e=>{plan.sets[k]=e.target.value}},[['','No importar'],['merge','Añadir lo que falte (no toca lo que ya tienes)'],['replace','Reemplazar por lo de la copia']].map(o=>h('option',{value:o[0],selected:(plan.sets[k]||'')===o[0]},o[1])))))));
  };
  draw();
  dlg('Importar copia: vista previa',body,()=>[h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close()}},'Cancelar'),
    h('button',{class:'btn pri',type:'button',onclick:async function(){
      if(plan.mode==='sel'&&!Object.values(plan.sets).some(Boolean)){toast('Elige al menos un bloque');return}
      const dlgEl=this.closest('dialog');if(!await protect('importar «'+name+'»'))return;
      try{S=applyImport(S,a.data,plan);if(plan.mode==='all'){NOSAVE=false;LOADERR=null}save();dlgEl.close();UI.date=null;render();toast('Copia importada. La copia previa está en Datos → Copias internas.')}
      catch(e){toast('No se pudo importar: '+(e&&e.message||e))}}},'Importar')],'sheet');
}
/* ---------- recuperación cuando los datos guardados no se pueden cargar ---------- */
async function showRecovery(){
  if(!LOADERR)return;
  const list=h('div',{},'Buscando copias internas…'),body=h('div',{},h('p',{},'No se han podido cargar tus datos guardados. ',h('b',{},'No se ha borrado nada.')),h('div',{class:'banner err'},LOADERR.reason),h('h3',{},'Copias internas disponibles'),list);
  const bar=close=>[
    h('button',{class:'btn',type:'button',onclick:()=>{download('datos-danados-'+realToday()+'.txt',LOADERR.raw,'text/plain')}},'Descargar los datos dañados'),
    h('button',{class:'btn dan',type:'button',onclick:async function(){
      if(!confirm('Se empezará con datos de ejemplo. Antes se guarda aparte una copia de lo que había. ¿Continuar?'))return;
      try{await snapshot('Datos dañados (guardados antes de empezar de nuevo)',LOADERR.raw,'damaged')}catch(e){if(!confirm('No se pudo guardar esa copia. ¿Continuar y perderla?'))return}
      try{localStorage.setItem('mi-tracker-damaged',LOADERR.raw)}catch(e){}
      NOSAVE=false;LOADERR=null;save();this.closest('dialog').close();render()}},'Empezar con datos de ejemplo'),
    h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close()}},'Seguir solo mirando')];
  const dg=dlg('Recuperación de datos',body,bar,'sheet');
  const items=[];
  try{(await listSnaps()).filter(x=>!x.corrupt).forEach(x=>items.push({title:fmtTs(x.ts)+' · '+x.reason,sub:cntTxt(x.counts),run:()=>restoreSnapshot(x.id)}))}catch(e){}
  try{const j=await IDB.get('data');if(j){const d=JSON.parse(j);if(!validateData(d,{lenient:true}).errors.length)items.push({title:'Copia espejo (último guardado correcto)',sub:cntTxt(countsOf(d)),run:async()=>{try{await snapshot('Datos dañados (guardados antes de restaurar el espejo)',LOADERR.raw,'damaged')}catch(e){}S=migrate(d);LAST=null;NOSAVE=false;LOADERR=null;save()}})}}catch(e){}
  list.innerHTML='';
  if(!items.length)list.append(h('p',{class:'muted'},'No hay copias internas. Si tienes una copia exportada (.json), puedes importarla desde Datos.'));
  items.forEach(it=>list.append(h('div',{class:'item'},h('div',{class:'name'},it.title,h('div',{class:'tgt'},it.sub)),h('button',{class:'btn sm',type:'button',onclick:async()=>{if(!confirm('¿Restaurar esta copia?'))return;try{await it.run();dg.close();render();toast('Copia restaurada')}catch(e){toast('No se pudo restaurar: '+(e&&e.message||e))}}},'Restaurar'))));
}
/* ---------- copias internas (Datos) ---------- */
function snapshotsCard(app){
  const box=h('div',{},h('p',{class:'muted small'},'Cargando…'));
  const draw=async()=>{
    let list=[];try{list=await listSnaps()}catch(e){}
    box.innerHTML='';
    if(!list.length)box.append(h('p',{class:'muted'},'Aún no hay copias internas. Se crean solas cada día y antes de importar, restaurar o borrar.'));
    list.forEach(x=>box.append(h('div',{class:'item'},h('div',{class:'name'},fmtTs(x.ts),' ',h('span',{class:'pill '+(x.kind==='auto'?'na':x.kind==='damaged'?'bad':'rest')},x.kind==='auto'?'automática':x.kind==='damaged'?'dañada':'previa'),h('div',{class:'tgt'},x.reason+' · '+cntTxt(x.counts)+' · '+kbTxt(x.size))),
      h('div',{class:'row'},x.corrupt?null:h('button',{class:'btn sm',onclick:async()=>{if(!confirm('Se restaurará esta copia (antes se guarda otra de tus datos actuales). ¿Continuar?'))return;try{await restoreSnapshot(x.id);UI.date=null;render();toast('Copia restaurada')}catch(e){toast('No se pudo restaurar: '+(e&&e.message||e))}}},'Restaurar'),
        h('button',{class:'btn sm',onclick:()=>download('copia-interna-'+x.ts.slice(0,10)+'.'+(x.corrupt?'txt':'json'),x.json,'application/json')},'Descargar'),
        h('button',{class:'btn sm dan',onclick:async()=>{if(confirm('¿Borrar esta copia interna?')){await delSnap(x.id);draw()}}},'Borrar')))));
  };
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h2',{style:'margin:0'},'Copias internas'),h('button',{class:'btn sm',onclick:async()=>{try{await snapshot('Copia manual');toast('Copia interna creada');draw()}catch(e){toast('No se pudo crear la copia: '+(e&&e.message||e))}}},'Crear copia ahora')),
    h('p',{class:'muted small'},'Se guardan en este navegador (IndexedDB): las últimas '+SNAP_KEEP.manual+' previas y '+SNAP_KEEP.auto+' automáticas. No sustituyen a las copias exportadas: si borras los datos del navegador, también se pierden.'),box));
  draw();
}
/* ---------- estado del almacenamiento y recordatorio (Datos) ---------- */
function storageCard(app){
  const box=h('div',{},h('p',{class:'muted small'},'Comprobando…')),st=S.settings,b=backupInfo();
  app.append(h('div',{class:'card'},h('h2',{},'Estado del almacenamiento'),box,
    h('label',{class:'f'},h('span',{},'Recordarme exportar una copia cada'),h('select',{'aria-label':'Recordatorio de copia',onchange:e=>{st.backupDays=+e.target.value;save();render()}},[[7,'7 días'],[14,'14 días'],[30,'30 días'],[0,'Nunca']].map(o=>h('option',{value:o[0],selected:+st.backupDays===o[0]},o[1])))),
    h('p',{class:'small'},'Última copia exportada: ',h('b',{},b.last?fmtD(b.last)+' (hace '+b.ago+' días)':'nunca'))));
  storageHealth().then(x=>{
    box.innerHTML='';
    const row=(t,v,cls)=>box.append(h('div',{class:'item'},h('span',{class:'name'},t),h('span',{class:'pill '+(cls||'na')},v)));
    row('Datos guardados',kbTxt(x.bytes)+' de unos '+kbTxt(x.limitLS),x.bytes>x.limitLS*.7?'mid':'good');
    if(x.usage!=null)row('Uso del navegador para esta web',kbTxt(x.usage)+(x.quota?' de '+kbTxt(x.quota):''));
    row('Almacenamiento persistente',x.persisted==null?'no consultable':x.persisted?'sí (el navegador no lo borrará solo)':'no garantizado',x.persisted?'good':'mid');
    row('Copia interna (IndexedDB)',x.idb?'disponible · '+x.snaps+' copias'+(x.lastSnap?' · última '+fmtTs(x.lastSnap):''):'NO disponible'+(x.idbError?': '+x.idbError:''),x.idb?'good':'bad');
    if(x.error)row('Error de guardado',(x.error.quota?'almacenamiento lleno':x.error.msg),'bad');
    if(x.persisted===false&&navigator.storage&&navigator.storage.persist)box.append(h('button',{class:'btn sm',onclick:async()=>{const ok=await navigator.storage.persist();toast(ok?'Almacenamiento persistente activado':'El navegador no lo ha concedido');render()}},'Pedir almacenamiento persistente'));
  }).catch(()=>{box.innerHTML='';box.append(h('p',{class:'muted'},'No se pudo comprobar el almacenamiento.'))});
}
