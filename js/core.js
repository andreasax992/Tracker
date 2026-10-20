'use strict';
/* =====================================================================
   MI TRACKER — todo editable. Los datos viven en tu navegador (localStorage).
   Haz copias de seguridad desde la pestaña «Datos».
   ===================================================================== */
const PALETTE=[['Turquesa','#0e9f94','#cff1ed'],['Morado','#6d3fc4','#e4daf6'],['Azul','#2f6fde','#dce8fb'],['Naranja','#d9731a','#fce5cc'],['Rosa','#d6336c','#fadce8'],['Verde','#2e9e4f','#d8f0df'],['Amarillo','#b58900','#fff3c4'],['Rojo','#c0392b','#f6d5d1'],['Marrón','#8d6e63','#e9dfda'],['Índigo','#3f51b5','#dadef3'],['Gris azulado','#546e7a','#dde5e9'],['Lima','#6b9a1e','#e6f2d3']];
const NAMES_ES={n:['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],f:['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'],m:['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']};
const NAMES_GL={n:['Lun','Mar','Mér','Xov','Ven','Sáb','Dom'],f:['Luns','Martes','Mércores','Xoves','Venres','Sábado','Domingo'],m:['Xaneiro','Febreiro','Marzo','Abril','Maio','Xuño','Xullo','Agosto','Setembro','Outubro','Novembro','Decembro']};
let DAYN=NAMES_ES.n.slice(),DAYF=NAMES_ES.f.slice(),MONN=NAMES_ES.m.slice();
function setNames(l){const N=l==='gl'?NAMES_GL:NAMES_ES;DAYN=N.n.slice();DAYF=N.f.slice();MONN=N.m.slice()}
const KEY='mi-tracker-v1';
let S=null; const UI={tab:'hoy',date:null,week:null,dash:{period:'all',cat:'',from:'',to:''},taskFilter:'pend'};

/* ---------- utilidades de fecha ---------- */
const pad=n=>String(n).padStart(2,'0');
const pd=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const fd=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const addD=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return fd(d)};
const wd=s=>{const g=pd(s).getDay();return g===0?7:g};
const monday=s=>addD(s,-(wd(s)-1));
const realToday=()=>fd(new Date());
const today=()=>S&&S.settings.todayOverride||realToday();
const dim=(y,m)=>new Date(y,m,0).getDate();
const fmtD=s=>{if(!s)return'';const [y,m,d]=s.split('-');return d+'/'+m+'/'+y};
const fmtDS=s=>{if(!s)return'';const [y,m,d]=s.split('-');return d+'/'+m};
function range(a,b){const r=[];for(let d=a;d<=b;d=addD(d,1))r.push(d);return r}
const tmin=v=>{if(typeof v!=='string')return null;const m=/^(\d{1,2}):(\d{2})$/.exec(v);return m?(+m[1])*60+(+m[2]):null};
const mtxt=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const rnd=x=>Math.round(x*1e9)/1e9;
const num=v=>typeof v==='number'&&isFinite(v);
const hrs=x=>(Math.round(x*100)/100).toString().replace('.',',');
const pct=x=>Math.round(x*100)+' %';
const uid=p=>p+Math.random().toString(36).slice(2,8);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- datos de ejemplo ---------- */
function seed(){
  const cats=[['Hábitos',0],['Planificación',2],['Rutina de mañana',3],['Rutina de noche',9],['Salud',5],['Sueño',10],['Medicación',4],['Práctica musical',1]].map((c,i)=>({id:'c'+(i+1),name:c[0],color:c[1]}));
  const C=n=>cats.find(c=>c.name===n).id;
  const hb=[];
  const add=(name,cat,type,o={})=>hb.push(Object.assign({id:'h'+(hb.length+1),name,cat:C(cat),type,mode:'daily',sense:'min',nature:'habit',unit:'',od:null,ow:null,om:null,freq:null,from:'',to:'',noct:false,days:[],active:true,role:'',study:false},o));
  add('Planificar el día','Planificación','yn');
  add('Revisión semanal','Planificación','yn',{mode:'freqWeek',freq:1});
  ['Gotas ojos (mañana)','Gel de la cara','Limpiador 1','Limpiador 2','Crema de pies','Crema de cara (mañana)','Crema de manos','Limar uñas'].forEach(n=>add(n,'Rutina de mañana','yn'));
  add('Cortar uñas (domingos)','Rutina de mañana','yn',{mode:'freqWeek',freq:1,days:[7]});
  add('Bálsamo (mañana)','Rutina de mañana','yn'); add('Lavarme los dientes (mañana)','Rutina de mañana','yn');
  ['Limpiar la cara (noche)','Crema (noche)','Bálsamo (noche)','Gotas ojos (noche)','Lavarme los dientes (noche)'].forEach(n=>add(n,'Rutina de noche','yn'));
  add('Hice caca','Salud','yn',{nature:'opt'});
  add('Agua','Salud','qty',{nature:'quant',unit:'L',od:2});
  add('Ejercicio','Salud','qty',{nature:'quant',unit:'min',mode:'freqWeek',od:30,freq:4});
  add('Lectura','Hábitos','qty',{nature:'quant',unit:'min',od:20});
  add('Saxo','Práctica musical','qty',{nature:'quant',unit:'min',mode:'freqWeek',od:60,freq:5});
  add('Piano','Práctica musical','qty',{nature:'quant',unit:'min',mode:'freqWeek',od:30,freq:4});
  add('Canto','Práctica musical','qty',{nature:'quant',unit:'min',mode:'freqWeek',od:20,freq:3});
  add('Técnica','Práctica musical','qty',{nature:'quant',unit:'min',mode:'freqWeek',od:20,freq:5});
  add('Lectura a vista','Práctica musical','qty',{nature:'quant',unit:'min',mode:'freqWeek',od:15,freq:4});
  add('Ensayo','Práctica musical','qty',{nature:'quant',unit:'min',mode:'totalWeek',ow:120});
  add('Hora de acostarse','Sueño','time',{sense:'max',from:'23:30',noct:true,role:'bed'});
  add('Hora de despertar','Sueño','time',{sense:'max',from:'07:30',role:'wake'});
  add('Concerta','Medicación','time',{sense:'between',from:'07:00',to:'09:30',role:'med'});
  add('Magnesio','Medicación','time',{sense:'between',from:'21:00',to:'23:00',role:'med'});
  const centers=[{id:'k1',name:'Conservatorio',color:6},{id:'k2',name:'Universidad',color:11},{id:'k3',name:'Curso de Administración',color:8},{id:'k4',name:'Otros',color:7}];
  const cons1=['Teoría de la educación I','Teoría y ritmo I','Coro Galego I','Técnica vocal I','Pedagogía musical','Didáctica del Lenguaje Musical I','Sociología de la Educación','Acústica general','Música de cámara','Conxunto I','Dirección I','Coro I','Piano Aplicado I','Improvisación y acompañamiento I','Coreografía y Danza I'];
  const sj=[];
  const sadd=(name,center,term,o={})=>sj.push(Object.assign({id:'s'+(sj.length+1),name,center,term,start:'',end:'',active:true,wk:null,minAtt:null,maxAbs:null},o));
  cons1.forEach(n=>sadd(n,'k1','1'));
  [1,2,3].forEach(i=>sadd('Universidad - Asignatura '+i,'k2','all'));
  sadd('Curso de Administración','k3','custom',{start:'2026-10-15'});
  for(let i=1;i<=3;i++)sadd('2º cuatr. - Conservatorio '+i,'k1','2');
  const S1=n=>sj.find(s=>s.name===n).id;
  const cl=[];
  const c=(day,a,b,n,room,teacher)=>cl.push({id:'l'+(cl.length+1),day,start:a,end:b,subject:S1(n),room,teacher,notes:''});
  c(1,'12:00','14:00','Teoría de la educación I','Aula 3.06','Janet Salinas');c(1,'14:00','15:00','Teoría y ritmo I','Aula 3.06','Janet Salinas');
  c(1,'16:00','18:00','Coro Galego I','Orquesta','Nuria Lorenzo');c(1,'18:00','19:00','Técnica vocal I','Aula 1.03','Nuria Lorenzo');
  c(1,'19:00','21:30','Pedagogía musical','Aula 3.06','Adriana García');
  c(2,'10:00','12:00','Didáctica del Lenguaje Musical I','Aula 3.06','Adriana García');
  c(3,'10:00','12:00','Didáctica del Lenguaje Musical I','Aula 3.06','Adriana García');c(3,'13:30','15:30','Sociología de la Educación','Aula 3.06','Janet Salinas');
  c(3,'15:00','16:00','Acústica general','Electroacústica','¿?');c(3,'17:00','18:30','Música de cámara','Aula 1.06','Pablo Coello');
  c(4,'10:00','11:30','Conxunto I','Aula 3.06','Adriana García');c(4,'11:30','13:30','Pedagogía musical','Aula 3.06','Adriana García');
  c(4,'12:00','13:30','Dirección I','Aula 2.00','Fernando Briones');c(4,'13:30','15:00','Coro I','Orquesta','Fernando Briones');
  c(4,'15:00','16:00','Piano Aplicado I','Aula 3.03','Katerina');c(4,'16:00','17:00','Improvisación y acompañamiento I','Aula 3.03','Katerina');
  c(5,'10:00','12:00','Coreografía y Danza I','Orquesta','Janet Salinas');
  return {v:1,settings:{start:'2026-10-14',red:.5,green:.9,minData:3,sleepGreen:7,sleepRed:6,t1s:'2026-09-01',t1e:'2027-01-31',t2s:'2027-02-01',t2e:'2027-06-30',lastExport:'',todayOverride:'',incArch:true,theme:'auto',font:100,lang:'es',pin:'',autoBackup:false,onboarded:false,compact:false,countClass:true,hv:{name:true,time:true,room:true,teacher:false,center:false,notes:false,att:false,blocks:false},clash:true,lunch:false,colw:140,rowh:56,planner:{perDay:3,from:'16:00',to:'22:00',weekends:true,mode:'due'},notif:false},
    cats,habits:hb,centers,subjects:sj,classes:cl,tasks:[],logs:{},events:[],holidays:[],overrides:[],diary:[],blocks:[],timer:null};
}
function migrate(d){const st=d.settings,def=seed().settings;['events','holidays','overrides','diary','blocks'].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]});if(d.timer===undefined)d.timer=null;d.tasks.forEach(t=>{if(!Array.isArray(t.sub))t.sub=[]});d.subjects.forEach(x=>{if(x.minAtt===undefined)x.minAtt=null;if(x.maxAbs===undefined)x.maxAbs=null});for(const k in def)if(st[k]===undefined)st[k]=def[k];for(const k in def.hv)if(st.hv[k]===undefined)st.hv[k]=def.hv[k];for(const k in def.planner)if(st.planner[k]===undefined)st.planner[k]=def.planner[k];return d}
let LAST=null,FRESH=false;const UNDO=[],REDO=[];
function load(){try{const r=localStorage.getItem(KEY);if(r){const d=JSON.parse(r);if(d&&d.v===1){S=migrate(d);LAST=JSON.stringify(S);return}}}catch(e){}S=seed();FRESH=true;LAST=null;save()}
function save(){const j=JSON.stringify(S);if(LAST!==null&&j!==LAST){UNDO.push(LAST);if(UNDO.length>40)UNDO.shift();REDO.length=0}LAST=j;try{localStorage.setItem(KEY,j)}catch(e){toast('No se pudo guardar: almacenamiento lleno o bloqueado')}idbMirror(j)}
function undo(){if(!UNDO.length){toast('Nada que deshacer');return}REDO.push(LAST);const j=UNDO.pop();S=migrate(JSON.parse(j));LAST=j;try{localStorage.setItem(KEY,j)}catch(e){}render();toast('Deshecho')}
function redo(){if(!REDO.length){toast('Nada que rehacer');return}UNDO.push(LAST);const j=REDO.pop();S=migrate(JSON.parse(j));LAST=j;try{localStorage.setItem(KEY,j)}catch(e){}render();toast('Rehecho')}

