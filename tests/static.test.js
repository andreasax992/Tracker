'use strict';
const fs=require('fs'),path=require('path');const {ROOT,read}=require('./helpers/app');
module.exports={name:'Archivos, caché sin conexión (service worker), PWA y estilos iOS',run:async({ok})=>{
  const idx=read('index.html'),sw=read('sw.js'),css=read('css/styles.css');
  const scripts=[...idx.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
  ok(scripts.length>=6&&scripts.every(f=>fs.existsSync(path.join(ROOT,f))),'todos los scripts de index.html existen: '+scripts.join(', '));
  const files=eval((sw.match(/const FILES = (\[[^\]]*\])/)||[])[1]||'[]').map(f=>f.replace(/^\.\//,''));
  ok(files.length>5&&files.filter(f=>f).every(f=>fs.existsSync(path.join(ROOT,f))),'todos los archivos de la caché sin conexión existen');
  ok(scripts.every(s=>files.includes(s))&&files.includes('css/styles.css')&&files.includes('index.html'),'la caché incluye todos los scripts y estilos (si falta uno, no se instalaría el modo sin conexión)');
  ok(/const VERSION = 'mi-tracker-v\d+'/.test(sw)&&/skipWaiting/.test(sw)&&/clients\.claim/.test(sw)&&/caches\.delete/.test(sw),'service worker con versión, activación inmediata y limpieza de cachés antiguas');
  const man=JSON.parse(read('manifest.webmanifest'));ok(man.name&&man.start_url&&man.display==='standalone'&&man.icons.every(i=>fs.existsSync(path.join(ROOT,i.src))),'manifiesto de la PWA válido y con sus iconos');
  ok(/viewport-fit=cover/.test(idx)&&/apple-mobile-web-app-capable/.test(idx)&&/rel="manifest"/.test(idx),'index.html: modo app y áreas seguras de iOS');
  ok(/\.tabbar\{[^}]*padding:[^}]*var\(--sab\)/.test(css)&&/header\{[^}]*padding-top:var\(--sat\)/.test(css),'estilos: respetan los indicadores superior e inferior de iOS');
  ok(!/touch-action:\s*none/.test(css)&&/input,select,textarea\{font-size:max\(16px/.test(css),'estilos: sin bloqueo de gestos y campos de 16 px (sin zoom)');
  const bad=[];css.replace(/([^{}]+)\{([^{}]*)\}/g,(m,sel,b)=>{if(/overflow(-y|-x)?:\s*(auto|scroll)/.test(b)&&!/dialog form|\.scroll|\.ttwrap/.test(sel))bad.push(sel.trim())});ok(bad.length===0,'solo hay contenedores con scroll propio en hojas y tablas anchas: '+bad.join('|'));
  ok(JSON.parse(read('package.json')).scripts.test==='node tests/run.js','package.json: «npm test» ejecuta las pruebas');
  ok(!/Seguimiento (desde|del) /.test(read('js/ui.js')+read('js/extra.js')),'no queda el texto «Seguimiento desde/del…» en la interfaz');
  ok(/const KEY='mi-tracker-v1'/.test(read('js/storage.js')),'la clave de almacenamiento histórica no ha cambiado');
}};
