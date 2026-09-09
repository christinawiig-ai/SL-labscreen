// Keep the original canvas for deterministic still-image exports.
export function enableReviewVideo(canvas){
  const frame=document.createElement('div'),video=document.createElement('video');
  const button=document.createElement('button');
  frame.className='review-motion';canvas.before(frame);frame.append(canvas,video);
  video.src='assets/video/alternatives/slide-replay.mp4?v=4';
  video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';
  video.hidden=true;video.setAttribute('aria-label','Animasjon av kode som skrives');
  button.type='button';button.className='button';button.textContent='Vis video';
  frame.after(button);
  let wantsVideo=false;
  function still(){wantsVideo=false;video.pause();video.hidden=true;button.textContent='Vis video';}
  async function play(){
    wantsVideo=true;button.textContent='Vis stillbilde';
    try{await video.play();if(wantsVideo)video.hidden=false;else video.pause();}
    catch{still();}
  }
  video.addEventListener('error',still);
  button.addEventListener('click',()=>wantsVideo?still():play());
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  reduced.addEventListener('change',()=>{if(reduced.matches)still();});
  if(!reduced.matches)play();
}