/* =====================================================================
   NÚCLEO DE CÁLCULO (mismas reglas que el Excel)
   ===================================================================== */
const catOf=id=>S.cats.find(c=>c.id===id);
const hab=id=>S.habits.find(h=>h.id===id);
const subj=id=>S.subjects.find(s=>s.id===id);
const center=id=>S.centers.find(c=>c.id===id)||{name:'—',color:10};
const colOf=i=>PALETTE[((i%12)+12)%12];
function applies(h,date){return !h.days||!h.days.length||h.days.includes(wd(date))}
function dayState(date){return (S.logs[date]||{})._s||''}
function raw(id,date){const v=(S.logs[date]||{})[id];return v===undefined?null:v}
const adj=(m,noct)=>noct&&m<720?m+1440:m;
/* 1 cumple, 0 no cumple, '-' no cuenta (descanso/no aplica/antes del inicio), null sin registrar */
function score(h,date){
  if(date<S.settings.start)return '-';
  if(!applies(h,date))return '-';
  if(dayState(date))return '-';
  const v=raw(h.id,date);
  if(v===null||v==='')return null;
  if(v==='rest'||v==='na')return '-';
  if(h.type==='yn')return v==='yes'?1:v==='no'?0:null;
  if(h.type==='qty'){
    if(!num(v)||h.mode==='totalWeek'||h.mode==='totalMonth'||!num(h.od))return null;
    return h.sense==='max'?(rnd(v)<=rnd(h.od)?1:0):(rnd(v)>=rnd(h.od*S.settings.green)?1:0);
  }
  if(h.type==='time'){
    if(v==='no')return 0;
    const m=tmin(v),a=tmin(h.from),b=tmin(h.to);if(m==null||a==null)return null;
    const x=adj(m,h.noct),A=adj(a,h.noct),B=b==null?A:adj(b,h.noct);
    if(h.sense==='between')return x>=A&&x<=B?1:0;
    return h.sense==='max'?(x<=A?1:0):(x>=A?1:0);
  }
  return null;
}
function rawNum(h,date){if(date<S.settings.start)return null;const v=raw(h.id,date);return num(v)?v:null}
const isWeekMode=h=>h.mode==='freqWeek'||h.mode==='totalWeek';
function weeksIn(from,to){const r=[];for(let m=addD(monday(from),-7);m<=addD(to,7);m=addD(m,7)){const ref=addD(m,3);if(ref>=from&&ref<=to)r.push({start:m,end:addD(m,6),len:7})}return r}
function monthsIn(from,to){const r=[];let y=pd(from).getFullYear(),mo=pd(from).getMonth()+1;
  for(;;){const s=y+'-'+pad(mo)+'-01',e=y+'-'+pad(mo)+'-'+pad(dim(y,mo));if(s>to)break;if(e>=from)r.push({start:s,end:e,len:dim(y,mo)});mo++;if(mo>12){mo=1;y++}}return r}
