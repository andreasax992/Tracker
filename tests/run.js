'use strict';
/* Ejecutor de pruebas: node tests/run.js   (o npm test)  · filtra con: node tests/run.js storage */
const fs=require('fs');
const filtro=process.argv[2]||'';
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith('.test.js')&&f.includes(filtro)).sort();
let total=0,fail=0;
(async()=>{
  for(const f of files){
    const mod=require('./'+f),t={pass:0,fail:0};
    const ok=(c,m)=>{if(c)t.pass++;else{t.fail++;console.log('   ✗ '+m)}};
    console.log('▶ '+(mod.name||f));
    try{await mod.run({ok})}catch(e){t.fail++;console.log('   ✗ EXCEPCIÓN: '+(e&&e.stack||e))}
    console.log('   '+t.pass+' correctas'+(t.fail?', '+t.fail+' FALLOS':''));total+=t.pass;fail+=t.fail;
  }
  console.log('\n'+(fail?'FALLOS: '+fail:'TODO OK')+' ('+total+' comprobaciones correctas)');
  process.exit(fail?1:0);
})();
