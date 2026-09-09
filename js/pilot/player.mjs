import {activeItems} from './model.mjs?v=20260909-transit3';
import {STORAGE_KEY,decodeStore} from './storage.mjs?v=20260909-transit3';
import {renderSlide,renderFallback} from './render.mjs?v=20260909-transit3';
const canvas=document.getElementById('playback'), screen=document.getElementById('screen'), error=document.getElementById('player-error'),status=document.getElementById('playback-status');
let displayed='',token=0,lastRaw,items=[],renderError='';
async function tick(){
  let entries=[];
  try{const raw=localStorage.getItem(STORAGE_KEY);if(raw!==lastRaw){items=decodeStore(raw)||[];lastRaw=raw;}entries=activeItems(items,screen.value,new Date());error.textContent=renderError;}
  catch(e){items=[];lastRaw=undefined;error.textContent=`Kan ikke lese testinnhold: ${e.message}`;}
  const item=entries.length?entries[Math.floor(Date.now()/12000)%entries.length]:null;
  const key=item?`${screen.value}:${item.id}:${item.revision}:${JSON.stringify(item.content)}`:`empty:${screen.value}`;
  status.textContent=entries.length?`${entries.length} aktive innlegg · 12 sekunder per bilde · lokal test`:'Ingen aktive godkjenninger. Viser reserveslide.';
  if(key===displayed)return;displayed=key;renderError='';const attempt=++token;
  // Hide the previous slide immediately at expiry, even while fonts/images load.
  canvas.style.visibility='hidden';
  try{const buffer=document.createElement('canvas');if(item)await renderSlide(buffer,item.content);else await renderFallback(buffer);if(attempt!==token)return;canvas.getContext('2d').drawImage(buffer,0,0);canvas.setAttribute('aria-label',buffer.getAttribute('aria-label'));canvas.style.visibility='visible';}
  catch(e){if(attempt!==token)return;renderError=`Viser reserveslide: ${e.message}`;error.textContent=renderError;try{const fallback=document.createElement('canvas');await renderFallback(fallback);if(attempt!==token)return;canvas.getContext('2d').drawImage(fallback,0,0);canvas.setAttribute('aria-label',fallback.getAttribute('aria-label'));canvas.style.visibility='visible';}catch{error.textContent='Kunne ikke laste reservesliden. Last siden på nytt.';}}
}
screen.addEventListener('change',()=>tick());window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)tick();});document.getElementById('fullscreen').onclick=()=>document.getElementById('screen-stage').requestFullscreen().catch(()=>{error.textContent='Nettleseren kunne ikke starte fullskjerm. Prøv nettleserens fullskjermvalg.';});
tick();setInterval(tick,1000);
