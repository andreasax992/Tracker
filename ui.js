'use strict';
/* =====================================================================
   INTERFAZ
   ===================================================================== */
function h(tag,props,...kids){
  const e=document.createElement(tag);
  for(const k in(props||{})){const v=props[k];if(v==null||v===false)continue;
    if(k==='class')e.className=v;else if(k==='style')e.style.cssText=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);
    else if(k==='value')e.value=v;else if(k==='checked')e.checked=!!v;else if(k==='html')e.innerHTML=v;else e.setAttribute(k,v===true?'':v)}
  for(const c of kids.flat(9)){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(c))}
  return e;
}
function toast(m){const t=h('div',{class:'toast',role:'status','aria-live':'polite'},m);document.body.append(t);setTimeout(()=>t.remove(),2400)}
function dlg(title,body,actions){
  const d=h('dialog',{'aria-modal':'true','aria-label':title},h('form',{method:'dialog',onsubmit:e=>e.preventDefault()},h('h3',{},title),body,h('div',{class:'row',style:'margin-top:14px;justify-content:flex-end'},actions(d=>d.close()))));
  document.body.append(d);d.addEventListener('close',()=>d.remove());applyLang(d);d.showModal?d.showModal():d.setAttribute('open','');return d;
}
/* formulario genérico: fields=[{k,label,t:'text|number|date|time|select|textarea|check|color|days',opts:[[v,l]],hint,show:fn}] */
function form(title,fields,vals,onSave,onDel,extra){
  const v=Object.assign({},vals);const inputs={};
  const body=h('div',{});
  const rows=[];
  const build=()=>{
    body.innerHTML='';
    for(const f of fields){
      if(f.show&&!f.show(v))continue;
      let inp;
      if(f.t==='select'){inp=h('select',{onchange:e=>{v[f.k]=f.num?+e.target.value:e.target.value;build()}},f.opts.map(o=>h('option',{value:o[0],selected:String(v[f.k])===String(o[0])},o[1])))}
      else if(f.t==='textarea')inp=h('textarea',{rows:3,onchange:e=>v[f.k]=e.target.value},v[f.k]||'');
      else if(f.t==='check')inp=h('input',{type:'checkbox',checked:v[f.k],onchange:e=>v[f.k]=e.target.checked});
      else if(f.t==='days')inp=h('div',{class:'days'},DAYN.map((n,i)=>h('label',{},h('input',{type:'checkbox',checked:(v[f.k]||[]).includes(i+1),onchange:e=>{const s=new Set(v[f.k]||[]);e.target.checked?s.add(i+1):s.delete(i+1);v[f.k]=[...s].sort()}}),h('span',{},n))));
      else if(f.t==='color')inp=h('div',{class:'sw'},PALETTE.map((p,i)=>h('button',{type:'button',title:p[0],class:v[f.k]===i?'on':'',style:'background:'+p[1],onclick:()=>{v[f.k]=i;build()}})));
      else inp=h('input',{type:f.t||'text',step:f.t==='number'?'any':null,value:v[f.k]==null?'':v[f.k],onchange:e=>{v[f.k]=f.t==='number'?(e.target.value===''?null:+e.target.value):e.target.value}});
      body.append(h('label',{class:'f'},h('span',{},f.label),inp,f.hint?h('div',{class:'small muted'},f.hint):null));
    }
  };
  build();
  dlg(title,body,close=>[
    ...(extra||[]).map(x=>h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close();x.fn()}},x.label)),
    onDel?h('button',{class:'btn dan',type:'button',style:'margin-right:auto',onclick:function(){if(confirm('¿Eliminar definitivamente?')){onDel();this.closest('dialog').close()}}},'Eliminar'):null,
    h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close()}},'Cancelar'),
    h('button',{class:'btn pri',type:'button',onclick:function(){const msg=onSave(v);if(msg){toast(msg);return}this.closest('dialog').close()}},'Guardar')]);
}
const TABS=[['hoy','📅','Hoy'],['dash','📊','Dashboard'],['cal','🗓','Calendario'],['horario','🏫','Horario'],['tareas','✅','Tareas'],['diario','📓','Diario'],['asig','📚','Asignaturas'],['informe','🧾','Informe'],['ajustes','⚙','Ajustes'],['datos','💾','Datos']];
function applyAppearance(){const st=S.settings,r=document.documentElement;r.dataset.theme=st.theme||'auto';r.style.fontSize=(15*(st.font||100)/100)+'px';r.classList.toggle('compact',!!st.compact);r.lang=st.lang==='gl'?'gl':'es';setNames(st.lang)}
function render(){
  applyAppearance();
  const nav=document.getElementById('nav');nav.innerHTML='';nav.setAttribute('role','tablist');
  TABS.forEach(([k,ic,l])=>nav.append(h('button',{class:UI.tab===k?'on':'',role:'tab','aria-selected':String(UI.tab===k),onclick:()=>{UI.tab=k;render();window.scrollTo(0,0)}},h('span',{class:'ic','aria-hidden':'true'},ic),h('span',{class:'tl'},l))));
  document.getElementById('sub').textContent='Seguimiento desde el '+fmtD(S.settings.start)+' · hoy '+fmtD(today());
  const app=document.getElementById('app');app.innerHTML='';
  const days=S.settings.lastExport?Math.floor((pd(realToday())-pd(S.settings.lastExport))/864e5):null;
  if((days==null||days>=14)&&Object.keys(S.logs).length>3)app.append(h('div',{class:'banner'},'Tus datos solo están en este navegador. ',h('a',{href:'#',onclick:e=>{e.preventDefault();UI.tab='datos';render()}},'Haz una copia de seguridad'),' (en «Datos»).'));
  ({hoy:vHoy,dash:vDash,cal:vCal,horario:vHorario,tareas:vTareas,diario:vDiario,asig:vAsig,informe:vInforme,ajustes:vAjustes,datos:vDatos})[UI.tab](app);
  applyLang();
}