/* devuelve {met,ev} del hábito en [from,to] (sin contar días futuros) */
function evalHabit(h,from,to){
  const t=today();let met=0,ev=0;
  if(h.mode==='daily'){for(const d of range(from,to)){if(d>t)break;const s=score(h,d);if(s===1){met++;ev++}else if(s===0)ev++}return{met,ev}}
  const units=isWeekMode(h)?weeksIn(from,to):monthsIn(from,to);
  const freqMode=h.mode==='freqWeek'||h.mode==='freqMonth';
  for(const u of units){
    const days=range(u.start,u.end);let ex=0,rec=0,md=0,cnt=0,sm=0;
    for(const d of days){const s=score(h,d);if(s==='-')ex++;else if(s===1){rec++;md++}else if(s===0)rec++;const n=rawNum(h,d);if(n!=null){cnt++;sm+=n}}
    const avail=u.len-ex,ended=u.end<=t;
    if(freqMode){const neff=Math.min(h.freq||0,avail);if(rec>0&&neff>0&&(ended||md>=neff)){ev++;if(md>=neff)met++}}
    else{const obj=h.mode==='totalWeek'?h.ow:h.om;if(!num(obj))continue;const oe=obj*avail/u.len;
      const ok=h.sense==='max'?rnd(sm)<=rnd(oe):rnd(sm)>=rnd(oe*S.settings.green);
      if(cnt>0&&oe>0&&(ended||(h.sense!=='max'&&ok))){ev++;if(ok)met++}}
  }
  return{met,ev};
}
const counts=h=>h.nature==='habit'||h.nature==='quant';
function aggregate(from,to,filter){let met=0,ev=0;for(const h of S.habits){if(!h.active&&!S.settings.incArch)continue;if(!counts(h))continue;if(filter&&!filter(h))continue;const r=evalHabit(h,from,to);met+=r.met;ev+=r.ev}return{met,ev}}
const ratio=r=>r.ev>=S.settings.minData?r.met/r.ev:null;
function pctCls(p){return p==null?'':p<S.settings.red?'bad':p<S.settings.green?'mid':'good'}
function streak(h){
  if(h.mode!=='daily')return null;const t=today();let s=0,best=0;
  for(const d of range(S.settings.start,t)){const x=score(h,d);
    if(x===1)s++;else if(x==='-'){}else if(x===0)s=0;else if(d<t)s=0;
    if(s>best)best=s}
  return{cur:s,best};
}
/* ---------- estudio ---------- */
function termRange(s){
  const st=S.settings;let a='',b='';
  if(s.term==='1'){a=st.t1s;b=st.t1e}else if(s.term==='2'){a=st.t2s;b=st.t2e}else if(s.term==='all'){a=st.t1s;b=st.t2e}
  if(s.start)a=s.start;if(s.end)b=s.end;return{a:a||'0000-01-01',b:b||'9999-12-31'};
}
function subjActive(s,date){if(!s.active)return false;const r=termRange(s);return date>=r.a&&date<=r.b}
function subjManual(s,from,to){const t=today();let x=0;for(const d of range(from>S.settings.start?from:S.settings.start,to<t?to:t)){const v=raw(s.id,d);if(num(v))x+=v}return x}
function subjHours(s,from,to){return subjManual(s,from,to)+classHours(s,from,to)}
/* asistencia a clase: 'yes' asistí · 'no' no asistí · 'cancel' no hubo clase · 'just' falta justificada */
const durH=c=>(tmin(c.end)-tmin(c.start))/60;
const attOf=(c,date)=>raw('a:'+c.id,date);
const ATT=[['yes','Asistí','yes'],['no','No asistí','no'],['cancel','No hubo clase','na'],['just','Falta justificada','rest']];
const ATTI={yes:'✓',no:'✗',cancel:'∅',just:'J'};
function classHours(s,from,to){if(!S.settings.countClass)return 0;const t=today(),a=from>S.settings.start?from:S.settings.start,b=to<t?to:t;let x=0;
  for(const d of range(a,b))for(const c of classesOn(d))if(c.subject===s.id&&attOf(c,d)==='yes')x+=durH(c);return x}
