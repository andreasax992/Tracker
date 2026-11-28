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
  app.append(h('div',{class:'card'},list.length?list.map(diaryLine):h('p',{class:'muted'},'Aún no hay entradas. Anota qué trabajaste cada día (o registra una sesión en «Estudio»).')));
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
    v,o=>{if(!confirm('Se borrarán TODOS los registros diarios, el diario y lo que no marques. Antes se guarda una copia interna recuperable. ¿Seguro?'))return'Cancelado';
      (async()=>{if(!await protect('empezar de cero'))return;
      S.logs={};S.diary=[];S.timer=null;S.overrides=[];if(!o.tasks)S.tasks=[];if(!o.events)S.events=[];if(!o.holidays){S.holidays=[];S.blocks=[]}
      if(!o.habits){S.habits=[];S.cats=[]}if(!o.subjects){S.subjects=[];S.classes=[]}S.settings.onboarded=true;save();render();toast('Listo: empiezas de cero (copia previa guardada)')})()});
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
  const st=S.settings;
  app.append(h('div',{class:'card'},h('h2',{},'Seguridad y copias'),
    h('div',{class:'row'},st.pin?[h('button',{class:'btn',onclick:()=>{SESSION_UNLOCKED=false;showLock(()=>render())}},'🔒 Bloquear ahora'),h('button',{class:'btn dan',onclick:removePinDialog},'Quitar PIN')]:h('button',{class:'btn',onclick:setPinDialog},'🔒 Poner un PIN')),
    h('label',{class:'row',style:'margin-top:8px'},h('input',{type:'checkbox',checked:st.autoBackup,onchange:e=>{st.autoBackup=e.target.checked;save();render()}}),'Descargar una copia automática al abrir la app si han pasado 7 días'),
    h('div',{class:'row'},h('button',{class:'btn',onclick:wizardReset},'Empezar de cero (elegir qué conservar)'))));
}

/* =====================================================================
   SESIONES DE ESTUDIO (bloque C): se apuntan una vez y suman a la asignatura o al hábito (instrumento)
   ===================================================================== */