/* ---------- HOY ---------- */
function setLog(date,id,val){
  const L=S.logs[date]||(S.logs[date]={});
  if(val===null||val===''||val===undefined)delete L[id];else L[id]=val;
  if(!Object.keys(L).length)delete S.logs[date];save();
}
function targetTxt(x){
  if(x.type==='yn')return x.mode==='freqWeek'?x.freq+' d/sem':x.mode==='freqMonth'?x.freq+' d/mes':'';
  if(x.type==='qty'){const u=x.unit||'',s=x.sense==='max'?'≤ ':'≥ ';
    if(x.mode==='totalWeek')return s+x.ow+' '+u+'/sem';if(x.mode==='totalMonth')return s+x.om+' '+u+'/mes';
    return (num(x.od)?s+x.od+' '+u+'/día':'sin objetivo')+(x.mode==='freqWeek'?' · '+x.freq+' d/sem':x.mode==='freqMonth'?' · '+x.freq+' d/mes':'')}
  if(x.type==='time')return x.sense==='between'?'entre '+x.from+' y '+x.to:(x.sense==='max'?'antes de ':'después de ')+x.from;
  return'';
}
function vHoy(app){
  const date=UI.date||(UI.date=today());const t=today();
  const before=date<S.settings.start,future=date>t;
  const st=dayState(date);
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},
    h('div',{class:'row'},h('button',{class:'btn',onclick:()=>{UI.date=addD(date,-1);render()}},'‹'),
      h('input',{type:'date',value:date,onchange:e=>{if(e.target.value){UI.date=e.target.value;render()}}}),
      h('button',{class:'btn',onclick:()=>{UI.date=addD(date,1);render()}},'›'),h('button',{class:'btn',onclick:()=>{UI.date=today();render()}},'Hoy')),
    h('div',{class:'row'},h('b',{},DAYF[wd(date)-1]+' '+fmtD(date)),
      h('select',{onchange:e=>{const L=S.logs[date]||(S.logs[date]={});e.target.value?L._s=e.target.value:delete L._s;if(!Object.keys(L).length)delete S.logs[date];save();render()}},
        [['','Día normal'],['rest','Día de descanso'],['na','Día que no aplica']].map(o=>h('option',{value:o[0],selected:st===o[0]},o[1]))))),
    before?h('p',{class:'muted'},'Este día es anterior al inicio del seguimiento ('+fmtD(S.settings.start)+'): no cuenta.'):null,
    future?h('p',{class:'muted'},'Día futuro: no cuenta como incumplimiento hasta que llegue.'):null));
  if(date===t)for(const m of reminders())app.append(h('div',{class:'banner'},m));
  const hol=holidayOn(date);if(hol)app.append(h('div',{class:'banner',style:'background:var(--restbg);color:var(--rest)'},'🏖 '+hol.label+': hoy no hay clases.'));
  if(date===t&&wd(date)===1&&!before){const ws=weekSummary(-1);app.append(h('div',{class:'card'},h('h3',{},'Resumen de la semana pasada'),ws.map(l=>h('div',{class:'item'},l))))}
  const upc=upcoming(3);if(upc.length&&date===t)app.append(h('div',{class:'card'},h('h3',{},'Lo próximo'),upc.map(u=>h('div',{class:'item'},h('span',{class:'pill '+(daysLeft(u.d)<=2?'mid':'good')},leftTxt(daysLeft(u.d))),h('span',{class:'name'},u.txt)))));
  if(date===t&&!before)app.append(timerCard());
  const ag=aggregate(date,date),sl=sleepHours(date),sh=dayStudy(date),ch=dayClassHours(date),cl=classesOn(date);
  const dp=ratio(ag);
  app.append(h('div',{class:'grid g4',style:'margin-bottom:14px'},
    h('div',{class:'kpi '+pctCls(dp)},h('div',{class:'l'},'Cumplimiento del día'),h('div',{class:'v'},dp==null?'n/d':pct(dp))),
    h('div',{class:'kpi'},h('div',{class:'l'},'Horas de estudio y clase'),h('div',{class:'v'},hrs(sh)+' h'),h('div',{class:'small'},'clases '+hrs(ch)+' h · estudio '+hrs(sh-ch)+' h')),
    h('div',{class:'kpi '+(sl==null?'':sl>=S.settings.sleepGreen?'good':sl>=S.settings.sleepRed?'mid':'bad')},h('div',{class:'l'},'Sueño'),h('div',{class:'v'},sl==null?'—':hrs(sl)+' h')),
    h('div',{class:'kpi'},h('div',{class:'l'},'Clases hoy'),h('div',{class:'v'},cl.length))));
  app.append(h('div',{class:'row',style:'margin-bottom:10px'},h('label',{class:'row',style:'gap:6px'},h('input',{type:'checkbox',checked:!!UI.hideDone,onchange:e=>{UI.hideDone=e.target.checked;render()}}),'Ocultar lo que ya está hecho'),
    h('button',{class:'btn sm',onclick:()=>editHoliday({label:'Festivo',from:date,to:'',center:''})},'Marcar este día como festivo / sin clases')));
  if(cl.length){
    app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h3',{},'Asistencia a clase'),
      h('button',{class:'btn sm',disabled:before,onclick:()=>{cl.forEach(c=>{if(attOf(c,date)===null)setLog(date,'a:'+c.id,'yes')});render()}},'Asistí a todas')),
      cl.map(c=>{const s=subj(c.subject),k=colOf(center(s.center).color),v=attOf(c,date);
        return h('div',{class:'item'},h('span',{class:'chip',style:'background:'+k[2]},c.start+'–'+c.end),
          h('span',{class:'name'},s.name,h('div',{class:'tgt'},[c.room,hrs(durH(c))+' h'+(v==='yes'&&S.settings.countClass?' (suman a tus horas)':'')].filter(Boolean).join(' · '))),
          h('div',{class:'seg'},ATT.map(([val,l,cls])=>h('button',{class:(v===val?'on ':'')+cls,'aria-pressed':String(v===val),disabled:before,onclick:()=>{setLog(date,'a:'+c.id,v===val?null:val);render()}},l))))})));
  }
  for(const cat of S.cats){
    const all=S.habits.filter(x=>x.cat===cat.id&&x.active);if(!all.length)continue;const k=colOf(cat.color);
    const hs=UI.hideDone?all.filter(x=>raw(x.id,date)===null&&applies(x,date)):all;if(!hs.length)continue;
    const pend=all.filter(x=>x.type==='yn'&&applies(x,date)&&raw(x.id,date)===null);
    app.append(h('div',{class:'card cat',style:'border-left-color:'+k[1]},h('div',{class:'row spread'},h('h3',{style:'margin:0'},h('span',{class:'chip',style:'background:'+k[2]},cat.name)),
      pend.length>1?h('button',{class:'btn sm',disabled:before,onclick:()=>{pend.forEach(x=>setLog(date,x.id,'yes'));render()}},'✓ Todo Sí ('+pend.length+')'):null),hs.map(x=>habitRow(x,date,before))));
  }
  const act=S.subjects.filter(s=>subjActive(s,date));
  if(act.length){
    app.append(h('div',{class:'card cat',style:'border-left-color:var(--accent2)'},h('div',{class:'row spread'},h('h3',{},'Estudio por tu cuenta (horas)'),h('b',{},'Total del día con clases: '+hrs(sh)+' h')),
      S.centers.map(c=>{const ss=act.filter(s=>s.center===c.id);if(!ss.length)return null;const k=colOf(c.color);
        return h('div',{},h('div',{style:'margin-top:8px'},h('span',{class:'chip',style:'background:'+k[2]},c.name)),ss.map(s=>{const v=raw(s.id,date);
          return h('div',{class:'item'},h('span',{class:'name'},s.name),
            h('input',{type:'number',min:0,step:'0.25',value:num(v)?v:'',placeholder:'h',disabled:before,onchange:e=>{setLog(date,s.id,e.target.value===''?null:Math.max(0,+e.target.value));render()}}),h('span',{class:'muted small'},'h'))}))})));
  }
  const dd=S.diary.filter(e=>e.date===date);
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h3',{style:'margin:0'},'Diario de estudio y práctica'),h('button',{class:'btn sm',onclick:()=>editDiary({date,item:'',min:null,text:''})},'+ Entrada')),dd.length?dd.map(diaryLine):h('p',{class:'muted small',style:'margin:6px 0 0'},'Nada anotado este día.')));
}
function habitRow(x,date,before){
  const v=raw(x.id,date),off=!applies(x,date)||before;
  const seg=(opts)=>h('div',{class:'seg'},opts.map(([val,l,cls])=>h('button',{class:(v===val?'on ':'')+cls,'aria-pressed':String(v===val),disabled:off,onclick:()=>{setLog(date,x.id,v===val?null:val);render()}},l)));
  let ctl;
  if(x.type==='yn')ctl=seg([['yes','Sí','yes'],['no','No','no'],['rest','Descanso','rest'],['na','N/A','na']]);
  else if(x.type==='qty'){
    const s=score(x,date),cls=num(v)&&num(x.od)&&x.mode!=='totalWeek'&&x.mode!=='totalMonth'?(s===1?'good':(x.sense!=='max'&&rnd(v)>=rnd(x.od*S.settings.red)?'mid':'bad')):'';
    ctl=h('div',{class:'row',style:'gap:6px'},h('span',{class:'fld '+cls},h('input',{type:'number',min:0,step:'any','aria-label':x.name,value:num(v)?v:'',disabled:off,onchange:e=>{setLog(date,x.id,e.target.value===''?null:Math.max(0,+e.target.value));render()}})),h('span',{class:'muted small'},x.unit),
      h('div',{class:'seg'},[['rest','Desc.','rest'],['na','N/A','na']].map(([val,l,c])=>h('button',{class:(v===val?'on ':'')+c,'aria-pressed':String(v===val),disabled:off,onclick:()=>{setLog(date,x.id,v===val?null:val);render()}},l))));
  }else{
    const s=score(x,date);
    ctl=h('div',{class:'row',style:'gap:6px'},h('span',{class:'fld '+(s===1?'good':s===0?'bad':'')},h('input',{type:'time','aria-label':x.name,value:tmin(v)!=null?v:'',disabled:off,onchange:e=>{setLog(date,x.id,e.target.value||null);render()}})),
      h('div',{class:'seg'},[['no','No','no'],['rest','Desc.','rest'],['na','N/A','na']].map(([val,l,c])=>h('button',{class:(v===val?'on ':'')+c,'aria-pressed':String(v===val),disabled:off,onclick:()=>{setLog(date,x.id,v===val?null:val);render()}},l))));
  }
  const note=!applies(x,date)?'no aplica este día':'';
  return h('div',{class:'item'+(off?' off':'')},h('div',{class:'name'},x.name,h('div',{class:'tgt'},[targetTxt(x),note].filter(Boolean).join(' · '))),ctl);
}

