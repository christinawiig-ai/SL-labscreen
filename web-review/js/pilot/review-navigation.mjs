const menu=document.getElementById('slide-menu');
const nav=document.getElementById('slide-navigation');
const designs=document.getElementById('designs');
const desktop=matchMedia('(min-width:1001px)');
function resize(){menu.open=desktop.matches;}
resize();desktop.addEventListener('change',resize);
function build(){
  const slides=[...designs.querySelectorAll('.review-slide')];
  nav.replaceChildren(...slides.map((slide,index)=>{
    const a=document.createElement('a'),number=document.createElement('span');
    a.href='#'+slide.id;number.textContent=String(index+1).padStart(2,'0');
    const title=slide.querySelector('.review-select')?.textContent.trim()||slide.id;
    a.append(number,document.createTextNode(title.replace(/^Nytt konsept · /,'')));
    a.addEventListener('click',()=>{if(!desktop.matches)menu.open=false;});
    return a;
  }));
  mark();
}
function mark(){for(const a of nav.querySelectorAll('a')){if(a.hash===location.hash)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');}}
new MutationObserver(build).observe(designs,{childList:true});
addEventListener('hashchange',mark);build();
