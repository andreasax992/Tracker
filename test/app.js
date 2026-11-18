'use strict';
/* Carga la app real (index.html + css + js) en un navegador simulado (jsdom).
   Permite precargar el almacenamiento para simular «cerrar y volver a abrir». */
const {JSDOM}=require('jsdom');const {IDBFactory}=require('fake-indexeddb');
const fs=require('fs'),path=require('path');
const ROOT=path.resolve(__dirname,'..','..');
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function buildHtml(){
  let html=read('index.html');
  html=html.replace(/<link rel="stylesheet" href="([^"]+)">/,(m,f)=>'<style>'+read(f)+'</style>');
  html=html.replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+read(f).replace(/<\/script>/g,'<\\/script>')+'</script>');
  return html;
}
/* opts: storage {clave:valor} · idb (IDBFactory compartido) · noIdb · confirm (true/false) · setItemThrows · getItemThrows */
async function loadApp(opts){
  opts=opts||{};const errors=[],downloads=[];const idb=opts.noIdb?null:(opts.idb||new IDBFactory());
  const dom=new JSDOM(buildHtml(),{runScripts:'dangerously',url:'https://example.com/index.html',pretendToBeVisual:true,
    beforeParse(w){
      w.addEventListener('error',e=>errors.push(e.message));
      for(const k of Object.keys(opts.storage||{}))w.localStorage.setItem(k,opts.storage[k]);
      if(idb)w.indexedDB=idb;
      w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
      w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'))};
      w.confirm=()=>opts.confirm!==false;w.scrollTo=()=>{};w.print=()=>{w.__printed=true};
      if(opts.getItemThrows){const g=w.Storage.prototype.getItem;w.Storage.prototype.getItem=function(k){if(k==='mi-tracker-v1')throw new Error('SecurityError: almacenamiento bloqueado');return g.call(this,k)}}
    }});
  const w=dom.window;await sleep(opts.wait||350);
  w.download=(name,text,type)=>downloads.push({name,text,type});
  if(opts.setItemThrows){const s=w.Storage.prototype.setItem;w.Storage.prototype.setItem=function(k,v){if(k==='mi-tracker-v1')throw Object.assign(new Error('QuotaExceededError'),{name:'QuotaExceededError',code:22});return s.call(this,k,v)}}
  return{window:w,doc:w.document,HT:w.HT,errors,downloads,idb,storage:()=>w.localStorage,sleep,close:()=>w.close()};
}
const clone=x=>JSON.parse(JSON.stringify(x));
module.exports={loadApp,sleep,ROOT,clone,read};