/* ---------- DASHBOARD ---------- */
function bars(rows,o={}){
  const mx=o.max||Math.max(1e-9,...rows.map(r=>r.v||0));
  return h('div',{class:'bars'},rows.map(r=>h('div',{class:'b'},h('span',{title:r.l,style:'overflow:hidden;text-overflow:ellipsis;white-space:nowrap'},r.l),
    h('div',{class:'t'},h('i',{style:'width:'+Math.min(100,((r.v||0)/mx)*100)+'%;background:'+(r.c||'var(--accent)')}),r.mark!=null?h('u',{style:'left:'+Math.min(100,(r.mark/mx)*100)+'%'}):null),
    h('span',{class:'small'},r.t))));
}
function cols(rows,o={}){
  const mx=o.max||Math.max(1e-9,...rows.map(r=>r.v||0));
  return h('div',{class:'cols'},rows.map(r=>h('div',{class:'c',title:r.l+': '+(r.t||'')},h('em',{},r.v==null?'':r.t),h('i',{style:'height:'+(r.v==null?0:Math.max(2,(r.v/mx)*100*.78))+'%;background:'+(r.c||'var(--accent)')}),h('span',{},r.l))));
}
function vDash(app){
  const P=period(),D=UI.dash;
  app.append(h('div',{class:'card'},h('div',{class:'row'},
    h('select',{onchange:e=>{D.period=e.target.value;render()}},[['all','Desde el inicio'],['month','Este mes'],['prev','Mes anterior'],['7','Últimos 7 días'],['30','Últimos 30 días'],['90','Últimos 90 días'],['custom','Personalizado']].map(o=>h('option',{value:o[0],selected:D.period===o[0]},o[1]))),
    D.period==='custom'?[h('input',{type:'date',value:D.from,onchange:e=>{D.from=e.target.value;render()}}),h('input',{type:'date',value:D.to,onchange:e=>{D.to=e.target.value;render()}})]:null,
    h('select',{onchange:e=>{D.cat=e.target.value;render()}},h('option',{value:''},'Todas las categorías'),S.cats.map(c=>h('option',{value:c.id,selected:D.cat===c.id},c.name))),
    h('span',{class:'muted small'},fmtD(P.a)+' → '+fmtD(P.b)))));
  const flt=x=>!D.cat||x.cat===D.cat;
  const g=aggregate(P.a,P.b,flt),gp=ratio(g),days=range(P.a,P.b).filter(d=>Object.keys(S.logs[d]||{}).some(k=>k!=='_s')).length;
  const sl=sleepAvg(P.a,P.b),st=studyHours(P.a,P.b);
  const meds=S.habits.filter(x=>x.role==='med'&&x.active);let mm=0,me=0;meds.forEach(x=>{const r=evalHabit(x,P.a,P.b);mm+=r.met;me+=r.ev});const mp=me>=S.settings.minData?mm/me:null;
  const at=attStats(P.a,P.b);
  const sts=S.habits.filter(x=>counts(x)&&x.active&&flt(x)).map(x=>({x,s:streak(x)})).filter(o=>o.s&&o.s.cur>0).sort((a,b)=>b.s.cur-a.s.cur);
  app.append(h('div',{class:'grid g4',style:'margin-bottom:14px'},
    h('div',{class:'kpi '+pctCls(gp)},h('div',{class:'l'},'Cumplimiento global'),h('div',{class:'v'},gp==null?'n/d':pct(gp)),h('div',{class:'small'},g.met+' de '+g.ev+' unidades')),
    h('div',{class:'kpi'},h('div',{class:'l'},'Días con registro'),h('div',{class:'v'},days),h('div',{class:'small'},'de '+range(P.a,P.b).length)),
    h('div',{class:'kpi'},h('div',{class:'l'},'Horas de estudio'),h('div',{class:'v'},hrs(st)+' h')),
    h('div',{class:'kpi '+(sl.avg==null||sl.n<S.settings.minData?'':sl.avg>=S.settings.sleepGreen?'good':sl.avg>=S.settings.sleepRed?'mid':'bad')},h('div',{class:'l'},'Sueño medio'),h('div',{class:'v'},sl.avg==null||sl.n<S.settings.minData?'n/d':hrs(sl.avg)+' h'),h('div',{class:'small'},sl.n+' noches')),
    h('div',{class:'kpi '+pctCls(mp)},h('div',{class:'l'},'Medicación en franja'),h('div',{class:'v'},mp==null?'n/d':pct(mp))),
    h('div',{class:'kpi '+pctCls(at.rate)},h('div',{class:'l'},'Asistencia a clase'),h('div',{class:'v'},at.rate==null?'n/d':pct(at.rate)),h('div',{class:'small'},at.yes+' de '+at.held+' clases')),
    h('div',{class:'kpi'},h('div',{class:'l'},'Mejor racha actual'),h('div',{class:'v'},sts.length?sts[0].s.cur+' d':'—'),h('div',{class:'small'},sts.length?sts[0].x.name:'sin racha'))));
  // categorías
  const catRows=S.cats.map(c=>{const r=aggregate(P.a,P.b,x=>x.cat===c.id),p=ratio(r);return{l:c.name,v:p,t:p==null?'n/d':pct(p),c:p==null?'var(--line)':p<S.settings.red?'#d9534f':p<S.settings.green?'#e0a800':'#2e9e4f',ev:r.ev}}).filter(r=>r.ev>0);
  // ranking
  const per=S.habits.filter(x=>counts(x)&&x.active&&flt(x)).map(x=>{const r=evalHabit(x,P.a,P.b);return{x,r,p:ratio(r)}}).filter(o=>o.p!=null).sort((a,b)=>b.p-a.p);
  const lst=o=>h('div',{class:'item'},h('span',{class:'name'},o.x.name),h('span',{class:'pill '+pctCls(o.p)},pct(o.p)),h('span',{class:'muted small'},o.r.met+'/'+o.r.ev));
  app.append(h('div',{class:'grid g2'},
    h('div',{class:'card'},h('h3',{},'Cumplimiento por categoría'),catRows.length?bars(catRows,{max:1}):h('p',{class:'muted'},'Aún no hay datos suficientes. Empieza a registrar en «Hoy».')),
    h('div',{class:'card'},h('h3',{},'Rachas (días seguidos)'),sts.length?sts.slice(0,8).map(o=>h('div',{class:'item'},h('span',{class:'name'},o.x.name),h('span',{class:'pill good'},o.s.cur+' d'),h('span',{class:'muted small'},'mejor '+o.s.best))):h('p',{class:'muted'},'Sin rachas todavía. Un día pasado sin registrar corta la racha; descanso y N/A no.'))));
  app.append(h('div',{class:'grid g2'},
    h('div',{class:'card'},h('h3',{},'Más constantes'),per.slice(0,5).map(lst),per.length?null:h('p',{class:'muted'},'n/d')),
    h('div',{class:'card'},h('h3',{},'Menos constantes'),per.slice(-5).reverse().map(lst),per.length?null:h('p',{class:'muted'},'n/d'))));
  const wsum=weekSummary();
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h3',{},'Resumen de la semana'),h('button',{class:'btn sm',onclick:()=>{const tx=wsum.join('\n');(navigator.clipboard?navigator.clipboard.writeText(tx):Promise.reject()).then(()=>toast('Resumen copiado'),()=>toast('No se pudo copiar'))}},'Copiar')),wsum.map(l=>h('div',{class:'item'},l))));
  const ar=S.subjects.map(s=>({s,a:attStats(P.a,P.b,s.id)})).filter(o=>o.a.yes+o.a.no+o.a.just+o.a.cancel>0).sort((x,y)=>(y.a.held)-(x.a.held));
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h3',{},'Asistencia por asignatura'),h('span',{class:'muted small'},'asistí / no asistí / justificada / sin clase')),
    ar.length?bars(ar.slice(0,16).map(o=>({l:o.s.name,v:o.a.rate==null?0:o.a.rate,t:(o.a.rate==null?'n/d':pct(o.a.rate))+' · '+o.a.yes+'/'+o.a.no+'/'+o.a.just+'/'+o.a.cancel,c:o.a.rate==null?'var(--line)':o.a.rate<S.settings.red?'#d9534f':o.a.rate<S.settings.green?'#e0a800':'#2e9e4f'})),{max:1}):h('p',{class:'muted'},'Marca tu asistencia en «Hoy» (sección Asistencia a clase). Las clases asistidas suman a tus horas de estudio.')));
  // estudio por asignatura
  const sr=S.subjects.map(s=>{const hh=subjHours(s,P.a,P.b);const w=num(+s.wk)&&s.wk!==null&&s.wk!==''?+s.wk*((pd(P.b)-pd(P.a))/864e5+1)/7:null;return{s,hh,w}}).filter(o=>o.hh>0||(o.w&&subjActive(o.s,P.b))).sort((a,b)=>b.hh-a.hh);
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h3',{},'Horas por asignatura'),h('b',{},hrs(st)+' h en total')),
    sr.length?bars(sr.slice(0,16).map(o=>({l:o.s.name,v:o.hh,mark:o.w,t:hrs(o.hh)+' h'+(o.w?' / '+hrs(o.w):''),c:colOf(center(o.s.center).color)[1]})),{max:Math.max(...sr.map(o=>Math.max(o.hh,o.w||0)),1)}):h('p',{class:'muted'},'Registra horas en «Hoy» (sección Estudio). Puedes poner un objetivo semanal por asignatura en «Asignaturas» (la marca vertical).')));
  // evolución semanal y mensual
  const t=today(),wk=[];for(let i=11;i>=0;i--){const m=addD(monday(t),-7*i);if(addD(m,6)<S.settings.start)continue;wk.push(m)}
  const wRows=wk.map(m=>{const a=m<S.settings.start?S.settings.start:m,b=addD(m,6),r=aggregate(a,b,x=>x.mode==='daily'||x.mode==='freqWeek'||x.mode==='totalWeek'),p=ratio(r);return{l:fmtDS(m),v:p,t:p==null?'':Math.round(p*100)+'%',c:p==null?'var(--line)':p<S.settings.red?'#d9534f':p<S.settings.green?'#e0a800':'#2e9e4f'}});
  const wS=wk.map(m=>({l:fmtDS(m),v:studyHours(m,addD(m,6)),t:'',c:'var(--accent2)'}));wS.forEach(r=>r.t=r.v?hrs(r.v):'');
  const wZ=wk.map(m=>{const s=sleepAvg(m,addD(m,6));return{l:fmtDS(m),v:s.n?s.avg:null,t:s.n?hrs(s.avg):'',c:'#546e7a'}});
  app.append(h('div',{class:'grid g2'},
    h('div',{class:'card'},h('h3',{},'Cumplimiento semanal (12 semanas)'),cols(wRows,{max:1})),
    h('div',{class:'card'},h('h3',{},'Horas de estudio por semana'),cols(wS)),
    h('div',{class:'card'},h('h3',{},'Sueño medio por semana (h)'),cols(wZ,{max:10}))));
  const ms=monthsIn(S.settings.start,t).slice(-12);
  const mR=ms.map(u=>{const a=u.start<S.settings.start?S.settings.start:u.start,b=u.end>t?t:u.end,r=aggregate(a,b,x=>true),p=ratio(r);return{l:MONN[+u.start.slice(5,7)-1].slice(0,3),v:p,t:p==null?'':Math.round(p*100)+'%',c:p==null?'var(--line)':p<S.settings.red?'#d9534f':p<S.settings.green?'#e0a800':'#2e9e4f'}});
  const mS=ms.map(u=>{const v=studyHours(u.start,u.end);return{l:MONN[+u.start.slice(5,7)-1].slice(0,3),v,t:v?hrs(v):'',c:'var(--accent2)'}});
  app.append(h('div',{class:'grid g2'},h('div',{class:'card'},h('h3',{},'Cumplimiento mensual'),cols(mR,{max:1})),h('div',{class:'card'},h('h3',{},'Horas de estudio por mes'),cols(mS))));
  const rk=S.subjects.map(sj=>({sj,r:riskOf(sj)})).filter(o=>o.r&&o.r.lvl!=='good');
  if(rk.length)app.append(h('div',{class:'card'},h('h3',{},'Asistencia en riesgo'),rk.map(o=>h('div',{class:'item'},h('span',{class:'pill '+o.r.lvl},o.r.lvl==='bad'?'riesgo':'ojo'),h('span',{class:'name'},o.sj.name),h('span',{class:'muted small'},o.r.msg)))));
  const rl=relations(P.a,P.b),fm=x=>x==null?'n/d':pct(x);
  app.append(h('div',{class:'card'},h('h3',{},'Relaciones entre tus datos (descriptivo)'),rl.ok?h('div',{},
    h('div',{class:'item'},h('span',{class:'name'},'Días con sueño ≥ '+S.settings.sleepGreen+' h ('+rl.hi.n+' días)'),h('span',{class:'pill '+pctCls(rl.hi.c)},'cumplimiento '+fm(rl.hi.c)),h('span',{class:'muted small'},'estudio '+hrs(rl.hi.st||0)+' h')),
    h('div',{class:'item'},h('span',{class:'name'},'Días con sueño < '+S.settings.sleepGreen+' h ('+rl.lo.n+' días)'),h('span',{class:'pill '+pctCls(rl.lo.c)},'cumplimiento '+fm(rl.lo.c)),h('span',{class:'muted small'},'estudio '+hrs(rl.lo.st||0)+' h')),
    h('p',{class:'muted small'},'Son medias de tus propios días, no una explicación ni un consejo médico: con pocos días la diferencia puede ser casualidad.')):h('p',{class:'muted'},'Hacen falta al menos 5 días con sueño por encima y por debajo del umbral ('+rl.n+' días con datos hasta ahora).')));
  // tareas
  const pend=S.tasks.filter(x=>x.status!=='done').sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999'));
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h3',{},'Tareas pendientes'),h('span',{class:'muted small'},pend.length+' · '+hrs(pend.reduce((a,x)=>a+taskPending(x),0))+' h por hacer')),
    pend.slice(0,6).map(taskLine),pend.length?null:h('p',{class:'muted'},'Nada pendiente. Añade deberes en «Tareas».')));
}