const ACTIVIDADES=['Estudio','Práctica','Repaso','Teoría','Ejercicios','Escucha','Otra'];
const pieceName=id=>{const p=(S.pieces||[]).find(q=>q.id===id);return p?p.title:null};
const refName=id=>{const s=subj(id);if(s)return s.name;const x=hab(id);return x?x.name:'(eliminado)'};
function sessRefs(){return[['','— elige —'],...S.subjects.map(s=>[s.id,'📚 '+s.name]),...S.habits.filter(x=>x.type==='qty'&&(x.unit==='min'||x.unit==='h')&&x.active!==false).map(x=>[x.id,'🎵 '+x.name])]}
function editSession(x){
  const isNew=!x.id;
  form(isNew?'Nueva sesión':'Editar sesión',[
    {k:'date',label:'Fecha',t:'date'},
    {k:'ref',label:'Asignatura o hábito (instrumento)',t:'select',opts:sessRefs(),hint:'Los instrumentos son tus hábitos de práctica con unidad en minutos u horas.'},
    {k:'piece',label:'Pieza o repertorio (opcional)',t:'select',opts:[['','—'],...(S.pieces||[]).filter(p=>p.status!=='done').map(p=>[p.id,'🎼 '+p.title])]},
    {k:'bpm',label:'Tempo alcanzado (bpm, opcional)',t:'number'},
    {k:'min',label:'Minutos',t:'number'},
    {k:'activity',label:'Tipo de trabajo',t:'select',opts:ACTIVIDADES.map(a=>[a,a])},
    {k:'goal',label:'Objetivo de la sesión (opcional)'},
    {k:'notes',label:'Notas (repertorio, tempo, pasajes, dudas…)',t:'textarea'}],
    x,v=>{if(!v.date)return'Elige la fecha';if(!v.ref)return'Elige asignatura o hábito';if(!(+v.min>0))return'Indica los minutos';
      v.min=+v.min;v.bpm=+v.bpm>0?+v.bpm:null;v.piece=v.piece||'';S.sessions=S.sessions||[];if(isNew)S.sessions.push(Object.assign({id:uid('x')},v));else Object.assign(S.sessions.find(q=>q.id===x.id),v);save();render()},
    isNew?null:()=>{S.sessions=S.sessions.filter(q=>q.id!==x.id);save();render()},
    [{label:'+ Crear hábito de práctica',fn:()=>editHabit({name:'',cat:(S.cats.find(c=>/pr[aá]ctica|m[uú]sic/i.test(c.name))||S.cats[0]||{}).id,type:'qty',mode:'daily',sense:'min',nature:'habit',unit:'min',od:null,ow:null,om:null,freq:null,from:'',to:'',noct:false,days:[],active:true,role:''})}]);
}
function sessLine(x){return h('div',{class:'item',style:'align-items:flex-start;cursor:pointer',onclick:()=>editSession(x)},h('span',{class:'pill na'},fmtDS(x.date)),h('div',{class:'name'},h('b',{},refName(x.ref)),h('span',{class:'muted small'},' · '+x.min+' min · '+(x.activity||'')+(x.piece&&pieceName(x.piece)?' · 🎼 '+pieceName(x.piece):'')+(x.bpm?' · ♩='+x.bpm:'')),x.goal?h('div',{class:'small'},'🎯 '+x.goal):null,x.notes?h('div',{style:'font-weight:400;white-space:pre-wrap'},x.notes):null))}
function sessionsGroup(app,date,before){
  const l=sessionsOn(date),tot=l.reduce((a,s)=>a+(+s.min||0),0);
  app.append(group('sess',h('span',{class:'gtitle'},'Sesiones de estudio y práctica'),l.length?hrs(tot/60)+' h':'',[
    l.length?l.map(sessLine):h('p',{class:'muted small'},'Sin sesiones este día. Cada sesión suma a las horas de la asignatura o a los minutos del hábito, sin apuntarlo dos veces.'),
    before?null:h('button',{class:'btn',onclick:()=>editSession({date,ref:'',min:null,activity:'Estudio',goal:'',notes:''})},'+ Sesión')],'var(--accent)'));
}
function vSesiones(app){
  const P=UI.sessP==null?30:UI.sessP,ref=UI.sessRef||'',t=today(),from=P?addD(t,-P+1):'0000-01-01';
  const list=(S.sessions||[]).filter(x=>x.date>=from&&x.date<=t&&(!ref||x.ref===ref)).sort((a,b)=>b.date.localeCompare(a.date));
  const mins=list.reduce((a,x)=>a+(+x.min||0),0);
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('div',{},h('h2',{style:'margin:0'},'Sesiones de estudio y práctica'),h('div',{class:'muted small'},list.length+' sesiones · '+hrs(mins/60)+' h en el periodo')),
    h('button',{class:'btn pri',onclick:()=>editSession({date:t,ref,min:null,activity:'Estudio',goal:'',notes:''})},'+ Sesión')),
    h('div',{class:'row',style:'margin-top:10px'},
      h('select',{'aria-label':'Periodo',onchange:e=>{UI.sessP=+e.target.value;render()}},[[7,'Últimos 7 días'],[30,'Últimos 30 días'],[90,'Últimos 90 días'],[0,'Todo']].map(o=>h('option',{value:o[0],selected:P===o[0]},o[1]))),
      h('select',{'aria-label':'Asignatura o hábito',onchange:e=>{UI.sessRef=e.target.value;render()}},[['','Todas las asignaturas y hábitos'],...sessRefs().slice(1)].map(o=>h('option',{value:o[0],selected:ref===o[0]},o[1]))))));
  const mon=d=>addD(d,-((new Date(d+'T12:00:00').getDay()+6)%7)),rows=[];
  for(let i=7;i>=0;i--){const a=addD(mon(t),-7*i),m=sessMinutes(a,addD(a,6),ref);rows.push({l:fmtDS(a).slice(0,5),v:m/60,t:hrs(m/60)})}
  app.append(h('div',{class:'card'},h('h3',{},'Horas por semana (últimas 8)'),cols(rows)));
  const by={};list.forEach(x=>by[x.ref]=(by[x.ref]||0)+(+x.min||0));
  if(Object.keys(by).length)app.append(h('div',{class:'card'},h('h3',{},'Reparto en el periodo'),bars(Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([id,m])=>({l:refName(id),v:m,t:hrs(m/60)+' h'})))));
  app.append(h('div',{class:'card'},list.length?list.slice(0,100).map(sessLine):h('p',{class:'muted'},'Aún no hay sesiones en este periodo.')));
}

