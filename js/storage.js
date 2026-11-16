'use strict';
/* =====================================================================
   ALMACENAMIENTO SEGURO — versión del formato, migraciones, copias
   internas recuperables, validación e importación.
   Reglas que no se rompen:
   · La clave de almacenamiento histórica NO cambia (KEY) ni el campo v:1,
     para que cualquier versión anterior siga leyendo los datos.
   · Una carga fallida NUNCA sobrescribe tus datos (modo recuperación).
   · Antes de importar, restaurar o borrar se crea una copia recuperable.
   ===================================================================== */
const KEY='mi-tracker-v1';
const SCHEMA=2;                     // versión interna del formato (v:1 se mantiene por compatibilidad)
const APP_VERSION='6.0';
const SNAP_KEEP={manual:12,auto:7};
let LAST=null,FRESH=false,NOSAVE=false,LOADERR=null,PREMIG=null;
const UNDO=[],REDO=[];
const STORAGE={error:null,idbError:null,lastOk:null,notified:0};

/* ---------- migraciones encadenadas (schema N → N+1) ---------- */
function fillDefaults(d){/*FILL_BODY*/
  return d}
const MIGRATIONS={
  /* 1 → 2: datos de las versiones 1–5 (sin campo schema). Solo añade lo que falta; no cambia ni borra nada. */
  1:d=>{d.schema=2;d.meta=Object.assign({createdAt:new Date().toISOString()},d.meta||{});d.meta.migratedFrom=1;return d}
};
function migrate(d){
  let v=d.schema||1;
  while(v<SCHEMA){const f=MIGRATIONS[v];if(!f)break;d=f(d);v=d.schema||v+1}
  return fillDefaults(d);
}

/* ---------- validación ---------- */
const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
function validateData(d,opt){
  opt=opt||{};const E=[],W=[],addIdProblem=m=>(opt.lenient?W:E).push(m);
  if(!d||typeof d!=='object'||Array.isArray(d)){E.push('El contenido no son datos de Mi Tracker.');return{errors:E,warnings:W}}
  if(d.v!==1)E.push('Formato desconocido (v='+d.v+').');
  if(d.schema&&d.schema>SCHEMA)E.push('Los datos se crearon con una versión más nueva de la app (formato '+d.schema+', esta app entiende hasta el '+SCHEMA+'). Actualiza la app antes de usarlos.');
  const must={settings:'o',habits:'a',cats:'a',centers:'a',subjects:'a',classes:'a',tasks:'a',logs:'o'};
  for(const k in must){const t=d[k];if(must[k]==='a'?!Array.isArray(t):(!t||typeof t!=='object'||Array.isArray(t)))E.push('Falta o está dañado el bloque «'+k+'».')}
  if(E.length)return{errors:E,warnings:W};
  const ids=(arr,name)=>{const seen=new Set();let bad=0,dup=0;arr.forEach(x=>{if(!x||typeof x!=='object'||!x.id)bad++;else{if(seen.has(x.id))dup++;seen.add(x.id)}});
    if(bad)addIdProblem(name+': '+bad+' elementos sin identificador.');if(dup)addIdProblem(name+': '+dup+' identificadores repetidos.');return seen};
  const hs=ids(d.habits,'Hábitos'),cs=ids(d.cats,'Categorías'),ks=ids(d.centers,'Centros'),ss=ids(d.subjects,'Asignaturas'),ls=ids(d.classes,'Clases');
  ['tasks','events','holidays','overrides','diary','blocks'].forEach(k=>{if(d[k]!==undefined){if(!Array.isArray(d[k]))E.push('El bloque «'+k+'» está dañado.');else ids(d[k],k)}});
  let badDates=0,orph=0,orphA=0;
  for(const date in d.logs){if(!DATE_RE.test(date)||isNaN(Date.parse(date))){badDates++;continue}const L=d.logs[date];if(!L||typeof L!=='object'){badDates++;continue}
    for(const k in L){if(k==='_s')continue;if(k.indexOf('a:')===0){if(!ls.has(k.slice(2)))orphA++}else if(!hs.has(k)&&!ss.has(k))orph++}}
  if(badDates)E.push('Registros con fecha no válida: '+badDates+'.');
  if(orph+orphA)W.push((orph+orphA)+' registros apuntan a hábitos, asignaturas o clases que no existen (se conservan, pero no se ven).');
  const nh=d.habits.filter(x=>x&&!cs.has(x.cat)).length;if(nh)W.push(nh+' hábitos sin categoría válida.');
  const ns=d.subjects.filter(x=>x&&!ks.has(x.center)).length;if(ns)W.push(ns+' asignaturas sin centro válido.');
  const nc=d.classes.filter(x=>x&&!ss.has(x.subject)).length;if(nc)W.push(nc+' clases sin asignatura válida.');
  return{errors:E,warnings:W};
}
function countsOf(d){
  const dates=Object.keys(d.logs||{}).sort(),n=k=>Array.isArray(d[k])?d[k].length:0;
  return{habits:n('habits'),cats:n('cats'),subjects:n('subjects'),classes:n('classes'),tasks:n('tasks'),events:n('events'),holidays:n('holidays'),blocks:n('blocks'),diary:n('diary'),logDays:dates.length,from:dates[0]||null,to:dates[dates.length-1]||null};
}
function dataHash(d){const c=Object.assign({},d);delete c.meta;const s=JSON.stringify(c);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(16).padStart(8,'0')+'-'+s.length}
function exportData(){
  const d=JSON.parse(JSON.stringify(S));d.schema=SCHEMA;
  d.meta=Object.assign({},d.meta||{},{app:'mi-tracker',appVersion:APP_VERSION,exportedAt:new Date().toISOString(),counts:countsOf(d),hash:dataHash(d)});
  return JSON.stringify(d,null,1);
}