/* ---------- HORARIO ---------- */
const HV=[['blocks','Bloques fijos (comida, transporte…)'],['name','Nombre de la asignatura'],['time','Hora'],['room','Aula'],['teacher','Profesor/a'],['center','Centro'],['notes','Notas'],['att','Asistencia (✓ ✗ ∅ J)']];
function blockInner(c,date,hv){
  const s=subj(c.subject),k=center(s.center),v=date?attOf(c,date):null,els=[];
  if(hv.name)els.push(h('b',{},hv.att&&v?h('span',{class:'att'},ATTI[v]):null,c._ov?'✎ ':'',s.name));else if(hv.att&&v)els.push(h('span',{class:'att'},ATTI[v]));
  const l2=[hv.time?c.start+'–'+c.end:'',hv.room?c.room:'',hv.center?k.name:''].filter(Boolean).join(' · ');if(l2)els.push(l2);
  if(hv.teacher&&c.teacher)els.push(h('div',{style:'color:#444'},c.teacher));if(hv.notes&&c.notes)els.push(h('div',{style:'color:#444;font-style:italic'},c.notes));
  return els;
}
function vHorario(app){
  const t=today(),mon=UI.week||(UI.week=monday(t)),st=S.settings,hv=st.hv;
  if(!UI.hview)UI.hview=window.innerWidth<700?'list':'grid';
  const wkDays=range(mon,addD(mon,6)),all=wkDays.map(d=>classesOn(d));
  let h0=8,h1=22;all.flat().forEach(c=>{h0=Math.min(h0,Math.floor(tmin(c.start)/60));h1=Math.max(h1,Math.ceil(tmin(c.end)/60))});
  const PX=48,total=(h1-h0)*PX;
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},
    h('div',{class:'row'},h('button',{class:'btn',onclick:()=>{UI.week=addD(mon,-7);render()}},'‹ Semana'),h('button',{class:'btn',onclick:()=>{UI.week=monday(today());render()}},'Esta semana'),h('button',{class:'btn',onclick:()=>{UI.week=addD(mon,7);render()}},'Semana ›'),
      h('input',{type:'date',value:mon,onchange:e=>{if(e.target.value){UI.week=monday(e.target.value);render()}}})),
    h('div',{class:'row'},
      h('div',{class:'seg'},[['grid','Cuadrícula'],['list','Lista']].map(([k,l])=>h('button',{class:UI.hview===k?'on yes':'',onclick:()=>{UI.hview=k;render()}},l))),
      h('button',{class:'btn',onclick:()=>download('horario.ics',makeICS(),'text/calendar')},'📅 Calendario (.ics)'),
      h('button',{class:'btn pri',onclick:()=>editClass({day:wd(t),start:'10:00',end:'11:00',subject:(S.subjects.find(s=>subjActive(s,mon))||S.subjects[0]||{}).id})},'+ Clase'))),
    h('div',{class:'muted small',style:'margin-top:6px'},'Semana del '+fmtD(mon)+'. Se ven las asignaturas activas en cada fecha (el cuatrimestre cambia solo). Toca una clase para editarla.'),
    h('details',{style:'margin-top:8px',open:UI.hvOpen,ontoggle:e=>{UI.hvOpen=e.target.open}},h('summary',{},'⚙ Qué se ve en el horario'),
      h('div',{class:'hvp',style:'margin-top:8px'},HV.map(([k,l])=>h('label',{},h('input',{type:'checkbox',checked:hv[k],onchange:e=>{hv[k]=e.target.checked;save();render()}}),l))),
      h('div',{class:'hvp',style:'margin-top:8px'},
        h('label',{},h('input',{type:'checkbox',checked:st.clash,onchange:e=>{st.clash=e.target.checked;save();render()}}),'Marcar solapes en el horario (nunca en Hoy)'),
        h('label',{},h('input',{type:'checkbox',checked:st.lunch,onchange:e=>{st.lunch=e.target.checked;save();render()}}),'Avisar si un día no hay hueco para comer (13:00–16:00)')))));
  if(UI.hview==='list'){
    wkDays.forEach((d,i)=>{const list=all[i],cs=st.clash?clashes(list):new Set();
      app.append(h('div',{class:'card'+(d===t?' cat':''),style:d===t?'border-left-color:var(--accent)':''},h('div',{class:'row spread'},h('h3',{style:'margin:0'},DAYF[i]+' '+fmtDS(d)),st.lunch&&noLunch(d)?h('span',{class:'pill mid'},'sin hueco para comer'):null),
        list.length?list.map(c=>{const s=subj(c.subject),k=colOf(center(s.center).color);
          return h('div',{class:'item',style:'cursor:pointer',onclick:()=>editClass(c,d)},h('span',{class:'chip',style:'background:'+k[2]+';border-left:4px solid '+k[1]},c.start+'–'+c.end),
            h('div',{class:'name'},blockInner(c,d,Object.assign({},hv,{time:false})).map(e=>e.nodeType?e:h('span',{},e)),cs.has(c.id)?h('span',{class:'pill bad',style:'margin-left:6px'},'solape'):null))}):h('p',{class:'muted',style:'margin:6px 0 0'},'Sin clases.')))});
    return;
  }
  const grid=h('div',{class:'tt'});
  grid.append(h('div',{class:'hd'}));
  wkDays.forEach((d,i)=>grid.append(h('div',{class:'hd'+(d===t?' today':'')},DAYN[i]+' '+fmtDS(d),st.lunch&&noLunch(d)?h('div',{class:'small',style:'color:var(--mid)'},'sin hueco para comer'):null)));
  const ax=h('div',{class:'ax',style:'height:'+total+'px'});for(let x=h0;x<=h1;x++)ax.append(h('div',{style:'top:'+((x-h0)*PX)+'px'},pad(x)+':00'));grid.append(ax);
  const colEls=[];
  wkDays.forEach((d,i)=>{
    const list=all[i],cs=st.clash?clashes(list):new Set();
    const col=h('div',{class:'day'+(d===t?' today':''),style:'height:'+total+'px',onclick:e=>{if(e.target!==col)return;const y=e.offsetY,m=Math.round((h0*60+y/PX*60)/30)*30;
      editClass({day:i+1,start:mtxt(m),end:mtxt(m+60),subject:(S.subjects.find(s=>subjActive(s,d))||{}).id})}});
    const place=[];list.forEach(c=>{let k=0;while(place.some(p=>p.k===k&&tmin(p.c.end)>tmin(c.start)&&tmin(c.end)>tmin(p.c.start)))k++;place.push({c,k})});
    place.forEach(p=>{const c=p.c,s=subj(c.subject),k=colOf(center(s.center).color),n=Math.max(1,...place.filter(q=>tmin(q.c.start)<tmin(c.end)&&tmin(c.start)<tmin(q.c.end)).map(q=>q.k+1));
      col.append(h('div',{class:'blk'+(cs.has(c.id)?' clash':''),'data-cid':c.id,style:'top:'+((tmin(c.start)-h0*60)/60*PX)+'px;height:'+Math.max(22,(tmin(c.end)-tmin(c.start))/60*PX-2)+'px;left:'+(p.k/n*100)+'%;width:calc('+(100/n)+'% - 2px);background:'+k[2]+';border-left:4px solid '+k[1],
        onclick:e=>{if(e.currentTarget.dataset.dragged)return;editClass(c,d)}},blockInner(c,d,hv).map(e=>e.nodeType?e:h('div',{},e))));
      if(false)0});
    if(hv.blocks)S.blocks.filter(b=>!(b.days&&b.days.length)||b.days.includes(i+1)).forEach(b=>col.append(h('div',{class:'blk fixed',style:'top:'+((tmin(b.start)-h0*60)/60*PX)+'px;height:'+Math.max(18,(tmin(b.end)-tmin(b.start))/60*PX-2)+'px;left:0;right:0;pointer-events:none'},b.label+' · '+b.start+'–'+b.end)));
    colEls.push(col);grid.append(col);
  });
  grid.querySelectorAll('.blk[data-cid]').forEach(el=>{const c=S.classes.find(x=>x.id===el.dataset.cid);if(c)attachDrag(el,c,colEls,h0,PX)});
  app.append(h('div',{class:'card scroll'},grid));
  app.append(h('div',{class:'card'},h('div',{class:'row'},S.centers.map(c=>{const k=colOf(c.color);return h('span',{class:'chip',style:'background:'+k[2]+';border-left:4px solid '+k[1]},c.name)}))));
}
function attachDrag(el,c,colEls,h0,PX){
  el.addEventListener('pointerdown',e=>{if(e.button>0)return;const sx=e.clientX,sy=e.clientY,top0=el.offsetTop;let moving=false;
    const mv=ev=>{const dx=ev.clientX-sx,dy=ev.clientY-sy;if(!moving&&Math.hypot(dx,dy)>8)moving=true;if(moving){el.style.transform='translate('+dx+'px,'+dy+'px)';el.style.zIndex=30;el.style.opacity='.8'}};
    const up=ev=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);el.style.transform='';el.style.opacity='';el.style.zIndex='';if(!moving)return;
      el.dataset.dragged='1';setTimeout(()=>{delete el.dataset.dragged},80);
      const idx=colEls.findIndex(ce=>{const r=ce.getBoundingClientRect();return ev.clientX>=r.left&&ev.clientX<=r.right});if(idx<0)return;
      moveClass(c.id,idx+1,h0*60+(top0+(ev.clientY-sy))/PX*60);render();toast('Clase movida (puedes deshacer con ↶)')};
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up)});
}
function editClass(c,date){
  const isNew=!c.id;
  form(isNew?'Nueva clase':'Editar clase',[
    {k:'subject',label:'Asignatura',t:'select',opts:S.subjects.map(s=>[s.id,s.name+' ('+center(s.center).name+')'])},
    {k:'day',label:'Día',t:'select',num:true,opts:DAYF.map((d,i)=>[i+1,d])},
    {k:'start',label:'Inicio',t:'time'},{k:'end',label:'Fin',t:'time'},{k:'room',label:'Aula / lugar'},{k:'teacher',label:'Profesor/a'},{k:'notes',label:'Notas',t:'textarea'}],
    c,v=>{if(!v.subject)return'Crea primero una asignatura';if(tmin(v.start)==null||tmin(v.end)==null||tmin(v.end)<=tmin(v.start))return'Revisa las horas (el fin debe ser posterior al inicio)';
      if(isNew)S.classes.push(Object.assign({id:uid('l')},v));else Object.assign(S.classes.find(x=>x.id===c.id),v);save();render()},
    isNew?null:()=>{S.classes=S.classes.filter(x=>x.id!==c.id);S.overrides=S.overrides.filter(o=>o.cls!==c.id);for(const d in S.logs){delete S.logs[d]['a:'+c.id];if(!Object.keys(S.logs[d]).length)delete S.logs[d]}save();render()},
    (!isNew&&date)?[{label:'Solo este día…',fn:()=>editOverride(S.classes.find(x=>x.id===c.id)||c,date)}]:null);
}