function dayClassHours(date){if(!S.settings.countClass||date<S.settings.start)return 0;return classesOn(date).reduce((a,c)=>a+(attOf(c,date)==='yes'?durH(c):0),0)}
function attStats(from,to,sid){const t=today(),a=from>S.settings.start?from:S.settings.start,b=to<t?to:t,r={yes:0,no:0,cancel:0,just:0,hours:0};
  for(const d of range(a,b))for(const c of classesOn(d)){if(sid&&c.subject!==sid)continue;const v=attOf(c,d);if(r[v]!==undefined){r[v]++;if(v==='yes')r.hours+=durH(c)}}
  r.held=r.yes+r.no+r.just;r.rate=r.held?r.yes/r.held:null;return r}
function studyHours(from,to){return S.subjects.reduce((a,s)=>a+subjHours(s,from,to),0)}
function dayStudy(date){return date<S.settings.start?0:S.subjects.reduce((a,s)=>a+(num(raw(s.id,date))?raw(s.id,date):0),0)+dayClassHours(date)}
function sleepHours(date){
  const b=S.habits.find(h=>h.role==='bed'),w=S.habits.find(h=>h.role==='wake');if(!b||!w||date<S.settings.start)return null;
  const x=tmin(raw(b.id,date)),y=tmin(raw(w.id,date));if(x==null||y==null)return null;return(((y-x)%1440+1440)%1440)/60;
}
function sleepAvg(from,to){const t=today();const v=[];for(const d of range(from,to<t?to:t)){const h=sleepHours(d);if(h!=null)v.push(h)}return{avg:v.length?v.reduce((a,b)=>a+b,0)/v.length:null,n:v.length}}
function holidayOn(date,centerId){return S.holidays.find(x=>date>=x.from&&date<=(x.to||x.from)&&(!x.center||!centerId||x.center===centerId))||null}
function overrideOf(c,date){return S.overrides.find(o=>o.cls===c.id&&o.date===date)||null}
function classesOn(date){
  const out=[];
  for(const c of S.classes){if(c.day!==wd(date))continue;const sj=subj(c.subject);if(!sj||!subjActive(sj,date))continue;
    if(holidayOn(date,sj.center))continue;const ov=overrideOf(c,date);if(ov&&ov.cancel)continue;
    out.push(ov?Object.assign({},c,{start:ov.start||c.start,end:ov.end||c.end,room:ov.room!==undefined&&ov.room!==''?ov.room:c.room,_ov:ov.id}):c)}
  return out.sort((a,b)=>tmin(a.start)-tmin(b.start))}
