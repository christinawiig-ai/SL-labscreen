import {renderSlide} from './render.mjs?v=20260909-transit3';
import {designSamples} from './samples.mjs?v=20260909-transit3';
import {decodeStore,STORAGE_KEY} from './storage.mjs?v=20260909-transit3';
const item=(decodeStore(localStorage.getItem(STORAGE_KEY))||[]).find(x=>x.id==='design-v2-event-novem')||designSamples().find(x=>x.id==='design-v2-event-novem');
const canvas=document.querySelector('canvas'),pause=document.querySelector('#pause'),error=document.querySelector('#error');
const options={
  replay:{file:'slide-replay.mp4',description:'Min anbefaling: en iscenesatt replay av en designbeskjed og eventkode fra dette prosjektet. Helt fast utsnitt. Ikke et opptak av chatten.',source:'Laget for Startuplab · 18 sekunder · ',url:'assets/video/alternatives/slide-replay.mp4',link:'Åpne videofilen'},
  vidsplay:{file:'vidsplay.mp4',description:'Et rolig opptak av kode som skrives i en editor. Mer dokumentarisk, men mindre knyttet til akkurat dette eventet.',source:'Video: Vidsplay.com · gratis med synlig kreditering · ',url:'https://www.vidsplay.com/computer-code-free-stock-video/',link:'Se originalen'},
  mixkit:{file:'mixkit-1728.mp4',description:'Et tett og skrått utsnitt av kode og autofullføring. Mer abstrakt i det smale feltet; fortsatt et filmet skjermbilde.',source:'Video: Mixkit · Stock Video Free License · ',url:'https://mixkit.co/free-stock-video/software-developer-working-on-code-screen-close-up-1728/',link:'Se originalen'}
};
let selected='replay',request=0;
const video=document.createElement('video');video.muted=true;video.loop=true;video.playsInline=true;
async function select(key){
  const version=++request;selected=key;video.pause();video.src='assets/video/alternatives/'+options[key].file+'?v=4';error.textContent='';
  document.querySelectorAll('[data-option]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.option===key)));
  document.querySelector('#description').textContent=options[key].description;
  const source=document.querySelector('#source');source.replaceChildren(document.createTextNode(options[key].source));
  const link=document.createElement('a');link.href=options[key].url;link.textContent=options[key].link;source.append(link);
  pause.textContent='Spill av';
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){try{await video.play();if(version===request)pause.textContent='Pause';}catch(e){if(version===request)error.textContent='Trykk Spill av for å starte videoen.';}}
}
document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>select(b.dataset.option));
pause.onclick=async()=>{if(video.paused){try{await video.play();pause.textContent='Pause';}catch{error.textContent='Videoen kunne ikke spilles av.';}}else{video.pause();pause.textContent='Spill av';}};
video.onerror=()=>{error.textContent='Videoen kunne ikke lastes.';};
async function tick(){try{if(video.readyState>=2){await renderSlide(canvas,item.content,{videoFrame:video});if(selected==='vidsplay'){const ctx=canvas.getContext('2d');ctx.fillStyle='#131d20';ctx.fillRect(1640,1032,280,48);ctx.font='20px Arial';ctx.fillStyle='#faf8f7';ctx.fillText('Video: Vidsplay.com',1660,1063);}}}catch(e){error.textContent=e.message;}setTimeout(tick,40);}
select('replay');tick();