/* ---------- TAREAS ---------- */
function taskLine(x){
  const s=subj(x.subject),st=taskState(x);
  const lab={late:['bad','VENCIDA'],today:['mid','HOY'],soon:['mid','pronto'],ok:['good','en plazo'],nodate:['na','sin fecha'],done:['na','hecha']}[st],p=subProg(x),man=UI.taskOrder==='manual';
  const row=h('div',{class:'item'},man?h('span',{class:'muted',title:'Arrastra para reordenar','aria-hidden':'true',style:'cursor:grab'},'⠿'):null,
    h('input',{type:'checkbox',checked:x.status==='done','aria-label':'Marcar como hecha: '+x.title,onchange:e=>{x.status=e.target.checked?'done':'todo';save();render()}}),
    h('div',{class:'name',style:x.status==='done'?'text-decoration:line-through;opacity:.6':'',onclick:()=>editTask(x)},x.title,h('div',{class:'tgt'},(s?s.name:'—')+(x.due?' · entrega '+fmtD(x.due):'')+' · '+hrs(+x.est||0)+' h estimadas'+(p.n?', '+p.d+'/'+p.n+' subtareas':', '+hrs(+x.done||0)+' h hechas'))),
    x.priority==='high'?h('span',{class:'pill bad'},'alta'):null,h('span',{class:'pill '+lab[0]},lab[1]),h('button',{class:'btn sm',onclick:()=>editTask(x)},'Editar'));
  const wrap=h('div',{'data-id':x.id,draggable:man?'true':null,ondragstart:e=>{e.dataTransfer&&e.dataTransfer.setData('text/plain',x.id)},ondragover:e=>{if(man)e.preventDefault()},ondrop:e=>{if(!man)return;e.preventDefault();const src=e.dataTransfer&&e.dataTransfer.getData('text/plain');if(src&&src!==x.id){moveTask(src,x.id);render()}}},row,
    p.n?h('div',{style:'margin:0 0 6px 32px'},x.sub.map((sb,i)=>h('label',{class:'row small',style:'gap:6px;margin:2px 0'},h('input',{type:'checkbox',checked:sb.d,onchange:e=>{sb.d=e.target.checked;if(x.sub.every(q=>q.d))x.status='done';else if(x.status==='done')x.status='todo';save();render()}}),h('span',{style:sb.d?'text-decoration:line-through;opacity:.6':''},sb.t)))):null);
  return wrap;
}
function editTask(x){
  const isNew=!x.id;
  form(isNew?'Nueva tarea':'Editar tarea',[
    {k:'subject',label:'Asignatura',t:'select',opts:[['','—'],...S.subjects.map(s=>[s.id,s.name])]},{k:'title',label:'Tarea / deberes'},
    {k:'assigned',label:'Fecha asignada',t:'date'},{k:'due',label:'Fecha de entrega',t:'date'},
    {k:'est',label:'Tiempo estimado (h)',t:'number'},{k:'done',label:'Tiempo dedicado (h)',t:'number'},
    {k:'priority',label:'Prioridad',t:'select',opts:[['low','Baja'],['mid','Media'],['high','Alta']]},{k:'status',label:'Estado',t:'select',opts:[['todo','Pendiente'],['doing','En curso'],['done','Hecha']]},
    {k:'subTxt',label:'Subtareas (una por línea; empieza con [x] si ya está hecha)',t:'textarea'},{k:'notes',label:'Notas',t:'textarea'}],
    Object.assign({},x,{subTxt:subToText(x)}),v=>{if(!String(v.title||'').trim())return'Escribe qué hay que hacer';v.sub=textToSub(v.subTxt);delete v.subTxt;if(isNew)S.tasks.push(Object.assign({id:uid('t')},v));else Object.assign(S.tasks.find(q=>q.id===x.id),v);save();render()},
    isNew?null:()=>{S.tasks=S.tasks.filter(q=>q.id!==x.id);save();render()});
}
function vTareas(app){
  const F=UI.taskFilter;let ts=S.tasks.slice();
  if(F==='pend')ts=ts.filter(x=>x.status!=='done');else if(F==='done')ts=ts.filter(x=>x.status==='done');
  if(UI.taskOrder!=='manual')ts.sort((a,b)=>(a.status==='done')-(b.status==='done')||(a.due||'9999').localeCompare(b.due||'9999'));
  const pend=S.tasks.filter(x=>x.status!=='done');
  app.append(h('div',{class:'grid g4',style:'margin-bottom:14px'},
    h('div',{class:'kpi'},h('div',{class:'l'},'Pendientes'),h('div',{class:'v'},pend.length)),
    h('div',{class:'kpi'},h('div',{class:'l'},'Horas por hacer'),h('div',{class:'v'},hrs(pend.reduce((a,x)=>a+taskPending(x),0)))),
    h('div',{class:'kpi '+(pend.some(x=>taskState(x)==='late')?'bad':'')},h('div',{class:'l'},'Vencidas'),h('div',{class:'v'},pend.filter(x=>taskState(x)==='late').length)),
    h('div',{class:'kpi'},h('div',{class:'l'},'Próximos 7 días'),h('div',{class:'v'},pend.filter(x=>x.due&&x.due>=today()&&x.due<=addD(today(),7)).length))));
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},
    h('div',{class:'seg'},[['pend','Pendientes'],['all','Todas'],['done','Hechas']].map(([k,l])=>h('button',{class:F===k?'on yes':'',onclick:()=>{UI.taskFilter=k;render()}},l))),
    h('div',{class:'row'},h('select',{'aria-label':'Orden',onchange:e=>{UI.taskOrder=e.target.value;render()}},[['date','Orden por fecha de entrega'],['manual','Orden manual (arrastra)']].map(o=>h('option',{value:o[0],selected:(UI.taskOrder||'date')===o[0]},o[1]))),h('button',{class:'btn pri',onclick:()=>editTask({subject:'',title:'',assigned:today(),due:'',est:1,done:0,priority:'mid',status:'todo',notes:'',sub:[]})},'+ Tarea'))),
    h('div',{style:'margin-top:8px'},ts.length?ts.map(taskLine):h('p',{class:'muted'},'No hay tareas en esta vista.'))));
  const by={};pend.forEach(x=>{const k=x.subject||'';by[k]=(by[k]||0)+taskPending(x)});
  const rows=Object.entries(by).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>({l:k?subj(k).name:'Sin asignatura',v,t:hrs(v)+' h',c:k?colOf(center(subj(k).center).color)[1]:'var(--line)'}));
  if(rows.length)app.append(h('div',{class:'card'},h('h3',{},'Horas pendientes por asignatura'),bars(rows)));
  const P=S.settings.planner,pl=plan(),keys=Object.keys(pl.days).sort();
  const pin=(k,label,o={})=>h('label',{class:'row',style:'gap:4px'},h('span',{class:'small muted'},label),h('input',{type:o.t||'number',step:'any',value:P[k],style:o.t==='time'?'':'width:64px',onchange:e=>{P[k]=o.t==='time'?e.target.value:+e.target.value;save();render()}}));
  app.append(h('div',{class:'card pl'},h('h3',{},'Plan de estudio sugerido (reparte las horas pendientes en tus huecos libres)'),
    h('div',{class:'row'},h('label',{class:'row',style:'gap:4px'},h('span',{class:'small muted'},'Prioriza'),h('select',{onchange:e=>{P.mode=e.target.value;save();render()}},[['due','Lo que vence antes'],['priority','La prioridad (alta primero)']].map(o=>h('option',{value:o[0],selected:P.mode===o[0]},o[1])))),pin('perDay','Horas máx. por día'),pin('from','Desde',{t:'time'}),pin('to','Hasta',{t:'time'}),
      h('label',{class:'row',style:'gap:4px'},h('input',{type:'checkbox',checked:P.weekends,onchange:e=>{P.weekends=e.target.checked;save();render()}}),'Incluir fines de semana')),
    pl.warn.map(w=>h('div',{class:'banner',style:'margin-top:8px'},'No cabe «'+w.task.title+'» antes de su entrega: faltan '+hrs(w.missing)+' h. Amplía horas por día o cambia la fecha.')),
    keys.length?keys.slice(0,14).map(d=>h('div',{},h('div',{class:'day'},DAYF[wd(d)-1]+' '+fmtDS(d)),pl.days[d].map(b=>{const sj=subj(b.task.subject);return h('div',{class:'item'},h('span',{class:'chip',style:'background:'+(sj?colOf(center(sj.center).color)[2]:'var(--line)')},mtxt(b.from)+'–'+mtxt(b.to)),h('span',{class:'name'},b.task.title,h('div',{class:'tgt'},(sj?sj.name:'—')+(b.task.due?' · entrega '+fmtDS(b.task.due):''))))}))):h('p',{class:'muted'},'No hay tareas pendientes que planificar.'),
    h('p',{class:'muted small'},'Es una propuesta: no se guarda. Se recalcula al cambiar tareas, clases o horas libres.')));
}