function clashes(list){const out=new Set();for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j];if(tmin(a.start)<tmin(b.end)&&tmin(b.start)<tmin(a.end)){out.add(a.id);out.add(b.id)}}return out}
function subProg(t){const n=(t.sub||[]).length,d=(t.sub||[]).filter(x=>x.d).length;return{n,d}}
function taskPending(t){if(t.status==='done')return 0;const p=subProg(t);if(p.n&&(+t.est||0))return(+t.est||0)*(p.n-p.d)/p.n;return Math.max(0,(+t.est||0)-(+t.done||0))}
function taskState(t){if(t.status==='done')return'done';if(!t.due)return'nodate';const d=(pd(t.due)-pd(today()))/864e5;return d<0?'late':d===0?'today':d<=2?'soon':'ok'}
function period(){
  const t=today(),p=UI.dash.period,st=S.settings.start;let a=st,b=t;
  const d=pd(t);
  if(p==='month')a=fd(new Date(d.getFullYear(),d.getMonth(),1));
  else if(p==='prev'){a=fd(new Date(d.getFullYear(),d.getMonth()-1,1));b=fd(new Date(d.getFullYear(),d.getMonth(),0))}
  else if(p==='7')a=addD(t,-6);else if(p==='30')a=addD(t,-29);else if(p==='90')a=addD(t,-89);
  else if(p==='custom'){a=UI.dash.from||st;b=UI.dash.to||t}
  if(a<st)a=st;if(b>t)b=t;return{a,b};
}