/* ---------- carga y guardado seguros ---------- */
function isQuota(e){return!!e&&(e.name==='QuotaExceededError'||e.code===22||e.code===1014||/quota/i.test(String(e.message||'')))}
function load(){
  let raw=null;
  try{raw=localStorage.getItem(KEY)}catch(e){STORAGE.error={op:'leer',msg:String(e&&e.message||e),quota:false}}
  if(raw===null||raw===undefined){S=migrate(seed());S.meta=Object.assign({createdAt:new Date().toISOString()},S.meta||{});FRESH=true;LAST=null;if(!STORAGE.error)save();return}
  let d=null,reason='';
  try{d=JSON.parse(raw)}catch(e){reason='El contenido guardado no se puede leer (está dañado o incompleto).'}
  if(d){const v=validateData(d,{lenient:true});if(v.errors.length)reason=v.errors.join(' ')}
  if(reason){LOADERR={raw,reason};NOSAVE=true;S=migrate(seed());LAST=null;return}
  const from=d.schema||1;if(from<SCHEMA)PREMIG={raw,from};
  S=migrate(d);LAST=JSON.stringify(S);
}
function persist(j){
  try{localStorage.setItem(KEY,j);STORAGE.error=null;STORAGE.lastOk=Date.now();return true}
  catch(e){STORAGE.error={op:'guardar',msg:String(e&&e.message||e),quota:isQuota(e)};if(typeof storageAlert==='function')storageAlert();return false}
}
function save(){
  if(!S||!Array.isArray(S.habits)||!Array.isArray(S.subjects))return false;     // nunca guardar algo roto
  const j=JSON.stringify(S);
  if(LAST!==null&&j!==LAST){UNDO.push(LAST);if(UNDO.length>40)UNDO.shift();REDO.length=0}
  LAST=j;
  if(NOSAVE)return false;                                                        // modo recuperación: no se escribe nada
  const ok=persist(j);if(ok)idbMirror(j);return ok;
}
function undo(){if(!UNDO.length){toast('Nada que deshacer');return}REDO.push(LAST);const j=UNDO.pop();S=migrate(JSON.parse(j));LAST=j;if(!NOSAVE)persist(j);render();toast('Deshecho')}
function redo(){if(!REDO.length){toast('Nada que rehacer');return}UNDO.push(LAST);const j=REDO.pop();S=migrate(JSON.parse(j));LAST=j;if(!NOSAVE)persist(j);render();toast('Rehecho')}