/* ---------- ASIGNATURAS ---------- */
function termTxt(s){return s.term==='1'?'1.er cuatrimestre':s.term==='2'?'2.º cuatrimestre':s.term==='all'?'Todo el curso':'Fechas propias'}
function editSubject(s){
  const isNew=!s.id;
  form(isNew?'Nueva asignatura':'Editar asignatura',[
    {k:'name',label:'Nombre'},{k:'center',label:'Centro',t:'select',opts:S.centers.map(c=>[c.id,c.name])},
    {k:'term',label:'Cuatrimestre',t:'select',opts:[['1','1.er cuatrimestre'],['2','2.º cuatrimestre'],['all','Todo el curso'],['custom','Fechas propias']],hint:'Las fechas de cada cuatrimestre se cambian en Ajustes.'},
    {k:'start',label:'Inicio propio (opcional)',t:'date'},{k:'end',label:'Fin propio (opcional)',t:'date'},
    {k:'wk',label:'Objetivo de horas por semana (opcional)',t:'number'},{k:'minAtt',label:'Asistencia mínima exigida, % (opcional)',t:'number'},{k:'maxAbs',label:'Máximo de faltas no justificadas (opcional)',t:'number'},{k:'active',label:'Activa',t:'check'}],
    s,v=>{if(!String(v.name||'').trim())return'Escribe un nombre';if(isNew)S.subjects.push(Object.assign({id:uid('s')},v));else Object.assign(S.subjects.find(q=>q.id===s.id),v);save();render()},
    isNew?null:()=>{const n=S.classes.filter(c=>c.subject===s.id).length+S.tasks.filter(t=>t.subject===s.id).length;
      if(n&&!confirm('Tiene '+n+' clases/tareas asociadas que también se borrarán. ¿Seguir?'))return;
      const cids=S.classes.filter(c=>c.subject===s.id).map(c=>'a:'+c.id);S.subjects=S.subjects.filter(q=>q.id!==s.id);S.classes=S.classes.filter(c=>c.subject!==s.id);for(const d in S.logs){cids.forEach(k=>delete S.logs[d][k])}S.tasks=S.tasks.filter(t=>t.subject!==s.id);
      for(const d in S.logs){delete S.logs[d][s.id];if(!Object.keys(S.logs[d]).length)delete S.logs[d]}save();render()});
}
function vAsig(app){
  const t=today();
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('div',{},h('h2',{style:'margin:0'},'Asignaturas'),h('div',{class:'muted small'},'Las horas que apuntas en «Hoy» suman en «Horas de estudio». Crea las del 2.º cuatrimestre cuando las sepas (o renombra las de ejemplo).')),
    h('button',{class:'btn pri',onclick:()=>editSubject({name:'',center:S.centers[0]&&S.centers[0].id,term:'1',start:'',end:'',wk:null,active:true})},'+ Asignatura'))));
  for(const c of S.centers){
    const ss=S.subjects.filter(s=>s.center===c.id);if(!ss.length)continue;const k=colOf(c.color);
    app.append(h('div',{class:'card cat',style:'border-left-color:'+k[1]},h('h3',{},h('span',{class:'chip',style:'background:'+k[2]},c.name),h('span',{class:'muted small'},ss.length+' asignaturas')),
      h('div',{class:'scroll'},h('table',{},h('thead',{},h('tr',{},['Asignatura','Periodo','Clase h/sem','Horas (clase + estudio)','Asistencia','Riesgo','Tareas (h)',''].map(x=>h('th',{},x)))),
        h('tbody',{},ss.map(s=>{const hc=S.classes.filter(c=>c.subject===s.id).reduce((a,c)=>a+(tmin(c.end)-tmin(c.start))/60,0),th=S.tasks.filter(x=>x.subject===s.id).reduce((a,x)=>a+taskPending(x),0);
          return h('tr',{style:subjActive(s,t)?'':'opacity:.55'},h('td',{},h('b',{},s.name),s.active?null:h('span',{class:'pill na',style:'margin-left:6px'},'archivada')),h('td',{class:'small'},termTxt(s)+(termRange(s).a!=='0000-01-01'?' · '+fmtDS(termRange(s).a)+'→'+(termRange(s).b==='9999-12-31'?'…':fmtDS(termRange(s).b)):'')),
            h('td',{},hrs(hc)),h('td',{},hrs(subjHours(s,S.settings.start,t))+' h'),h('td',{class:'small'},(()=>{const a=attStats(S.settings.start,t,s.id);return a.held||a.cancel?a.yes+' ✓ · '+a.no+' ✗ · '+a.just+' J'+(a.rate!=null?' ('+pct(a.rate)+')':''):'—'})()),h('td',{},(()=>{const r=riskOf(s);return r?h('span',{class:'pill '+r.lvl,title:r.msg},r.lvl==='good'?'bien':r.lvl==='mid'?'ojo':'riesgo'):'—'})()),h('td',{},hrs(th)),h('td',{},h('button',{class:'btn sm',onclick:()=>editSubject(s)},'Editar')))}))))));
  }
}

