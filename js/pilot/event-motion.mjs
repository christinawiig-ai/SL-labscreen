import {renderSlide} from './render.mjs?v=20260909-transit3';
import {designSamples} from './samples.mjs?v=20260909-transit3';
import {decodeStore,STORAGE_KEY} from './storage.mjs?v=20260909-transit3';
const canvas=document.getElementById('motion'),status=document.getElementById('status'),record=document.getElementById('record'),still=document.getElementById('still');
const id='design-v2-event-novem';
const item=(decodeStore(localStorage.getItem(STORAGE_KEY))||[]).find(item=>item.id===id)||designSamples().find(item=>item.id===id);
const content=item.content;
let recording=false,readyVideo=null;
const video=document.createElement('video');video.src='assets/video/alternatives/slide-replay.mp4?v=4';video.muted=true;video.loop=true;video.playsInline=true;video.preload='auto';
const pause=document.getElementById('pause');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function tick(){try{await renderSlide(canvas,content,{videoFrame:video.readyState>=2?video:null});setTimeout(tick,40);}catch(error){status.textContent=error.message;record.disabled=true;}}
pause.onclick=async()=>{if(video.paused){await video.play();pause.textContent='Pause video';}else{video.pause();pause.textContent='Spill av video';}};
record.onclick=async()=>{
  if(recording)return;
  if(readyVideo){
    try{const response=await fetch('http://127.0.0.1:8767/event-video',{method:'POST',headers:{'Content-Type':readyVideo.blob.type},body:readyVideo.blob});if(!response.ok)throw new Error('Local export unavailable');status.textContent='Videofilen er lagret i prosjektets exports-mappe. 1920 × 1080 · uten lyd · DEMO.';}
    catch{download(readyVideo.blob,readyVideo.name);status.textContent='Videofilen er klar for nedlasting. 1920 × 1080 · uten lyd · DEMO.';}
    return;
  }
  const mime=['video/mp4;codecs=avc1','video/webm;codecs=vp9','video/webm;codecs=vp8'].find(type=>MediaRecorder.isTypeSupported(type));
  if(!mime){status.textContent='Denne nettleseren støtter ikke videoeksport. Bruk Chrome.';return;}
  recording=true;record.disabled=true;still.disabled=true;pause.disabled=true;status.textContent='Lager videoloopen … 18 sekunder.';
  const stream=canvas.captureStream(25),chunks=[],recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  recorder.onstop=()=>{const ext=mime.startsWith('video/mp4')?'mp4':'webm';readyVideo={blob:new Blob(chunks,{type:mime}),name:`ai-x-sondov-engen-demo.${ext}`};stream.getTracks().forEach(track=>track.stop());recording=false;record.disabled=false;still.disabled=false;pause.disabled=false;record.textContent='Lagre videofilen';status.textContent='Videoloopen er klar. Trykk «Lagre videofilen» for å laste ned.';};
  video.currentTime=0;await video.play();await renderSlide(canvas,content,{videoFrame:video});recorder.start();setTimeout(()=>recorder.stop(),18000);
};
still.onclick=async()=>{const image=document.createElement('canvas');await renderSlide(image,content);image.toBlob(blob=>{if(blob)download(blob,'ai-x-sondov-engen-demo.png');},'image/png');};
tick();
video.addEventListener('loadeddata',async()=>{record.disabled=false;if(!reduced){try{await video.play();}catch{pause.textContent='Spill av video';}}else pause.textContent='Spill av video';},{once:true});
record.disabled=true;
video.addEventListener('error',()=>{status.textContent='Videoen kunne ikke lastes. Stillbildet kan fortsatt eksporteres.';record.disabled=true;pause.disabled=true;});