/* ---------- huecos, planificador, calendario, resumen, recordatorios ---------- */
function subtract(free,s,e){const nf=[];for(const[x,y]of free){if(e<=x||s>=y)nf.push([x,y]);else{if(s>x)nf.push([x,s]);if(e<y)nf.push([e,y])}}return nf}
function noLunch(date){const cs=classesOn(date);if(!cs.length)return false;let free=[[780,960]];for(const c of cs)free=subtract(free,tmin(c.start),tmin(c.end));return!free.some(f=>f[1]-f[0]>=45)}
function plan(){
  const P=S.settings.planner,t=today(),a=tmin(P.from)==null?960:tmin(P.from),b=tmin(P.to)==null?1320:tmin(P.to),pr={high:0,mid:1,low:2};
  const tasks=S.tasks.filter(x=>x.status!=='done'&&taskPending(x)>0).sort((p,q)=>P.mode==='priority'?(pr[p.priority]-pr[q.priority]||(p.due||'9999').localeCompare(q.due||'9999')):((p.due||'9999').localeCompare(q.due||'9999')||pr[p.priority]-pr[q.priority]));
  const days={},warn=[],free={},cap={},hor=range(t,addD(t,27));
  for(const d of hor){if(wd(d)>5&&!P.weekends)continue;let f=[[a,b]];for(const c of classesOn(d))f=subtract(f,tmin(c.start),tmin(c.end));for(const bk of S.blocks)if(!(bk.days&&bk.days.length)||bk.days.includes(wd(d)))f=subtract(f,tmin(bk.start),tmin(bk.end));free[d]=f.map(x=>[Math.ceil(x[0]/30)*30,Math.floor(x[1]/30)*30]).filter(x=>x[1]-x[0]>=30);cap[d]=Math.round(P.perDay*60)}
  for(const x of tasks){let rem=Math.max(30,Math.round(taskPending(x)*2)*30);const last=x.due&&x.due>=t?x.due:addD(t,13);
    for(const d of hor){if(d>last||rem<=0)break;if(!free[d])continue;
      while(rem>0&&cap[d]>=30&&free[d].length){const f=free[d][0],len=Math.min(rem,cap[d],f[1]-f[0],120);
        (days[d]=days[d]||[]).push({task:x,from:f[0],to:f[0]+len});f[0]+=len;if(f[1]-f[0]<30)free[d].shift();cap[d]-=len;rem-=len}}
    if(rem>0)warn.push({task:x,missing:rem/60})}
  return{days,warn};
}
function makeICS(){
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mi Tracker//ES','CALSCALE:GREGORIAN'],dt=x=>x.replace(/-/g,''),hm=m=>m.replace(':','')+'00',e2=x=>String(x||'').replace(/[\\,;]/g,'\\$&').replace(/\n/g,'\\n');
  const stamp=realToday().replace(/-/g,'')+'T000000Z';
  for(const c of S.classes){const sj=subj(c.subject);if(!sj||!sj.active)continue;const r=termRange(sj);let a=r.a<S.settings.start?S.settings.start:r.a,b=r.b>'2100'?S.settings.t2e:r.b;
    let d=a;while(d<=b&&wd(d)!==c.day)d=addD(d,1);if(d>b)continue;
    L.push('BEGIN:VEVENT','UID:'+c.id+'@mi-tracker','DTSTAMP:'+stamp,'DTSTART:'+dt(d)+'T'+hm(c.start),'DTEND:'+dt(d)+'T'+hm(c.end),'RRULE:FREQ=WEEKLY;UNTIL='+dt(b)+'T235959','SUMMARY:'+e2(sj.name));
    const ex=[];for(let x=d;x<=b;x=addD(x,7)){const ov=overrideOf(c,x);if(holidayOn(x,sj.center)||(ov&&ov.cancel))ex.push(dt(x)+'T'+hm(c.start))}if(ex.length)L.push('EXDATE:'+ex.join(','));
    if(c.room)L.push('LOCATION:'+e2(c.room));if(c.teacher)L.push('DESCRIPTION:'+e2(c.teacher));L.push('END:VEVENT')}
  L.push('END:VCALENDAR');return L.join('\r\n');
}
function weekSummary(off){
  off=off||0;const t=today(),m=addD(monday(t),7*off),e=off<0?addD(m,6):(t<addD(m,6)?t:addD(m,6)),pm=addD(m,-7),pe=addD(pm,6);
  const f=x=>{const p=ratio(x);return p==null?'n/d':pct(p)},arrow=(a,b)=>a==null||b==null?'':(a>b+1e-9?' ▲':a<b-1e-9?' ▼':' =');
  const cur=aggregate(m,e),prev=aggregate(pm,pe),sh=studyHours(m,addD(m,6)),sp=studyHours(pm,pe),at=attStats(m,addD(m,6)),pend=S.tasks.filter(x=>x.status!=='done');
  const late=pend.filter(x=>taskState(x)==='late').length,soon=pend.filter(x=>x.due&&x.due>=t&&x.due<=addD(t,7)).length;
  return[(off<0?'Semana pasada: ':'Esta semana: ')+fmtDS(m)+' – '+fmtDS(addD(m,6)),'Cumplimiento: '+f(cur)+arrow(ratio(cur),ratio(prev))+' (semana anterior: '+f(prev)+')',
    'Horas de estudio y clase: '+hrs(sh)+' h'+arrow(sh,sp)+' (anterior: '+hrs(sp)+' h)',
    'Clases: '+at.yes+' asistidas, '+at.no+' no asistidas, '+at.just+' justificadas, '+at.cancel+' sin clase','Tareas: '+pend.length+' pendientes ('+hrs(pend.reduce((a,x)=>a+taskPending(x),0))+' h), '+late+' vencidas, '+soon+' con entrega en 7 días'];
}
function reminders(){
  const out=[],t=today(),pend=S.tasks.filter(x=>x.status!=='done');
  const late=pend.filter(x=>taskState(x)==='late').length,td=pend.filter(x=>taskState(x)==='today'),tm=pend.filter(x=>x.due===addD(t,1));
  if(late)out.push('⏰ Tienes '+late+' tarea'+(late>1?'s':'')+' vencida'+(late>1?'s':'')+'.');
  if(td.length)out.push('⏰ Hoy vence: '+td.map(x=>x.title).join(', '));if(tm.length)out.push('Mañana vence: '+tm.map(x=>x.title).join(', '));
  if(t===realToday()&&t>=S.settings.start){const n=new Date(),now=n.getHours()*60+n.getMinutes();
    for(const x of S.habits){if(x.role!=='med'||!x.active||x.type!=='time'||!applies(x,t)||dayState(t))continue;const a=tmin(x.from),b=tmin(x.to==null||x.to===''?x.from:x.to);if(a==null)continue;if(raw(x.id,t)!==null)continue;
      if(now>=a-30&&now<=b)out.push('💊 Toca '+x.name+' ('+x.from+(x.to?'–'+x.to:'')+').');else if(now>b)out.push('💊 No has registrado '+x.name+' (franja '+x.from+(x.to?'–'+x.to:'')+').')}}
  return out;
}
const NOTIFIED=new Set();
function notifyTick(){
  if(!S||!S.settings.notif||typeof Notification==='undefined'||Notification.permission!=='granted')return;
  const n=new Date(),now=n.getHours()*60+n.getMinutes(),t=realToday();
  const go=(k,title,body)=>{const key=t+k;if(NOTIFIED.has(key))return;NOTIFIED.add(key);try{new Notification(title,{body})}catch(e){}};
  for(const x of S.habits){if(x.role!=='med'||!x.active||!applies(x,t)||raw(x.id,t)!==null)continue;const a=tmin(x.from),b=tmin(x.to||x.from);if(a==null)continue;
    if(now>=a&&now<a+10)go(x.id+'s',x.name,'Empieza tu franja ('+x.from+(x.to?'–'+x.to:'')+')');if(x.to&&now>=b-15&&now<b)go(x.id+'e',x.name,'Quedan 15 min de la franja y no lo has registrado')}
  if(now>=540&&now<560){const d=S.tasks.filter(x=>x.status!=='done'&&x.due===t);if(d.length)go('tasks','Entregas de hoy',d.map(x=>x.title).join(', '))}
}
function search(q){
  q=String(q||'').trim().toLowerCase();if(!q)return;const res=[],has=(...a)=>a.some(x=>String(x||'').toLowerCase().includes(q));
  S.habits.forEach(x=>{if(has(x.name))res.push(['Hábito',x.name,()=>editHabit(x)])});
  S.subjects.forEach(x=>{if(has(x.name))res.push(['Asignatura',x.name,()=>editSubject(x)])});
  S.classes.forEach(c=>{const s=subj(c.subject);if(s&&has(s.name,c.room,c.teacher,c.notes))res.push(['Clase',s.name+' · '+DAYF[c.day-1]+' '+c.start+' '+(c.room||'')+' '+(c.teacher||''),()=>editClass(c)])});
  S.tasks.forEach(x=>{if(has(x.title,x.notes,(subj(x.subject)||{}).name))res.push(['Tarea',x.title,()=>editTask(x)])});
  S.events.forEach(x=>{if(has(x.title,x.notes))res.push(['Evento',x.title+' · '+fmtDS(x.date),()=>editEvent(x)])});
  S.diary.forEach(x=>{if(has(x.text))res.push(['Diario',fmtDS(x.date)+' · '+String(x.text).slice(0,60),()=>editDiary(x)])});
  const body=h('div',{},res.length?res.slice(0,40).map(r=>h('div',{class:'item'},h('span',{class:'pill na'},r[0]),h('span',{class:'name'},r[1]),h('button',{class:'btn sm',type:'button',onclick:function(){this.closest('dialog').close();r[2]()}},'Abrir'))):h('p',{class:'muted'},'Sin resultados.'));
  dlg('Resultados para «'+q+'»',body,()=>[h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close()}},'Cerrar')]);
}


