'use strict';
/* =====================================================================
   FUNCIONES AÑADIDAS: calendario, eventos, diario, informe, cronómetro,
   festivos, bloques fijos, apariencia, seguridad y primer uso.
   ===================================================================== */
const evIcon=t=>({exam:'📝',concert:'🎵',other:'📌'})[t]||'📌';
const daysLeft=d=>Math.round((pd(d)-pd(today()))/864e5);
const leftTxt=n=>n<0?'hace '+(-n)+' d':n===0?'hoy':n===1?'mañana':'en '+n+' días';
function itemsOn(date){
  const it=[];
  S.events.filter(e=>e.date===date).forEach(e=>it.push({e,txt:evIcon(e.type)+' '+(e.time?e.time+' ':'')+e.title,cls:'ev'}));
  S.tasks.filter(t=>t.status!=='done'&&t.due===date).forEach(t=>it.push({t,txt:'✅ '+t.title,cls:'tk'}));
  return it;
}
function upcoming(n){
  const t=today(),r=[];
  S.events.filter(e=>e.date>=t).forEach(e=>r.push({d:e.date,txt:evIcon(e.type)+' '+e.title+(e.time?' ('+e.time+')':''),e}));
  S.tasks.filter(x=>x.status!=='done'&&x.due&&x.due>=t).forEach(x=>r.push({d:x.due,txt:'✅ Entrega: '+x.title,t:x}));
  return r.sort((a,b)=>a.d.localeCompare(b.d)).slice(0,n);
}
function editEvent(e){
  const isNew=!e.id;
  form(isNew?'Nuevo evento':'Editar evento',[
    {k:'title',label:'Título'},{k:'type',label:'Tipo',t:'select',opts:[['exam','📝 Examen'],['concert','🎵 Concierto'],['other','📌 Otro']]},
    {k:'date',label:'Fecha',t:'date'},{k:'time',label:'Hora (opcional)',t:'time'},
    {k:'subject',label:'Asignatura (opcional)',t:'select',opts:[['','—'],...S.subjects.map(s=>[s.id,s.name])]},{k:'notes',label:'Notas',t:'textarea'}],
    e,v=>{if(!String(v.title||'').trim())return'Escribe un título';if(!v.date)return'Elige la fecha';
      if(isNew)S.events.push(Object.assign({id:uid('e')},v));else Object.assign(S.events.find(q=>q.id===e.id),v);save();render()},
    isNew?null:()=>{S.events=S.events.filter(q=>q.id!==e.id);save();render()});
}
function editHoliday(x){
  const isNew=!x.id;
  form(isNew?'Nuevo festivo / periodo sin clase':'Editar festivo / periodo sin clase',[
    {k:'label',label:'Nombre (festivo, vacaciones, huelga…)'},{k:'from',label:'Desde',t:'date'},{k:'to',label:'Hasta (vacío = un solo día)',t:'date'},
    {k:'center',label:'Afecta a',t:'select',opts:[['','Todos los centros'],...S.centers.map(c=>[c.id,c.name])]}],
    x,v=>{if(!v.from)return'Elige la fecha de inicio';if(v.to&&v.to<v.from)return'La fecha final es anterior a la inicial';
      if(isNew)S.holidays.push(Object.assign({id:uid('f')},v));else Object.assign(S.holidays.find(q=>q.id===x.id),v);save();render()},
    isNew?null:()=>{S.holidays=S.holidays.filter(q=>q.id!==x.id);save();render()});
}
function editBlock(b){
  const isNew=!b.id;
  form(isNew?'Nuevo bloque fijo':'Editar bloque fijo',[
    {k:'label',label:'Nombre (comida, transporte, trabajo…)'},{k:'start',label:'Inicio',t:'time'},{k:'end',label:'Fin',t:'time'},{k:'days',label:'Días (vacío = todos)',t:'days'}],
    b,v=>{if(tmin(v.start)==null||tmin(v.end)==null||tmin(v.end)<=tmin(v.start))return'Revisa las horas';
      if(isNew)S.blocks.push(Object.assign({id:uid('b')},v));else Object.assign(S.blocks.find(q=>q.id===b.id),v);save();render()},
    isNew?null:()=>{S.blocks=S.blocks.filter(q=>q.id!==b.id);save();render()});
}
function editOverride(c,date){
  const ex=overrideOf(c,date),base=ex||{cancel:false,start:c.start,end:c.end,room:c.room};
  form('Cambiar solo el '+DAYF[wd(date)-1].toLowerCase()+' '+fmtD(date),[
    {k:'cancel',label:'Ese día no hay clase',t:'check'},{k:'start',label:'Inicio',t:'time',show:v=>!v.cancel},{k:'end',label:'Fin',t:'time',show:v=>!v.cancel},{k:'room',label:'Aula / lugar',show:v=>!v.cancel}],
    base,v=>{if(!v.cancel&&(tmin(v.start)==null||tmin(v.end)==null||tmin(v.end)<=tmin(v.start)))return'Revisa las horas';
      if(ex)Object.assign(ex,{cancel:!!v.cancel,start:v.start,end:v.end,room:v.room});else S.overrides.push({id:uid('o'),cls:c.id,date,cancel:!!v.cancel,start:v.start,end:v.end,room:v.room});save();render()},
    ex?()=>{S.overrides=S.overrides.filter(o=>o.id!==ex.id);save();render()}:null);
}
function dayDialog(date){
  const cl=classesOn(date),hol=holidayOn(date),its=itemsOn(date);
  const body=h('div',{},
    hol?h('div',{class:'banner'},'🏖 '+hol.label+' (sin clases)'):null,
    h('h3',{},'Clases'),cl.length?cl.map(c=>{const s=subj(c.subject);return h('div',{class:'item'},h('span',{class:'chip',style:'background:'+colOf(center(s.center).color)[2]},c.start+'–'+c.end),h('span',{class:'name'},s.name),h('span',{class:'muted small'},c.room||''))}):h('p',{class:'muted'},'Sin clases.'),
    h('h3',{style:'margin-top:10px'},'Eventos y entregas'),its.length?its.map(i=>h('div',{class:'item'},h('span',{class:'name'},i.txt),i.e?h('button',{class:'btn sm',type:'button',onclick:function(){this.closest('dialog').close();editEvent(i.e)}},'Editar'):h('button',{class:'btn sm',type:'button',onclick:function(){this.closest('dialog').close();editTask(i.t)}},'Abrir'))):h('p',{class:'muted'},'Nada este día.'));
  dlg(DAYF[wd(date)-1]+' '+fmtD(date),body,()=>[
    h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close();editHoliday({label:'Festivo',from:date,to:'',center:''})}},'Marcar sin clases'),
    h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close();editEvent({title:'',type:'exam',date,time:'',subject:'',notes:''})}},'+ Evento'),
    h('button',{class:'btn pri',type:'button',onclick:function(){this.closest('dialog').close();UI.date=date;UI.tab='hoy';render()}},'Ir a este día')]);
}
function vCal(app){
  const t=today();if(!UI.cal)UI.cal=t.slice(0,7);
  const [y,m]=UI.cal.split('-').map(Number),first=y+'-'+pad(m)+'-01',start=monday(first),nd=dim(y,m);
  const go=n=>{const d=new Date(y,m-1+n,1);UI.cal=d.getFullYear()+'-'+pad(d.getMonth()+1);render()};
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},
    h('div',{class:'row'},h('button',{class:'btn','aria-label':'Mes anterior',onclick:()=>go(-1)},'‹'),h('b',{style:'min-width:150px;text-align:center;font-size:17px'},MONN[m-1]+' '+y),h('button',{class:'btn','aria-label':'Mes siguiente',onclick:()=>go(1)},'›'),h('button',{class:'btn',onclick:()=>{UI.cal=today().slice(0,7);render()}},'Hoy')),
    h('div',{class:'row'},h('button',{class:'btn pri',onclick:()=>editEvent({title:'',type:'exam',date:t,time:'',subject:'',notes:''})},'+ Evento'),h('button',{class:'btn',onclick:()=>editHoliday({label:'Festivo',from:t,to:'',center:''})},'+ Festivo / vacaciones')))));
  const grid=h('div',{class:'mg'});
  DAYN.forEach(n=>grid.append(h('div',{class:'mh'},n)));
  for(let i=0;i<42;i++){
    const d=addD(start,i),inm=d.slice(0,7)===UI.cal,hol=holidayOn(d),its=itemsOn(d),nc=classesOn(d).length;
    grid.append(h('div',{class:'mc'+(inm?'':' out')+(d===t?' today':'')+(hol?' hol':''),tabindex:'0',role:'button','aria-label':fmtD(d),onclick:()=>dayDialog(d),onkeydown:e=>{if(e.key==='Enter')dayDialog(d)}},
      h('div',{class:'dn'},+d.slice(8),nc&&inm?h('span',{class:'dot',title:nc+' clases'},nc):null),hol&&inm?h('div',{class:'hl'},hol.label):null,
      its.slice(0,3).map(x=>h('div',{class:'it '+x.cls},x.txt)),its.length>3?h('div',{class:'muted small'},'+'+(its.length-3)+' más'):null));
  }
  app.append(h('div',{class:'card calcard'},grid));
  const up=upcoming(10);
  app.append(h('div',{class:'card'},h('h3',{},'Próximos eventos y entregas'),up.length?up.map(u=>h('div',{class:'item',style:'cursor:pointer',onclick:()=>u.e?editEvent(u.e):editTask(u.t)},h('span',{class:'pill '+(daysLeft(u.d)<=2?'mid':'good')},leftTxt(daysLeft(u.d))),h('span',{class:'name'},u.txt),h('span',{class:'muted small'},fmtDS(u.d)))):h('p',{class:'muted'},'Nada próximo. Añade exámenes y conciertos con «+ Evento».')));
}
/* ---------- diario ---------- */
function diaryItems(){return[['','General'],...S.subjects.map(s=>['s:'+s.id,s.name]),...S.habits.filter(x=>x.type==='qty').map(x=>['h:'+x.id,x.name])]}
function diaryName(e){if(!e.item)return'General';const id=e.item.replace(/^[sh]:/,'');return(subj(id)||hab(id)||{name:'(borrado)'}).name}
function editDiary(e){
  const isNew=!e.id;
  form(isNew?'Nueva entrada del diario':'Editar entrada',[
    {k:'date',label:'Fecha',t:'date'},{k:'item',label:'Asignatura o actividad',t:'select',opts:diaryItems()},{k:'min',label:'Minutos dedicados (opcional)',t:'number'},{k:'text',label:'¿Qué trabajaste? (repertorio, tempo, pasajes, dudas…)',t:'textarea'}],
    e,v=>{if(!v.date)return'Elige la fecha';if(!String(v.text||'').trim()&&!has(v.min))return'Escribe algo o los minutos';
      if(isNew)S.diary.push(Object.assign({id:uid('d')},v));else Object.assign(S.diary.find(q=>q.id===e.id),v);save();render()},
    isNew?null:()=>{S.diary=S.diary.filter(q=>q.id!==e.id);save();render()});
}
function diaryLine(e){return h('div',{class:'item',style:'align-items:flex-start;cursor:pointer',onclick:()=>editDiary(e)},h('span',{class:'pill na'},fmtDS(e.date)),h('div',{class:'name'},h('b',{},diaryName(e)),has(e.min)?h('span',{class:'muted small'},' · '+hrs(+e.min)+' min'):null,h('div',{style:'font-weight:400;white-space:pre-wrap'},e.text||'')))}
function vDiario(app){
  const q=(UI.diaryQ||'').toLowerCase();
  const list=S.diary.filter(e=>!q||(e.text||'').toLowerCase().includes(q)||diaryName(e).toLowerCase().includes(q)).sort((a,b)=>b.date.localeCompare(a.date));
  const tot=list.reduce((a,e)=>a+(has(e.min)?+e.min:0),0);
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('div',{},h('h2',{style:'margin:0'},'Diario de estudio y práctica'),h('div',{class:'muted small'},list.length+' entradas · '+hrs(tot/60)+' h anotadas')),
    h('div',{class:'row'},h('input',{type:'search',placeholder:'Buscar en el diario…','aria-label':'Buscar en el diario',value:UI.diaryQ||'',onchange:e=>{UI.diaryQ=e.target.value;render()}}),h('button',{class:'btn pri',onclick:()=>editDiary({date:today(),item:'',min:null,text:''})},'+ Entrada')))));
  app.append(h('div',{class:'card'},list.length?list.map(diaryLine):h('p',{class:'muted'},'Aún no hay entradas. Anota qué trabajaste cada día (o usa el cronómetro de «Hoy»).')));
}
/* ---------- informe mensual ---------- */
function vInforme(app){
  const t=today();if(!UI.rep)UI.rep=t.slice(0,7);
  const [y,m]=UI.rep.split('-').map(Number);let a=y+'-'+pad(m)+'-01',b=y+'-'+pad(m)+'-'+pad(dim(y,m));if(a<S.settings.start)a=S.settings.start;if(b>t)b=t;
  app.append(h('div',{class:'card noprint'},h('div',{class:'row spread'},h('div',{class:'row'},h('b',{},'Mes del informe'),dateBtn(UI.rep,v=>{UI.rep=v;render()},{kind:'month',label:'Mes del informe',fmt:monthTxt})),
    h('button',{class:'btn pri',onclick:()=>window.print()},'🖨 Imprimir / guardar como PDF'))));
  if(a>b){app.append(h('div',{class:'card'},h('p',{class:'muted'},'Ese mes está fuera del periodo de seguimiento (empieza el '+fmtD(S.settings.start)+') o aún no ha llegado.')));return}
  const g=aggregate(a,b),gp=ratio(g),sl=sleepAvg(a,b),st=studyHours(a,b),at=attStats(a,b),meds=S.habits.filter(x=>x.role==='med'&&x.active);let mm=0,me=0;meds.forEach(x=>{const r=evalHabit(x,a,b);mm+=r.met;me+=r.ev});
  app.append(h('div',{class:'card'},h('h2',{style:'margin:0 0 4px'},'Informe de '+MONN[m-1]+' '+y),h('div',{class:'muted small'},fmtD(a)+' → '+fmtD(b))));
  app.append(h('div',{class:'grid g4',style:'margin-bottom:14px'},
    h('div',{class:'kpi '+pctCls(gp)},h('div',{class:'l'},'Cumplimiento'),h('div',{class:'v'},gp==null?'n/d':pct(gp)),h('div',{class:'small'},g.met+' de '+g.ev)),
    h('div',{class:'kpi'},h('div',{class:'l'},'Horas de estudio y clase'),h('div',{class:'v'},hrs(st)+' h')),
    h('div',{class:'kpi '+pctCls(at.rate)},h('div',{class:'l'},'Asistencia'),h('div',{class:'v'},at.rate==null?'n/d':pct(at.rate)),h('div',{class:'small'},at.yes+' de '+at.held+' clases')),
    h('div',{class:'kpi'},h('div',{class:'l'},'Sueño medio'),h('div',{class:'v'},sl.n>=S.settings.minData?hrs(sl.avg)+' h':'n/d')),
    h('div',{class:'kpi '+pctCls(me>=S.settings.minData?mm/me:null)},h('div',{class:'l'},'Medicación en franja'),h('div',{class:'v'},me>=S.settings.minData?pct(mm/me):'n/d'))));
  const catRows=S.cats.map(c=>{const r=aggregate(a,b,x=>x.cat===c.id),p=ratio(r);return{l:c.name,v:p,t:p==null?'n/d':pct(p),c:p==null?'var(--line)':p<S.settings.red?'#d9534f':p<S.settings.green?'#e0a800':'#2e9e4f',ev:r.ev}}).filter(r=>r.ev>0);
  const per=S.habits.filter(x=>counts(x)&&x.active).map(x=>{const r=evalHabit(x,a,b);return{x,r,p:ratio(r)}}).filter(o=>o.p!=null).sort((p,q)=>q.p-p.p);
  const li=o=>h('div',{class:'item'},h('span',{class:'name'},o.x.name),h('span',{class:'pill '+pctCls(o.p)},pct(o.p)),h('span',{class:'muted small'},o.r.met+'/'+o.r.ev));
  app.append(h('div',{class:'grid g2'},h('div',{class:'card'},h('h3',{},'Cumplimiento por categoría'),catRows.length?bars(catRows,{max:1}):h('p',{class:'muted'},'Sin datos suficientes.')),
    h('div',{class:'card'},h('h3',{},'Más y menos constantes'),per.slice(0,3).map(li),per.length>3?h('div',{class:'muted small',style:'margin:6px 0'},'…'):null,per.slice(-3).reverse().map(li),per.length?null:h('p',{class:'muted'},'n/d'))));
  const rows=S.subjects.map(s=>({s,tot:subjHours(s,a,b),cl:classHours(s,a,b),att:attStats(a,b,s.id)})).filter(o=>o.tot>0||o.att.held+o.att.cancel>0).sort((p,q)=>q.tot-p.tot);
  app.append(h('div',{class:'card scroll'},h('h3',{},'Asignaturas del mes'),rows.length?h('table',{},h('thead',{},h('tr',{},['Asignatura','Horas totales','De clase','Asistí','No asistí','Justif.','Sin clase','Asistencia'].map(x=>h('th',{},x)))),
    h('tbody',{},rows.map(o=>h('tr',{},h('td',{},h('b',{},o.s.name)),h('td',{},hrs(o.tot)),h('td',{},hrs(o.cl)),h('td',{},o.att.yes),h('td',{},o.att.no),h('td',{},o.att.just),h('td',{},o.att.cancel),h('td',{},o.att.rate==null?'—':pct(o.att.rate)))))):h('p',{class:'muted'},'Sin horas ni clases este mes.')));
  const ev=S.events.filter(e=>e.date>=a.slice(0,8)+'01'&&e.date<=y+'-'+pad(m)+'-31').sort((p,q)=>p.date.localeCompare(q.date)),dn=S.tasks.filter(x=>x.due&&x.due.slice(0,7)===UI.rep);
  app.append(h('div',{class:'grid g2'},h('div',{class:'card'},h('h3',{},'Eventos del mes'),ev.length?ev.map(e=>h('div',{class:'item'},h('span',{class:'name'},evIcon(e.type)+' '+e.title),h('span',{class:'muted small'},fmtDS(e.date)))):h('p',{class:'muted'},'Ninguno.')),
    h('div',{class:'card'},h('h3',{},'Entregas del mes'),dn.length?dn.map(x=>h('div',{class:'item'},h('span',{class:'name'},x.title),h('span',{class:'pill '+(x.status==='done'?'good':'mid')},x.status==='done'?'hecha':'pendiente'),h('span',{class:'muted small'},fmtDS(x.due)))):h('p',{class:'muted'},'Ninguna.'))));
  const dr=S.diary.filter(e=>e.date.slice(0,7)===UI.rep).sort((p,q)=>p.date.localeCompare(q.date));
  if(dr.length)app.append(h('div',{class:'card'},h('h3',{},'Diario del mes'),dr.map(diaryLine)));
}
/* ---------- ajustes añadidos ---------- */
function extraSettings(app){
  const st=S.settings;
  app.append(h('div',{class:'card'},h('h2',{},'Apariencia e idioma'),h('div',{class:'row'},
    h('label',{class:'row',style:'gap:6px'},'Tema',h('select',{onchange:e=>{st.theme=e.target.value;save();render()}},[['auto','Automático'],['light','Claro'],['dark','Oscuro']].map(o=>h('option',{value:o[0],selected:st.theme===o[0]},o[1])))),
    h('label',{class:'row',style:'gap:6px'},'Tamaño de letra',h('input',{type:'range',min:85,max:140,step:5,value:st.font,'aria-label':'Tamaño de letra',onchange:e=>{st.font=+e.target.value;save();render()}}),h('span',{class:'small'},st.font+' %')),
    h('label',{class:'row',style:'gap:6px'},'Idioma',h('select',{onchange:e=>{st.lang=e.target.value;save();render()}},[['es','Castellano'],['gl','Galego']].map(o=>h('option',{value:o[0],selected:st.lang===o[0]},o[1])))),
    h('label',{class:'row',style:'gap:6px'},h('input',{type:'checkbox',checked:st.compact,onchange:e=>{st.compact=e.target.checked;save();render()}}),'Modo compacto')),
    h('p',{class:'muted small'},'La traducción al gallego cubre la interfaz principal; algunos textos dinámicos (mensajes con números o nombres) pueden seguir en castellano.')));
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h2',{style:'margin:0'},'Festivos, vacaciones y días sin clase'),h('button',{class:'btn pri',onclick:()=>editHoliday({label:'Festivo',from:today(),to:'',center:''})},'+ Añadir')),
    h('p',{class:'muted small'},'En esos días no hay clases en el horario, no se piden asistencias y no cuentan. Para cambiar solo una clase de un día concreto, tócala en el Horario → «Solo este día».'),
    S.holidays.slice().sort((a,b)=>a.from.localeCompare(b.from)).map(x=>h('div',{class:'item'},h('span',{class:'pill rest'},fmtDS(x.from)+(x.to&&x.to!==x.from?' → '+fmtDS(x.to):'')),h('span',{class:'name'},x.label,x.center?h('span',{class:'muted small'},' · '+center(x.center).name):null),h('button',{class:'btn sm',onclick:()=>editHoliday(x)},'Editar'))),
    S.holidays.length?null:h('p',{class:'muted'},'Aún no hay ninguno.')));
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('h2',{style:'margin:0'},'Bloques fijos (comida, transporte, trabajo…)'),h('button',{class:'btn pri',onclick:()=>editBlock({label:'',start:'14:00',end:'15:00',days:[]})},'+ Añadir')),
    h('p',{class:'muted small'},'El planificador de tareas no te propondrá estudiar en estas franjas.'),
    S.blocks.map(b=>h('div',{class:'item'},h('span',{class:'pill na'},b.start+'–'+b.end),h('span',{class:'name'},b.label,h('span',{class:'muted small'},' · '+((b.days&&b.days.length)?b.days.map(d=>DAYN[d-1]).join(' '):'todos los días'))),h('button',{class:'btn sm',onclick:()=>editBlock(b)},'Editar'))),
    S.blocks.length?null:h('p',{class:'muted'},'Aún no hay ninguno.')));
}
/* ---------- seguridad, copia y primer uso ---------- */
function setPinDialog(){
  const v={a:'',b:''};
  const body=h('div',{},h('label',{class:'f'},h('span',{},'Nuevo PIN (4 a 8 cifras)'),h('input',{type:'password',inputmode:'numeric',autocomplete:'off',onchange:e=>v.a=e.target.value})),h('label',{class:'f'},h('span',{},'Repite el PIN'),h('input',{type:'password',inputmode:'numeric',autocomplete:'off',onchange:e=>v.b=e.target.value})),
    h('p',{class:'muted small'},'El PIN impide que otra persona abra la app en este dispositivo. No cifra tus datos: las copias de seguridad (JSON) no están protegidas.'));
  dlg('Poner un PIN',body,()=>[h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close()}},'Cancelar'),
    h('button',{class:'btn pri',type:'button',onclick:async function(){if(!/^\d{4,8}$/.test(v.a)){toast('El PIN debe tener de 4 a 8 cifras');return}if(v.a!==v.b){toast('Los PIN no coinciden');return}S.settings.pin=await hashPin(v.a);save();SESSION_UNLOCKED=true;this.closest('dialog').close();render();toast('PIN activado')}},'Guardar')]);
}
function removePinDialog(){
  const v={a:''};
  dlg('Quitar el PIN',h('label',{class:'f'},h('span',{},'Escribe tu PIN actual'),h('input',{type:'password',inputmode:'numeric',onchange:e=>v.a=e.target.value})),()=>[h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close()}},'Cancelar'),
    h('button',{class:'btn dan',type:'button',onclick:async function(){if(await hashPin(v.a)!==S.settings.pin){toast('PIN incorrecto');return}S.settings.pin='';save();this.closest('dialog').close();render();toast('PIN quitado')}},'Quitar')]);
}
let SESSION_UNLOCKED=false;
function showLock(done){
  const box=h('div',{class:'lock',role:'dialog','aria-label':'Aplicación bloqueada'});
  const inp=h('input',{type:'password',inputmode:'numeric',placeholder:'PIN','aria-label':'PIN',autocomplete:'off'}),msg=h('div',{class:'small',style:'color:#ffc7ce;min-height:20px'});
  const go=async()=>{if(await hashPin(inp.value)===S.settings.pin){SESSION_UNLOCKED=true;box.remove();done()}else{msg.textContent='PIN incorrecto';inp.value=''}};
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')go()});
  box.append(h('div',{class:'lockbox'},h('div',{style:'font-size:34px'},'🔒'),h('h2',{style:'color:#fff;margin:6px 0'},'Mi Tracker'),inp,h('button',{class:'btn pri',onclick:go,style:'margin-top:8px'},'Entrar'),msg));
  document.body.append(box);setTimeout(()=>inp.focus(),50);
}
function wizardReset(){
  const v={habits:true,subjects:true,tasks:false,events:false,holidays:false};
  form('Empezar de cero: ¿qué quieres conservar?',[
    {k:'habits',label:'Mis hábitos y categorías',t:'check'},{k:'subjects',label:'Mis asignaturas, centros y horario',t:'check'},{k:'tasks',label:'Mis tareas',t:'check'},{k:'events',label:'Mis eventos',t:'check'},{k:'holidays',label:'Mis festivos y bloques fijos',t:'check'}],
    v,o=>{if(!confirm('Se borrarán TODOS los registros diarios, el diario y lo que no marques. ¿Seguro?'))return'Cancelado';
      S.logs={};S.diary=[];S.timer=null;S.overrides=[];if(!o.tasks)S.tasks=[];if(!o.events)S.events=[];if(!o.holidays){S.holidays=[];S.blocks=[]}
      if(!o.habits){S.habits=[];S.cats=[]}if(!o.subjects){S.subjects=[];S.classes=[]}S.settings.onboarded=true;save();render();toast('Listo: empiezas de cero')});
}
function onboarding(){
  const body=h('div',{},h('p',{},'Bienvenida. En 30 segundos:'),h('ol',{},
    h('li',{},h('b',{},'Hoy'),': marca tus hábitos, tu asistencia a clase y las horas de estudio. Vacío = sin registrar (no cuenta).'),
    h('li',{},h('b',{},'Horario'),' y ',h('b',{},'Asignaturas'),': edita clases, cuatrimestres y festivos. Todo se puede cambiar.'),
    h('li',{},h('b',{},'Tareas'),' y ',h('b',{},'Calendario'),': apunta deberes, exámenes y conciertos con su fecha.'),
    h('li',{},h('b',{},'Datos'),': tus datos viven solo en este navegador; haz copias de seguridad.')),
    h('p',{class:'muted small'},'Puedes empezar con los datos de ejemplo (tu horario ya está) o vaciar lo que no quieras.'));
  dlg('Mi Tracker',body,()=>[h('button',{class:'btn',type:'button',onclick:function(){this.closest('dialog').close();S.settings.onboarded=true;save();wizardReset()}},'Empezar de cero…'),
    h('button',{class:'btn pri',type:'button',onclick:function(){S.settings.onboarded=true;save();this.closest('dialog').close()}},'Empezar')]);
}
function securityCard(app){
  const st=S.settings,days=st.lastExport?Math.floor((pd(realToday())-pd(st.lastExport))/864e5):null;
  app.append(h('div',{class:'card'},h('h2',{},'Seguridad y copias'),
    h('div',{class:'row'},st.pin?[h('button',{class:'btn',onclick:()=>{SESSION_UNLOCKED=false;showLock(()=>render())}},'🔒 Bloquear ahora'),h('button',{class:'btn dan',onclick:removePinDialog},'Quitar PIN')]:h('button',{class:'btn',onclick:setPinDialog},'🔒 Poner un PIN')),
    h('label',{class:'row',style:'margin-top:8px'},h('input',{type:'checkbox',checked:st.autoBackup,onchange:e=>{st.autoBackup=e.target.checked;save();render()}}),'Descargar una copia automática al abrir la app si han pasado 7 días'),
    h('p',{class:'small muted',id:'persist'},'Almacenamiento: copia redundante en IndexedDB activa. '+(days==null?'Aún no has exportado ninguna copia.':'Última copia exportada hace '+days+' días.')),
    h('div',{class:'row'},h('button',{class:'btn',onclick:wizardReset},'Empezar de cero (elegir qué conservar)'),h('button',{class:'btn',onclick:()=>{IDB.get('data').then(j=>{if(!j){toast('No hay copia en IndexedDB');return}if(confirm('Restaurar la copia interna guardada en IndexedDB (reemplaza lo actual)?')){S=migrate(JSON.parse(j));save();render()}}).catch(()=>toast('IndexedDB no disponible'))}},'Restaurar copia interna'))));
}