/* ---------- AJUSTES ---------- */
function vAjustes(app){
  const st=S.settings;
  const num_=(k,label,o={})=>h('label',{class:'f'},h('span',{},label),h('input',{type:o.t||'number',step:'any',value:o.pct?Math.round(st[k]*100):st[k],onchange:e=>{st[k]=o.t==='date'?e.target.value:(o.pct?+e.target.value/100:+e.target.value);save();render()}}));
  app.append(h('div',{class:'card'},h('h2',{},'Ajustes generales'),h('div',{class:'grid g2'},
    h('div',{},num_('start','El seguimiento empieza el',{t:'date'}),num_('red','Umbral ROJO (% por debajo)',{pct:true}),num_('green','Umbral VERDE (% desde)',{pct:true}),num_('minData','Mín. de unidades para mostrar un %')),
    h('div',{},num_('sleepGreen','Sueño: horas para verde (desde)'),num_('sleepRed','Sueño: horas para rojo (menos de)'),
      h('div',{class:'grid g2'},num_('t1s','1.er cuatrimestre: inicio',{t:'date'}),num_('t1e','1.er cuatrimestre: fin',{t:'date'}),num_('t2s','2.º cuatrimestre: inicio',{t:'date'}),num_('t2e','2.º cuatrimestre: fin',{t:'date'})))),
    h('label',{class:'row'},h('input',{type:'checkbox',checked:!!st.incArch,onchange:e=>{st.incArch=e.target.checked;save();render()}}),'Incluir hábitos archivados en las estadísticas'),
    h('p',{class:'muted small'},'El umbral verde también es el % del objetivo que cuenta como cumplido (p. ej. 90 % de 60 min = 54 min). Los días anteriores al inicio y los futuros nunca cuentan.')));
  app.append(h('div',{class:'card'},h('h2',{},'Opciones'),
    h('label',{class:'row'},h('input',{type:'checkbox',checked:st.countClass,onchange:e=>{st.countClass=e.target.checked;save();render()}}),'Las clases a las que asisto suman a mis horas de estudio (por asignatura y centro)'),
    h('label',{class:'row',style:'margin-top:6px'},h('input',{type:'checkbox',checked:st.notif,onchange:e=>{if(e.target.checked){if(typeof Notification==='undefined'){toast('Este navegador no admite avisos');e.target.checked=false;return}Notification.requestPermission().then(p=>{st.notif=p==='granted';if(!st.notif)toast('Permiso denegado en el navegador');save();render()})}else{st.notif=false;save();render()}}}),'Avisos del navegador (medicación y entregas) — solo funcionan con la pestaña abierta'),
    h('p',{class:'muted small'},'Los recordatorios dentro de la app (banners en «Hoy») funcionan siempre. Los avisos del sistema con la app cerrada requieren un servicio externo y no están incluidos.')));
  extraSettings(app);
  // categorías
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h2',{style:'margin:0'},'Categorías (un color cada una)'),h('button',{class:'btn pri',onclick:()=>editCat({name:'',color:S.cats.length%12})},'+ Categoría')),
    S.cats.map((c,i)=>{const k=colOf(c.color);return h('div',{class:'item'},h('span',{class:'chip',style:'background:'+k[2]+';border-left:4px solid '+k[1]},c.name),h('span',{class:'muted small'},S.habits.filter(x=>x.cat===c.id).length+' hábitos'),
      h('span',{style:'margin-left:auto'},mv(S.cats,i),h('button',{class:'btn sm',onclick:()=>editCat(c)},'Editar')))})));
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h2',{style:'margin:0'},'Centros de estudio'),h('button',{class:'btn pri',onclick:()=>editCenter({name:'',color:0})},'+ Centro')),
    S.centers.map((c,i)=>{const k=colOf(c.color);return h('div',{class:'item'},h('span',{class:'chip',style:'background:'+k[2]+';border-left:4px solid '+k[1]},c.name),h('span',{style:'margin-left:auto'},mv(S.centers,i),h('button',{class:'btn sm',onclick:()=>editCenter(c)},'Editar')))})));
  // hábitos
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h2',{style:'margin:0'},'Hábitos y objetivos'),h('button',{class:'btn pri',onclick:()=>editHabit({name:'',cat:(S.cats[0]||{}).id,type:'yn',mode:'daily',sense:'min',nature:'habit',unit:'',od:null,ow:null,om:null,freq:null,from:'',to:'',noct:false,days:[],active:true,role:''})},'+ Hábito')),
    S.cats.map(c=>{const hs=S.habits.filter(x=>x.cat===c.id);if(!hs.length)return null;const k=colOf(c.color);
      return h('div',{style:'margin-top:10px'},h('span',{class:'chip',style:'background:'+k[2]},c.name),hs.map(x=>{const i=S.habits.indexOf(x);
        return h('div',{class:'item',style:x.active?'':'opacity:.5'},h('span',{class:'name'},x.name,h('div',{class:'tgt'},[({yn:'Sí/No',qty:'Cantidad',time:'Hora'})[x.type],targetTxt(x),x.days&&x.days.length?x.days.map(d=>DAYN[d-1]).join(' '):'',({habit:'',quant:'',opt:'opcional',ind:'indicador'})[x.nature],x.active?'':'archivado'].filter(Boolean).join(' · '))),
          mv(S.habits,i),h('button',{class:'btn sm',onclick:()=>editHabit(x)},'Editar'))}))})));
}
function mv(arr,i){return h('span',{},h('button',{class:'btn sm',disabled:i===0,onclick:()=>{[arr[i-1],arr[i]]=[arr[i],arr[i-1]];save();render()}},'↑'),' ',h('button',{class:'btn sm',disabled:i===arr.length-1,onclick:()=>{[arr[i+1],arr[i]]=[arr[i],arr[i+1]];save();render()}},'↓'),' ')}
function editCat(c){const isNew=!c.id;form(isNew?'Nueva categoría':'Editar categoría',[{k:'name',label:'Nombre'},{k:'color',label:'Color',t:'color'}],c,v=>{if(!String(v.name||'').trim())return'Escribe un nombre';
  if(isNew)S.cats.push({id:uid('c'),name:v.name,color:v.color});else Object.assign(S.cats.find(x=>x.id===c.id),{name:v.name,color:v.color});save();render()},
  isNew?null:()=>{if(S.habits.some(x=>x.cat===c.id)){toast('Mueve o elimina antes sus hábitos');return}S.cats=S.cats.filter(x=>x.id!==c.id);save();render()})}
function editCenter(c){const isNew=!c.id;form(isNew?'Nuevo centro':'Editar centro',[{k:'name',label:'Nombre'},{k:'color',label:'Color',t:'color'}],c,v=>{if(!String(v.name||'').trim())return'Escribe un nombre';
  if(isNew)S.centers.push({id:uid('k'),name:v.name,color:v.color});else Object.assign(S.centers.find(x=>x.id===c.id),{name:v.name,color:v.color});save();render()},
  isNew?null:()=>{if(S.subjects.some(x=>x.center===c.id)){toast('Mueve o elimina antes sus asignaturas');return}S.centers=S.centers.filter(x=>x.id!==c.id);save();render()})}
function editHabit(x){
  const isNew=!x.id,Y=v=>v.type==='yn',Q=v=>v.type==='qty',T=v=>v.type==='time';
  form(isNew?'Nuevo hábito':'Editar hábito',[
    {k:'name',label:'Nombre'},{k:'cat',label:'Categoría',t:'select',opts:S.cats.map(c=>[c.id,c.name])},
    {k:'type',label:'Tipo de dato',t:'select',opts:[['yn','Sí / No'],['qty','Cantidad (minutos, litros…)'],['time','Hora (medicación, acostarse…)']]},
    {k:'nature',label:'Naturaleza',t:'select',opts:[['habit','Hábito (cuenta en el cumplimiento)'],['quant','Objetivo cuantificable (cuenta)'],['opt','Opcional (no penaliza)'],['ind','Indicador (solo registro)']]},
    {k:'unit',label:'Unidad',show:Q},
    {k:'mode',label:'Cómo se evalúa',t:'select',opts:[['daily','Cada día'],['freqWeek','Frecuencia semanal (N días por semana)'],['freqMonth','Frecuencia mensual (N días al mes)'],['totalWeek','Total semanal (suma)'],['totalMonth','Total mensual (suma)']],show:v=>!T(v)},
    {k:'sense',label:'Sentido',t:'select',opts:[['min','Al menos / después de'],['max','Como máximo / antes de']],show:Q},
    {k:'sense',label:'Sentido',t:'select',opts:[['min','Después de'],['max','Antes de'],['between','Entre dos horas']],show:T},
    {k:'od',label:'Objetivo diario',t:'number',show:v=>Q(v)&&(v.mode==='daily'||v.mode==='freqWeek'||v.mode==='freqMonth')},
    {k:'ow',label:'Objetivo semanal (total)',t:'number',show:v=>Q(v)&&v.mode==='totalWeek'},{k:'om',label:'Objetivo mensual (total)',t:'number',show:v=>Q(v)&&v.mode==='totalMonth'},
    {k:'freq',label:'Nº de días (por semana o mes)',t:'number',show:v=>!T(v)&&(v.mode==='freqWeek'||v.mode==='freqMonth')},
    {k:'from',label:'Hora (desde / límite)',t:'time',show:T},{k:'to',label:'Hasta',t:'time',show:v=>T(v)&&v.sense==='between'},
    {k:'noct',label:'Hora nocturna (cruza la medianoche, p. ej. acostarse)',t:'check',show:T},
    {k:'role',label:'Función especial',t:'select',opts:[['','Ninguna'],['bed','Hora de acostarse (para calcular el sueño)'],['wake','Hora de despertar (para calcular el sueño)'],['med','Medicación (tarjeta «en franja»)']],show:T},
    {k:'days',label:'Días en que aplica (vacío = todos)',t:'days'},{k:'active',label:'Activo (desmarca para archivarlo sin perder su historial)',t:'check'}],
    x,v=>{if(!String(v.name||'').trim())return'Escribe un nombre';if(!v.cat)return'Crea antes una categoría';
      if(v.type==='time'&&tmin(v.from)==null)return'Pon la hora';if(v.type==='time'&&v.sense==='between'&&tmin(v.to)==null)return'Pon la hora «hasta»';
      if((v.mode==='freqWeek'||v.mode==='freqMonth')&&!num(v.freq))return'Indica cuántos días';
      if(v.type!=='qty'&&(v.mode==='totalWeek'||v.mode==='totalMonth'))v.mode='daily';
      if(isNew)S.habits.push(Object.assign({id:uid('h')},v));else Object.assign(S.habits.find(q=>q.id===x.id),v);save();render()},
    isNew?null:()=>{if(!confirm('Se borrará también TODO su historial. Si solo quieres dejar de usarlo, cancela y desmarca «Activo» (queda archivado).'))return;S.habits=S.habits.filter(q=>q.id!==x.id);for(const d in S.logs){delete S.logs[d][x.id];if(!Object.keys(S.logs[d]).length)delete S.logs[d]}save();render()});
}