/* ---------- riesgo de asistencia, subtareas, reordenar, mover clases ---------- */
const has=v=>v!==null&&v!==undefined&&v!==''&&isFinite(+v);
function riskOf(sj){
  const hm=has(sj.minAtt),hx=has(sj.maxAbs);if(!hm&&!hx)return null;
  const r=termRange(sj),a=r.a<S.settings.start?S.settings.start:r.a,st=attStats(a,today(),sj.id);let lvl='good';const msg=[];
  if(hm&&st.rate!=null){const need=+sj.minAtt/100;if(st.rate<need)lvl='bad';else if(st.rate<need+.1)lvl='mid';msg.push('asistencia '+pct(st.rate)+' (mín. '+sj.minAtt+' %)')}
  if(hx){const left=+sj.maxAbs-st.no;if(left<0)lvl='bad';else if(left<=1&&lvl!=='bad')lvl='mid';msg.push(st.no+' faltas de '+sj.maxAbs+' ('+Math.max(0,left)+' restantes)')}
  return{lvl,msg:msg.join(' · ')||'sin clases registradas',st};
}
const subToText=t=>(t.sub||[]).map(x=>(x.d?'[x] ':'[ ] ')+x.t).join('\n');
const textToSub=tx=>String(tx||'').split('\n').map(l=>l.trim()).filter(Boolean).map(l=>{const m=/^\[( |x|X)\]\s*(.*)$/.exec(l);return m?{t:m[2],d:m[1]!==' '}:{t:l,d:false}});
function moveTask(id,beforeId){const i=S.tasks.findIndex(x=>x.id===id);if(i<0)return false;const [t]=S.tasks.splice(i,1);const j=beforeId?S.tasks.findIndex(x=>x.id===beforeId):-1;if(j<0)S.tasks.push(t);else S.tasks.splice(j,0,t);save();return true}
function moveClass(id,day,startMin){const c=S.classes.find(x=>x.id===id);if(!c)return false;const dur=tmin(c.end)-tmin(c.start);startMin=Math.max(0,Math.min(1440-dur,Math.round(startMin/15)*15));c.day=day;c.start=mtxt(startMin);c.end=mtxt(startMin+dur);save();return true}
/* ---------- cronómetro ---------- */
function timerItems(){return[...S.subjects.filter(s=>subjActive(s,today())).map(s=>({id:s.id,name:s.name,unit:'h'})),...S.habits.filter(x=>x.active&&x.type==='qty'&&(x.unit==='min'||x.unit==='h')).map(x=>({id:x.id,name:x.name,unit:x.unit}))]}
function timerElapsed(){const T=S.timer;return T?T.acc+(T.running?Date.now()-T.since:0):0}
function timerStart(item){if(S.timer&&S.timer.item===item){if(!S.timer.running){S.timer.running=true;S.timer.since=Date.now()}}else S.timer={item,acc:0,since:Date.now(),running:true};save()}
function timerPause(){const T=S.timer;if(T&&T.running){T.acc+=Date.now()-T.since;T.running=false;save()}}
function timerStop(doSave){const T=S.timer;if(!T)return 0;const ms=timerElapsed(),min=ms/60000,it=timerItems().find(x=>x.id===T.item);S.timer=null;
  if(doSave&&it&&min>0){const d=today(),cur=raw(it.id,d),add=it.unit==='h'?Math.round(min/60*100)/100:Math.round(min*10)/10;setLog(d,it.id,Math.round(((num(cur)?cur:0)+add)*100)/100)}
  save();return min}