/* =====================================================================
   PROYECTOS Y OBJETIVOS (bloque D)
   ===================================================================== */
const GOAL_KINDS=[['hours','Horas de trabajo (asignatura o hábito)'],['tasks','Tareas del proyecto hechas'],['manual','Manual (tú pones el avance)']];
function editProject(x){
  const isNew=!x.id;
  form(isNew?'Nuevo proyecto':'Editar proyecto',[
    {k:'name',label:'Nombre'},{k:'desc',label:'Descripción (opcional)',t:'textarea'},
    {k:'subject',label:'Asignatura (opcional)',t:'select',opts:[['','—'],...S.subjects.map(s=>[s.id,s.name])]},
    {k:'from',label:'Inicio',t:'date'},{k:'due',label:'Fecha límite',t:'date'},
    {k:'status',label:'Estado',t:'select',opts:[['active','Activo'],['paused','En pausa'],['done','Terminado']]}],
    x,v=>{if(!String(v.name||'').trim())return'Escribe el nombre';v.mod=nowISO();S.projects=S.projects||[];if(isNew)S.projects.push(Object.assign({id:uid('p')},v));else Object.assign(S.projects.find(q=>q.id===x.id),v);save();render()},
    isNew?null:async()=>{if(!await protect('borrar el proyecto «'+x.name+'»'))return;deleteProject(x.id);render()});
}
function editGoal(x){
  const isNew=!x.id;
  form(isNew?'Nuevo objetivo':'Editar objetivo',[
    {k:'title',label:'Objetivo'},
    {k:'project',label:'Proyecto',t:'select',opts:[['','Sin proyecto'],...(S.projects||[]).map(p=>[p.id,p.name])]},
    {k:'kind',label:'Cómo se mide',t:'select',opts:GOAL_KINDS},
    {k:'ref',label:'Asignatura o hábito',t:'select',opts:sessRefs(),show:v=>v.kind==='hours',hint:'Cuenta las horas que ya apuntas (a mano y en sesiones) dentro del periodo.'},
    {k:'target',label:'Meta (horas)',t:'number',show:v=>v.kind==='hours'},
    {k:'target',label:'Meta (número)',t:'number',show:v=>v.kind==='manual'},
    {k:'cur',label:'Llevas',t:'number',show:v=>v.kind==='manual'},
    {k:'unit',label:'Unidad (opcional)',show:v=>v.kind==='manual'},
    {k:'from',label:'Desde',t:'date'},{k:'to',label:'Hasta',t:'date'},{k:'notes',label:'Notas',t:'textarea'}],
    x,v=>{if(!String(v.title||'').trim())return'Escribe el objetivo';if(v.kind==='tasks'&&!v.project)return'Elige el proyecto cuyas tareas se cuentan';
      if(v.kind==='hours'&&!v.ref)return'Elige asignatura o hábito';if(v.kind!=='tasks'&&!(+v.target>0))return'Indica una meta mayor que 0';
      v.mod=nowISO();S.goals=S.goals||[];if(isNew)S.goals.push(Object.assign({id:uid('g')},v));else Object.assign(S.goals.find(q=>q.id===x.id),v);save();render()},
    isNew?null:()=>{S.goals=S.goals.filter(q=>q.id!==x.id);save();render()});
}
const newGoal=p=>({title:'',project:p||'',kind:'hours',ref:'',target:null,cur:0,unit:'',from:'',to:'',notes:''});
function goalLine(g){
  const r=goalProgress(g),pc=r.pct==null?null:Math.round(r.pct*100);
  const txt=g.kind==='tasks'?r.cur+' de '+r.target+' tareas':(g.kind==='hours'?hrs(r.cur)+' de '+hrs(r.target)+' h':hrs(r.cur)+' de '+hrs(r.target)+(r.unit?' '+r.unit:''));
  return h('div',{class:'item',style:'align-items:flex-start;cursor:pointer;flex-direction:column;gap:4px',onclick:()=>editGoal(g)},
    h('div',{class:'row spread',style:'width:100%'},h('b',{},g.title),h('span',{class:'pill '+(r.done?'good':r.late?'bad':'na')},r.done?'✓ Cumplido':r.late?'Vencido':(pc==null?'—':pc+' %'))),
    h('div',{class:'muted small'},txt+(g.to?' · hasta '+fmtDS(g.to):'')),
    pc==null?null:bars([{l:'',v:Math.min(100,pc),mark:r.exp!=null?r.exp*100:null,t:'',c:r.done?'var(--accent2)':null}],{max:100}));
}
function vProyectos(app){
  const ps=(S.projects||[]).slice().sort((a,b)=>(a.status==='done')-(b.status==='done')||(a.due||'9').localeCompare(b.due||'9'));
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('div',{},h('h2',{style:'margin:0'},'Proyectos y objetivos'),h('div',{class:'muted small'},ps.length+' proyectos · '+(S.goals||[]).length+' objetivos')),
    h('div',{class:'row'},h('button',{class:'btn',onclick:()=>editGoal(newGoal())},'+ Objetivo'),h('button',{class:'btn pri',onclick:()=>editProject({name:'',desc:'',subject:'',from:today(),due:'',status:'active'})},'+ Proyecto')))));
  if(!ps.length&&!(S.goals||[]).length)app.append(h('div',{class:'card'},h('p',{class:'muted'},'Crea un proyecto (un trabajo, un repertorio, una entrega…) y añade objetivos medibles. El avance se calcula con tus horas, sesiones y tareas.')));
  ps.forEach(p=>{const r=projectProgress(p),pc=r.pct==null?null:Math.round(r.pct*100),gs=(S.goals||[]).filter(g=>g.project===p.id);
    app.append(h('div',{class:'card'},h('div',{class:'row spread',style:'cursor:pointer',onclick:()=>editProject(p)},h('div',{},h('h3',{style:'margin:0'},p.name+(p.status==='done'?' ✓':p.status==='paused'?' (en pausa)':'')),
      h('div',{class:'muted small'},[p.subject&&subj(p.subject)?subj(p.subject).name:null,p.due?'límite '+fmtDS(p.due)+(r.daysLeft!=null&&p.status!=='done'?(r.daysLeft>=0?' ('+r.daysLeft+' días)':' (vencido)'):''):null,r.tasks?r.tasksDone+'/'+r.tasks+' tareas':null].filter(Boolean).join(' · '))),
      h('span',{class:'pill '+(pc>=100?'good':'na')},pc==null?'sin objetivos':pc+' %')),
      p.desc?h('div',{class:'small',style:'margin-top:6px;white-space:pre-wrap'},p.desc):null,
      gs.length?gs.map(goalLine):h('p',{class:'muted small'},'Sin objetivos todavía.'),
      h('button',{class:'btn sm',onclick:()=>editGoal(newGoal(p.id))},'+ Objetivo en este proyecto')))});
  const free=(S.goals||[]).filter(g=>!g.project||!(S.projects||[]).some(p=>p.id===g.project));
  if(free.length)app.append(h('div',{class:'card'},h('h3',{},'Objetivos sin proyecto'),free.map(goalLine)));
}