/* ---------- DATOS ---------- */
function parseCSV(t){const rows=[];let r=[],c='',q=false;for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}else if(ch==='"')q=true;else if(ch===','){r.push(c);c=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';if(r.some(x=>x!==''))rows.push(r);r=[]}else c+=ch}
  if(c!==''||r.length){r.push(c);rows.push(r)}return rows}
function importCSV(text){let n=0;const rows=parseCSV(text);
  for(const[d,name,val]of rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(d||''))continue;const it=S.habits.find(x=>x.name===name)||S.subjects.find(x=>x.name===name);
    let v=val;if(name==='(estado del día)')it&&0;if(v===''||v==null)continue;if(/^-?\d+(\.\d+)?$/.test(v))v=+v;
    if(name==='(estado del día)'){(S.logs[d]=S.logs[d]||{})._s=v;n++;continue}
    if(!it){const cl=S.classes.find(c=>c.id===name.replace(/^a:/,''));if(/^a:/.test(name)&&cl){setLog(d,name,v);n++}continue}
    setLog(d,it.id,v);n++}
  save();return n}
function download(name,text,type){const a=h('a',{href:URL.createObjectURL(new Blob([text],{type})),download:name});document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
function vDatos(app){
  const size=Math.round(JSON.stringify(S).length/1024);
  app.append(h('div',{class:'card'},h('h2',{},'Tus datos'),h('p',{},'Todo se guarda automáticamente en este navegador (≈'+size+' KB, '+Object.keys(S.logs).length+' días con datos). Si borras los datos del navegador o cambias de dispositivo se pierden: ',h('b',{},'haz copias de seguridad.')),
    h('p',{class:'muted small'},'Última copia: '+(S.settings.lastExport?fmtD(S.settings.lastExport):'nunca')),
    h('div',{class:'row'},
      h('button',{class:'btn pri',onclick:()=>{S.settings.lastExport=realToday();save();download('mi-tracker-'+realToday()+'.json',JSON.stringify(S,null,1),'application/json');render()}},'⬇ Exportar copia (JSON)'),
      h('label',{class:'btn'},'⬆ Importar copia',h('input',{type:'file',accept:'application/json,.json',style:'display:none',onchange:e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const d=JSON.parse(r.result);if(!d||d.v!==1||!d.habits||!d.settings)throw 0;if(!confirm('Esto reemplaza todos los datos actuales por los de la copia. ¿Continuar?'))return;S=d;save();toast('Copia importada');render()}catch(_){toast('El archivo no es una copia válida')}};r.readAsText(f)}})),
      h('button',{class:'btn',onclick:()=>{const rows=[['fecha','habito','valor']];Object.keys(S.logs).sort().forEach(d=>{for(const k in S.logs[d]){const it=hab(k)||subj(k);rows.push([d,k==='_s'?'(estado del día)':it?it.name:k,S.logs[d][k]])}});download('registro.csv',rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n'),'text/csv')}},'Exportar registro (CSV)'),
      h('label',{class:'btn'},'Importar registro (CSV)',h('input',{type:'file',accept:'.csv,text/csv',style:'display:none',onchange:e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{const n=importCSV(r.result);toast(n?n+' registros importados':'No se importó nada (formato: fecha,hábito,valor)');render()};r.readAsText(f)}})),
      h('button',{class:'btn',onclick:()=>window.print()},'Imprimir'))));
  securityCard(app);
  app.append(h('div',{class:'card'},h('h3',{},'Zona de peligro'),h('div',{class:'row'},
    h('button',{class:'btn dan',onclick:()=>{if(confirm('Se borrarán SOLO los registros diarios (hábitos, horas, estados). Se mantienen hábitos, horario y tareas. ¿Seguro?')){S.logs={};save();render()}}},'Borrar solo los registros diarios'),
    h('button',{class:'btn dan',onclick:()=>{if(confirm('Se borra TODO y se vuelve a los datos de ejemplo. ¿Seguro?')){S=seed();save();UI.date=null;UI.week=null;render()}}},'Restaurar datos de ejemplo'))));
  app.append(h('div',{class:'card'},h('h3',{},'Cómo funciona'),h('ul',{class:'small'},
    h('li',{},'Vacío = sin registrar: no cuenta ni como éxito ni como fallo. Descanso y N/A tampoco cuentan. Los días futuros y los anteriores al inicio no cuentan.'),
    h('li',{},'Cantidad: se considera cumplida al llegar al umbral verde (90 %) del objetivo. «Frecuencia semanal»: la semana cumple si hay al menos N días cumplidos (N baja solo en semanas parciales o con días que no aplican). «Total»: se suma la semana o el mes.'),
    h('li',{},'Rachas: días seguidos cumplidos; un día pasado sin registrar la corta, hoy sin registrar no; descanso y N/A no la cortan.'))));
}
function boot(){render();if(S.settings.autoBackup){const dl=S.settings.lastExport?Math.floor((pd(realToday())-pd(S.settings.lastExport))/864e5):99;if(dl>=7&&Object.keys(S.logs).length){try{download('mi-tracker-'+realToday()+'.json',JSON.stringify(S,null,1),'application/json');S.settings.lastExport=realToday();save();toast('Copia de seguridad descargada')}catch(e){toast('No se pudo descargar la copia automática')}}}
  if(!S.settings.onboarded&&FRESH)onboarding()}
function init(){
  load();if(S.settings.incArch===undefined)S.settings.incArch=true;applyAppearance();
  document.getElementById('undo').addEventListener('click',undo);document.getElementById('redo').addEventListener('click',redo);
  document.getElementById('q').addEventListener('keydown',e=>{if(e.key==='Enter'){search(e.target.value);e.target.value=''}});
  document.addEventListener('keydown',e=>{const ed=/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||''));if((e.ctrlKey||e.metaKey)&&!ed){if(e.key==='z'||e.key==='Z'){e.preventDefault();e.shiftKey?redo():undo()}else if(e.key==='y'){e.preventDefault();redo()}}});
  setInterval(notifyTick,60000);setInterval(tickTimer,1000);
  if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)&&!/jsdom/i.test(navigator.userAgent))navigator.serviceWorker.register('sw.js').catch(()=>{});
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(e){}
  if(FRESH)IDB.get('data').then(j=>{if(!j)return;const d=JSON.parse(j);if(d&&d.habits&&Object.keys(d.logs||{}).length&&confirm('Se ha encontrado una copia interna anterior con tus datos. ¿Restaurarla?')){S=migrate(d);save();render()}}).catch(()=>{});
  if(S.settings.pin&&!SESSION_UNLOCKED){render();showLock(boot)}else boot();
}
window.HT={holidayOn,overrideOf,riskOf,moveTask,moveClass,timerStart,timerPause,timerStop,timerElapsed,timerItems,relations,hashPin,upcoming,itemsOn,subToText,textToSub,subProg,setNames,applyLang,attachDrag,wizardReset,showLock,get SESSION_UNLOCKED(){return SESSION_UNLOCKED},set SESSION_UNLOCKED(v){SESSION_UNLOCKED=v},attStats,classHours,dayClassHours,plan,makeICS,noLunch,weekSummary,reminders,search,undo,redo,importCSV,migrate,get UNDO(){return UNDO},get S(){return S},set S(v){S=v},UI,score,evalHabit,aggregate,streak,studyHours,subjHours,sleepHours,classesOn,clashes,taskState,taskPending,render,seed,period,subjActive,setLog,monday,addD,today,ratio,load,save};
if(document.readyState!=='loading')init();else document.addEventListener('DOMContentLoaded',init);
