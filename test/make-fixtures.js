'use strict';
/* Genera copias «antiguas» a partir de los datos de ejemplo de la app, quitando los campos que se
   añadieron en versiones posteriores (las copias reales de versiones antiguas ya no existen; estas simulan su formato).
   Se ejecuta a mano: node tests/fixtures/make-fixtures.js */
const {loadApp,clone}=require('../helpers/app');const fs=require('fs'),path=require('path');
(async()=>{
  const a=await loadApp(),HT=a.HT,S=clone(HT.S);
  const ids={h:S.habits.map(x=>x.id),s:S.subjects.slice(0,6).map(x=>x.id),c:S.classes.slice(0,5).map(x=>x.id)};
  S.logs={};
  for(let i=0;i<30;i++){const d=new Date(Date.UTC(2026,9,14+i)).toISOString().slice(0,10),L={};
    ids.h.slice(0,12).forEach((id,j)=>{const hb=S.habits.find(x=>x.id===id);if((i+j)%4===0)return;L[id]=hb.type==='yn'?((i+j)%5===0?'no':'yes'):hb.type==='qty'?20+((i*7+j)%50):'07:'+String(10+(i%40)).padStart(2,'0')});
    ids.s.forEach((id,j)=>{if((i+j)%3===0)L[id]=[0.5,1,1.5,2][(i+j)%4]});
    ids.c.forEach((id,j)=>{if((i+j)%4===1)L['a:'+id]=['yes','no','just','cancel'][(i+j)%4]});
    if(i%11===5)L._s='rest';S.logs[d]=L}
  S.tasks=[{id:'t1',subject:S.subjects[0].id,title:'Entrega de ejemplo',assigned:'2026-10-14',due:'2026-11-05',est:3,done:1,priority:'high',status:'todo',notes:''}];
  S.settings.lastExport='2026-10-20';
  const out=(n,o)=>fs.writeFileSync(path.join(__dirname,n),JSON.stringify(o,null,1));
  const v5=clone(S);delete v5.schema;delete v5.meta;out('legacy-schema1-v5.json',v5);
  const v1=clone(v5);['events','holidays','overrides','diary','blocks','timer'].forEach(k=>delete v1[k]);
  v1.tasks.forEach(t=>delete t.sub);v1.subjects.forEach(s=>{delete s.minAtt;delete s.maxAbs});
  const keep=['start','red','green','minData','sleepGreen','sleepRed','t1s','t1e','t2s','t2e','lastExport','todayOverride','incArch'];
  Object.keys(v1.settings).forEach(k=>{if(!keep.includes(k))delete v1.settings[k]});out('legacy-schema1-v1.json',v1);
  const fut=clone(v5);fut.schema=99;out('future-schema.json',fut);
  const inv=clone(v5);delete inv.habits;out('invalid-structure.json',inv);
  fs.writeFileSync(path.join(__dirname,'corrupt.txt'),JSON.stringify(v5).slice(0,4000));
  console.log('Fixtures generados');a.close();process.exit(0);
})();