/* ---------- relaciones entre datos (descriptivo, sin conclusiones médicas) ---------- */
function relations(a,b){
  const t=today(),rows=[];
  for(const d of range(a,b<t?b:t)){const r=aggregate(d,d);if(r.ev<S.settings.minData)continue;const sl=sleepHours(d);rows.push({d,c:r.met/r.ev,sl,st:dayStudy(d)})}
  const avg=x=>x.length?x.reduce((p,q)=>p+q,0)/x.length:null,g=S.settings.sleepGreen,hi=rows.filter(r=>r.sl!=null&&r.sl>=g),lo=rows.filter(r=>r.sl!=null&&r.sl<g);
  const ok=hi.length>=5&&lo.length>=5;
  return{n:rows.length,ok,hi:{n:hi.length,c:avg(hi.map(r=>r.c)),st:avg(hi.map(r=>r.st))},lo:{n:lo.length,c:avg(lo.map(r=>r.c)),st:avg(lo.map(r=>r.st))}};
}
/* ---------- PIN y copia en IndexedDB ---------- */
async function hashPin(pin){const t='mi-tracker|'+pin;try{if(typeof crypto!=='undefined'&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}}catch(e){}let h1=2166136261;for(let i=0;i<t.length;i++){h1^=t.charCodeAt(i);h1=Math.imul(h1,16777619)}return'f'+(h1>>>0).toString(16)}
const IDB={open(){return new Promise((res,rej)=>{if(typeof indexedDB==='undefined'||!indexedDB)return rej(new Error('sin indexedDB'));const r=indexedDB.open('mi-tracker',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})},
  async set(k,v){const db=await this.open();return new Promise((res,rej)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(v,k);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error)})},
  async get(k){const db=await this.open();return new Promise((res,rej)=>{const q=db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)})}};
let idbTimer=null;function idbMirror(j){clearTimeout(idbTimer);idbTimer=setTimeout(()=>{IDB.set('data',j).catch(()=>{})},800)}