/* ---------- IndexedDB: copia espejo (kv) y copias recuperables (snap) ---------- */
const IDB={
  open(){return new Promise((res,rej)=>{if(typeof indexedDB==='undefined'||!indexedDB)return rej(new Error('IndexedDB no disponible'));
    let r;try{r=indexedDB.open('mi-tracker',2)}catch(e){return rej(e)}
    r.onupgradeneeded=()=>{const db=r.result;['kv','snap'].forEach(s=>{if(!db.objectStoreNames.contains(s))db.createObjectStore(s)})};
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error||new Error('error al abrir IndexedDB'));r.onblocked=()=>rej(new Error('IndexedDB bloqueada'))})},
  async run(store,mode,fn){const db=await this.open();return new Promise((res,rej)=>{const tx=db.transaction(store,mode);let req;try{req=fn(tx.objectStore(store))}catch(e){return rej(e)}tx.oncomplete=()=>res(req&&req.result);tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error||new Error('transacción cancelada'))})},
  set(k,v){return this.run('kv','readwrite',s=>s.put(v,k))},
  get(k){return this.run('kv','readonly',s=>s.get(k))},
  put(store,k,v){return this.run(store,'readwrite',s=>s.put(v,k))},
  all(store){return this.run(store,'readonly',s=>s.getAll())},
  del(store,k){return this.run(store,'readwrite',s=>s.delete(k))}
};
let idbTimer=null;function idbMirror(j){clearTimeout(idbTimer);idbTimer=setTimeout(()=>{IDB.set('data',j).then(()=>{STORAGE.idbError=null}).catch(e=>{STORAGE.idbError=String(e&&e.message||e)})},800)}

/* ---------- copias internas recuperables ---------- */
const SNAPFB='mi-tracker-snap-fallback';
async function snapshot(reason,raw,kind){
  const json=raw!==undefined?raw:JSON.stringify(S);let counts=null,corrupt=false;
  try{counts=countsOf(JSON.parse(json))}catch(e){corrupt=true}
  const ts=new Date().toISOString(),rec={id:ts+'-'+Math.random().toString(36).slice(2,6),ts,reason:reason||'copia',kind:kind||(corrupt?'damaged':'manual'),corrupt,counts,size:json.length,json};
  try{await IDB.put('snap',rec.id,rec);STORAGE.idbError=null;await pruneSnaps();return rec.id}
  catch(e){STORAGE.idbError=String(e&&e.message||e);
    try{localStorage.setItem(SNAPFB,JSON.stringify(rec));return rec.id}catch(e2){throw e}}
}
async function listSnaps(){
  let recs=[];try{recs=await IDB.all('snap')||[]}catch(e){STORAGE.idbError=String(e&&e.message||e)}
  try{const f=localStorage.getItem(SNAPFB);if(f){const r=JSON.parse(f);if(r&&!recs.some(x=>x.id===r.id))recs.push(r)}}catch(e){}
  return recs.sort((a,b)=>b.ts.localeCompare(a.ts));
}
async function getSnap(id){const all=await listSnaps();return all.find(x=>x.id===id)||null}
async function delSnap(id){try{await IDB.del('snap',id)}catch(e){}try{const f=JSON.parse(localStorage.getItem(SNAPFB)||'null');if(f&&f.id===id)localStorage.removeItem(SNAPFB)}catch(e){}}
async function pruneSnaps(){
  const all=await IDB.all('snap');all.sort((a,b)=>b.ts.localeCompare(a.ts));
  const man=all.filter(x=>x.kind!=='auto'),aut=all.filter(x=>x.kind==='auto');
  for(const x of man.slice(SNAP_KEEP.manual))await IDB.del('snap',x.id);
  for(const x of aut.slice(SNAP_KEEP.auto))await IDB.del('snap',x.id);
}
/* Crea una copia previa antes de una operación destructiva. Devuelve false si el usuario decide no seguir. */
async function protect(reason){
  try{await snapshot('Antes de: '+reason);return true}
  catch(e){return typeof confirm==='function'?confirm('No se pudo crear la copia de seguridad previa ('+String(e&&e.message||e)+'). ¿Continuar igualmente?'):false}
}
const hasData=()=>!!S&&(Object.keys(S.logs).length>0||S.tasks.length>0||S.diary.length>0||S.events.length>0);
async function autoSnapshot(){
  if(!S||!hasData()||NOSAVE)return false;let meta={};try{meta=JSON.parse(localStorage.getItem('mi-tracker-meta')||'{}')||{}}catch(e){}
  const d=realToday();if(meta.lastAuto===d)return false;
  await snapshot('Copia automática diaria',undefined,'auto');meta.lastAuto=d;try{localStorage.setItem('mi-tracker-meta',JSON.stringify(meta))}catch(e){}return true;
}
async function restoreSnapshot(id){
  const rec=await getSnap(id);if(!rec)throw new Error('La copia ya no existe');if(rec.corrupt)throw new Error('Esa copia contiene datos dañados: solo se puede descargar');
  const d=JSON.parse(rec.json),v=validateData(d,{lenient:true});if(v.errors.length)throw new Error(v.errors.join(' '));
  await snapshot('Antes de restaurar la copia del '+rec.ts.slice(0,10));
  S=migrate(d);LAST=null;NOSAVE=false;LOADERR=null;save();return true;
}