/* =====================================================================
   TEMAS CON REPASOS ESPACIADOS Y REPERTORIO (bloque E)
   ===================================================================== */
const RES_TXT={good:'Bien',ok:'Regular',bad:'Mal'};
const when=(d,t)=>{const n=daysBetween(t,d);return n<0?'vencido hace '+(-n)+(n===-1?' día':' días'):n===0?'hoy':n===1?'mañana':'en '+n+' días'};
function editTopic(x){
  const isNew=!x.id;
  form(isNew?'Nuevo tema':'Editar tema',[
    {k:'title',label:'Tema (qué quieres repasar)'},
    {k:'subject',label:'Asignatura (opcional)',t:'select',opts:[['','—'],...S.subjects.map(s=>[s.id,s.name])]},
    {k:'start',label:'Fecha en que lo estudiaste',t:'date',show:()=>isNew},
    {k:'next',label:'Próximo repaso',t:'date',show:()=>!isNew,hint:'Puedes moverlo. Cada repaso lo recalcula solo.'},
    {k:'status',label:'Estado',t:'select',opts:[['active','Activo (se repasa)'],['done','Dominado (sin repasos)']]},
    {k:'notes',label:'Notas',t:'textarea'}],
    x,v=>{if(!String(v.title||'').trim())return'Escribe el tema';S.topics=S.topics||[];
      if(isNew){S.topics.push(newTopic({title:v.title,subject:v.subject||'',start:v.start||today(),notes:v.notes||'',status:v.status||'active'}))}
      else{if(!v.next)return'Indica el próximo repaso';Object.assign(S.topics.find(q=>q.id===x.id),{title:v.title,subject:v.subject||'',next:v.next,status:v.status,notes:v.notes||'',mod:nowISO()})}
      save();render()},
    isNew?null:()=>{S.topics=S.topics.filter(q=>q.id!==x.id);save();render()});
}
function reviewBtns(t){return h('div',{class:'row'},[['bad','✗ Mal'],['ok','~ Regular'],['good','✓ Bien']].map(([r,l])=>h('button',{class:'btn sm',type:'button',onclick:()=>{reviewTopic(t,r);render()}},l)))}
function reviewsGroup(app,date){
  if(date!==today())return;const due=topicsDue(date);if(!due.length)return;
  app.append(group('rev',h('span',{class:'gtitle'},'Repasos de hoy'),due.length+'',[
    h('div',{class:'muted small'},'Pulsa cómo te ha ido: «Bien» espacia más el próximo repaso, «Mal» lo acerca.'),
    due.map(t=>h('div',{class:'item',style:'flex-direction:column;align-items:flex-start;gap:6px'},h('div',{class:'row spread',style:'width:100%;cursor:pointer',onclick:()=>editTopic(t)},h('b',{},t.title),h('span',{class:'muted small'},(t.subject&&subj(t.subject)?subj(t.subject).name+' · ':'')+when(t.next,date))),reviewBtns(t)))],'var(--accent2)'));
}
function vTemas(app){
  const t=today(),act=(S.topics||[]).filter(x=>x.status==='active').sort((a,b)=>a.next.localeCompare(b.next)),done=(S.topics||[]).filter(x=>x.status!=='active');
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('div',{},h('h2',{style:'margin:0'},'Temas y repasos espaciados'),h('div',{class:'muted small'},act.length+' activos · '+topicsDue(t).length+' para repasar hoy')),
    h('button',{class:'btn pri',onclick:()=>editTopic({title:'',subject:'',start:t,notes:'',status:'active'})},'+ Tema')),
    h('p',{class:'muted small'},'Apunta lo que estudias y la app te dice cuándo repasarlo: 1, 3, 7, 14, 30, 60 y 120 días si lo recuerdas bien.')));
  if(!(S.topics||[]).length)app.append(h('div',{class:'card'},h('p',{class:'muted'},'Aún no hay temas. Añade uno después de estudiarlo.')));
  if(act.length)app.append(h('div',{class:'card'},act.map(x=>h('div',{class:'item',style:'flex-direction:column;align-items:flex-start;gap:6px'},
    h('div',{class:'row spread',style:'width:100%;cursor:pointer',onclick:()=>editTopic(x)},h('div',{},h('b',{},x.title),h('div',{class:'muted small'},(x.subject&&subj(x.subject)?subj(x.subject).name+' · ':'')+'repaso '+((x.history||[]).length+1)+' · paso '+(x.step+1)+'/'+REV_STEPS.length)),h('span',{class:'pill '+(x.next<=t?'bad':'na')},when(x.next,t))),
    x.next<=t?reviewBtns(x):null))));
  if(done.length)app.append(h('div',{class:'card'},h('h3',{},'Dominados'),done.map(x=>h('div',{class:'item',style:'cursor:pointer',onclick:()=>editTopic(x)},h('span',{class:'name'},x.title),h('span',{class:'muted small'},(x.history||[]).length+' repasos')))));
}
const PIECE_ST=[['learning','Aprendiendo'],['polishing','Puliendo'],['ready','Lista para tocar'],['done','Terminada']];
function editPiece(x){
  const isNew=!x.id;
  form(isNew?'Nueva pieza':'Editar pieza',[
    {k:'title',label:'Título'},{k:'composer',label:'Compositor/a o autor/a (opcional)'},
    {k:'instrument',label:'Instrumento (hábito de práctica)',t:'select',opts:[['','—'],...S.habits.filter(h=>h.type==='qty'&&(h.unit==='min'||h.unit==='h')).map(h=>[h.id,'🎵 '+h.name])]},
    {k:'status',label:'Estado',t:'select',opts:PIECE_ST},{k:'tempo',label:'Tempo objetivo (bpm, opcional)',t:'number'},
    {k:'due',label:'Fecha de la actuación o entrega (opcional)',t:'date'},{k:'notes',label:'Notas (pasajes difíciles, digitaciones…)',t:'textarea'}],
    x,v=>{if(!String(v.title||'').trim())return'Escribe el título';v.tempo=+v.tempo>0?+v.tempo:null;v.mod=nowISO();S.pieces=S.pieces||[];
      if(isNew)S.pieces.push(Object.assign({id:uid('m')},v));else Object.assign(S.pieces.find(q=>q.id===x.id),v);save();render()},
    isNew?null:async()=>{if(!await protect('borrar la pieza «'+x.title+'»'))return;S.pieces=S.pieces.filter(q=>q.id!==x.id);S.sessions.forEach(s=>{if(s.piece===x.id)s.piece=''});save();render()});
}
function vMusica(app){
  const ps=(S.pieces||[]).slice().sort((a,b)=>(a.status==='done')-(b.status==='done')||(a.due||'9').localeCompare(b.due||'9'));
  app.append(h('div',{class:'card'},h('div',{class:'row spread'},h('div',{},h('h2',{style:'margin:0'},'Seguimiento musical'),h('div',{class:'muted small'},ps.length+' piezas')),
    h('button',{class:'btn pri',onclick:()=>editPiece({title:'',composer:'',instrument:'',status:'learning',tempo:null,due:'',notes:''})},'+ Pieza')),
    h('p',{class:'muted small'},'Al registrar una sesión elige la pieza y, si quieres, el tempo alcanzado: aquí verás el tiempo dedicado y cómo sube el tempo.')));
  if(!ps.length)app.append(h('div',{class:'card'},h('p',{class:'muted'},'Aún no hay piezas. Añade el repertorio que estás trabajando.')));
  ps.forEach(p=>{const r=pieceStats(p),stl=(PIECE_ST.find(o=>o[0]===p.status)||[])[1];
    const tail=r.series.slice(-8);
    app.append(h('div',{class:'card'},h('div',{class:'row spread',style:'cursor:pointer',onclick:()=>editPiece(p)},h('div',{},h('h3',{style:'margin:0'},p.title),
      h('div',{class:'muted small'},[p.composer||null,p.instrument&&hab(p.instrument)?hab(p.instrument).name:null,p.due?'actuación '+fmtDS(p.due)+(r.daysLeft!=null&&p.status!=='done'?(r.daysLeft>=0?' ('+r.daysLeft+' días)':' (pasada)'):''):null].filter(Boolean).join(' · '))),h('span',{class:'pill '+(p.status==='done'||p.status==='ready'?'good':'na')},stl)),
      h('div',{class:'small',style:'margin-top:6px'},r.sessions?r.sessions+' sesiones · '+hrs(r.min/60)+' h · última '+(r.daysSince===0?'hoy':'hace '+r.daysSince+' días'):'Sin sesiones todavía'),
      p.tempo?h('div',{class:'small'},'Tempo: '+(r.lastBpm?'♩='+r.lastBpm:'sin datos')+' de ♩='+p.tempo+(r.bestBpm&&r.bestBpm!==r.lastBpm?' (máximo '+r.bestBpm+')':'')):null,
      p.tempo&&r.lastBpm?bars([{l:'',v:Math.min(100,Math.round(r.tempoPct*100)),t:Math.round(r.tempoPct*100)+' %'}],{max:100}):null,
      tail.length>1?cols(tail.map(x=>({l:fmtDS(x.date).slice(0,5),v:x.bpm,t:''+x.bpm})),p.tempo?{max:Math.max(p.tempo,...tail.map(x=>x.bpm))}:{}):null,
      p.notes?h('div',{class:'small muted',style:'white-space:pre-wrap'},p.notes):null))});
}
function vEstudio(app){
  const tab=UI.estTab||'ses';
  app.append(h('div',{class:'seg s3',style:'margin-bottom:10px'},[['ses','Sesiones'],['temas','Temas y repasos'],['musica','Repertorio']].map(([k,l])=>h('button',{type:'button',class:tab===k?'on yes':'','aria-pressed':String(tab===k),onclick:()=>{UI.estTab=k;render()}},l))));
  ({ses:vSesiones,temas:vTemas,musica:vMusica})[tab](app);
}