/* ---------- importación: análisis, vista previa y aplicación ---------- */
function analyzeImport(text){
  const out={ok:false,errors:[],warnings:[],data:null,counts:null,info:{}};let d;
  try{d=JSON.parse(text)}catch(e){out.errors.push('El archivo no es un JSON válido.');return out}
  const v=validateData(d);out.errors=v.errors;out.warnings=v.warnings.slice();if(out.errors.length)return out;
  if(d.meta&&d.meta.hash){if(dataHash(JSON.parse(JSON.stringify(d)))!==d.meta.hash)out.warnings.push('La huella de integridad no coincide: el archivo pudo modificarse o dañarse después de exportarlo.');else out.info.hashOk=true}
  else out.warnings.push('La copia no incluye huella de integridad (es de una versión anterior).');
  out.info.fromSchema=d.schema||1;out.info.exportedAt=(d.meta&&d.meta.exportedAt)||null;
  const m=migrate(JSON.parse(JSON.stringify(d)));out.data=m;out.counts=countsOf(m);out.ok=true;return out;
}
const IMPORT_SETS={
  habits:{label:'Hábitos y categorías (con sus registros diarios)',arrays:['cats','habits']},
  study:{label:'Asignaturas, centros y horario (con asistencia y horas de estudio)',arrays:['centers','subjects','classes','overrides']},
  tasks:{label:'Tareas',arrays:['tasks']},
  events:{label:'Eventos, festivos y bloques fijos',arrays:['events','holidays','blocks']},
  diary:{label:'Diario',arrays:['diary']},
  settings:{label:'Ajustes',arrays:[]}
};
function logBelongs(set,k,ids){return set==='habits'?(k==='_s'||ids.habits.has(k)):set==='study'?(ids.subjects.has(k)||k.indexOf('a:')===0):false}
/* plan: {mode:'all'} | {mode:'sel',sets:{habits:'replace'|'merge',...}} · no modifica cur ni imp */
function applyImport(cur,imp,plan){
  const clone=x=>JSON.parse(JSON.stringify(x));
  if(plan.mode==='all')return migrate(clone(imp));
  const out=clone(cur),ids={habits:new Set([...cur.habits,...imp.habits].map(x=>x.id)),subjects:new Set([...cur.subjects,...imp.subjects].map(x=>x.id))};
  for(const set of Object.keys(plan.sets||{})){const act=plan.sets[set];if(!act||!IMPORT_SETS[set])continue;
    if(set==='settings'){out.settings=act==='replace'?Object.assign({},imp.settings):Object.assign({},imp.settings,out.settings);continue}
    for(const a of IMPORT_SETS[set].arrays){const src=imp[a]||[];
      if(act==='replace')out[a]=clone(src);else{out[a]=out[a]||[];const have=new Set(out[a].map(x=>x.id));src.forEach(x=>{if(!have.has(x.id))out[a].push(clone(x))})}}
    if(set==='habits'||set==='study'){
      if(act==='replace')for(const d of Object.keys(out.logs)){for(const k of Object.keys(out.logs[d]))if(logBelongs(set,k,ids))delete out.logs[d][k];if(!Object.keys(out.logs[d]).length)delete out.logs[d]}
      for(const d of Object.keys(imp.logs)){for(const k of Object.keys(imp.logs[d])){if(!logBelongs(set,k,ids))continue;const L=out.logs[d]||(out.logs[d]={});if(act==='replace'||L[k]===undefined)L[k]=clone(imp.logs[d][k])}}}
  }
  return migrate(out);
}
/* ---------- estado del almacenamiento y recordatorio de copia ---------- */
async function storageHealth(){
  const h={bytes:LAST?LAST.length*2:0,limitLS:5*1024*1024,usage:null,quota:null,persisted:null,idb:true,snaps:0,lastSnap:null,error:STORAGE.error,idbError:STORAGE.idbError};
  try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();h.usage=e.usage;h.quota=e.quota}}catch(e){}
  try{if(navigator.storage&&navigator.storage.persisted)h.persisted=await navigator.storage.persisted()}catch(e){}
  try{const l=await listSnaps();h.snaps=l.length;h.lastSnap=l[0]?l[0].ts:null}catch(e){h.idb=false}
  if(STORAGE.idbError)h.idb=false;return h;
}
function backupInfo(){
  const days=S.settings.backupDays,last=S.settings.lastExport||'',ago=last?Math.floor((pd(realToday())-pd(last))/864e5):null;
  return{last,ago,days,due:days>0&&hasData()&&(ago==null||ago>=days)};
}
