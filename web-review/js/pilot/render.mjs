import {drawQr,qrMatrix} from './qr.mjs?v=20260909-transit3';
import {ALUMNI_LOGOS} from './alumni.mjs?v=20260909-transit3';
import {TIMELINE_PHOTOS} from './timeline.mjs?v=20260909-transit3';
import {renderMemberLayout} from './member-render.mjs?v=20260909-transit3';
import {renderTransit} from './transit-render.mjs?v=20260909-transit3';
// Signage adaptations of Designsystem/decks/_template/LOCK.md, 7 September 2026.
// Fixed 1920px token sizes make exported pixels identical to preview pixels.
const C = {dark:'#1D2526', red:'#FF3333', white:'#FFFFFF', off:'#FAF8F7', grey:'#D9D5D5'};
const images = new Map();
let fonts;
function loadImage(src) {
  if (!images.has(src)) images.set(src, new Promise((resolve,reject) => {
    const img = new Image(); img.onload = () => resolve(img);
    img.onerror = () => { images.delete(src); reject(new Error('Bildet kunne ikke lastes. Last opp bildet på nytt.')); };
    img.src = src;
  }));
  return images.get(src);
}
function loadFonts() {
  return fonts ||= Promise.all([400,700].map(async weight => {
    const name = weight === 400 ? 'Regular' : 'Bold';
    const face = new FontFace('Replica LL', `url(assets/fonts/ReplicaLLWeb-${name}.woff2)`, {weight:String(weight)});
    await face.load(); document.fonts.add(face);
  }));
}
function wrap(ctx,text,width) {
  const lines=[];
  for (const paragraph of String(text).split('\n')) {
    let line='';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (ctx.measureText(word).width > width) {
        if(line) {lines.push(line);line='';}
        for(const char of word) {
          if(ctx.measureText(line+char).width>width){lines.push(line);line='';}
          line+=char;
        }
      } else if (line && ctx.measureText(line+' '+word).width>width) {lines.push(line);line=word;}
      else line += (line?' ':'')+word;
    }
    lines.push(line);
  }
  return lines;
}
function text(ctx,value,x,y,w,h,{sizes=[105,84,67,54],weight=700,color=C.dark,line=1.1}={}) {
  if(!value) return 0;
  for(const size of sizes) {
    ctx.font=`${weight} ${size}px "Replica LL"`;
    const lines=wrap(ctx,value,w);
    if(lines.length*size*line <= h) {
      ctx.fillStyle=color;ctx.textBaseline='top';
      lines.forEach((str,i)=>ctx.fillText(str,x,y+i*size*line));
      return lines.length*size*line;
    }
  }
  throw new Error(`Teksten «${String(value).slice(0,50)}» er for lang for denne malen. Kort den ned eller velg en annen mal.`);
}
function box(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function imageFit(ctx,img,x,y,w,h) {
  const s=Math.min(w/img.naturalWidth,h/img.naturalHeight);
  ctx.drawImage(img,x+(w-img.naturalWidth*s)/2,y+(h-img.naturalHeight*s)/2,img.naturalWidth*s,img.naturalHeight*s);
}
function imageCover(ctx,img,x,y,w,h){const iw=img.videoWidth||img.naturalWidth,ih=img.videoHeight||img.naturalHeight,s=Math.max(w/iw,h/ih);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.drawImage(img,x+(w-iw*s)/2,y+(h-ih*s)/2,iw*s,ih*s);ctx.restore();}
function tintImage(ctx,img,color,x,y,w,h){const layer=document.createElement('canvas');layer.width=w;layer.height=h;const pen=layer.getContext('2d');pen.drawImage(img,0,0,w,h);pen.globalCompositeOperation='source-in';pen.fillStyle=color;pen.fillRect(0,0,w,h);ctx.drawImage(layer,x,y);}
function rule(ctx,x,y,w,color){box(ctx,x,y,w,2,color);}

export async function renderSlide(canvas, content, {demo=true,videoFrame=null}={}) {
  await loadFonts();
  const scratch=document.createElement('canvas');scratch.width=1920;scratch.height=1080;
  const ctx=scratch.getContext('2d');
  const {type,title,body,eyebrow,detail,location,cta,url,image}=content;
  if(type==='transit'){
    await renderTransit(ctx,content);
    canvas.width=1920;canvas.height=1080;canvas.getContext('2d').drawImage(scratch,0,0);
    canvas.setAttribute('aria-label','Kollektivavganger. Datert Entur-snapshot fra Forskningsparken og Gaustad. Åpne live-visningen for oppdaterte avganger.');
    return;
  }
  const dark=['event','request','external','external-bleed','event-deck','event-speaker','member-news'].includes(type), brand=type==='welcome';
  const bg=brand?C.red:dark?C.dark:C.off, fg=dark||brand?C.white:C.dark;
  box(ctx,0,0,1920,1080,bg);
  const logo=await loadImage(`assets/logos/SL_signature_${dark||brand?'white':'black'}.svg`);
  const media=image&&['external','external-bleed','event','event-deck','event-speaker','eir','welcome'].includes(type)?await loadImage(image):null;
  const label=(v,x=96,y=88,w=1728)=>text(ctx,v,x,y,w,86,{sizes:[28],color:brand?C.white:C.red});
  const titleText=(x,y,w,h,sizes=[105,84,67,54])=>text(ctx,title,x,y,w,h,{sizes,color:fg});
  if(['benefit-roundup','member-news','event-spotlight','event-artwork'].includes(type)) {
    await renderMemberLayout(ctx,content,{text,box,imageFit,imageCover,loadImage,drawQr,C});
  } else if(type==='external-bleed') {
    if(!media)throw new Error('Last opp en illustrasjon først.');
    imageCover(ctx,media,0,0,1920,1080);
    // The illustration fills every edge; the SL symbol has no background plate.
  } else if(type==='event-speaker') {
    if(!media)throw new Error('Legg til et bilde av foredragsholderen.');
    // 60/40 editorial split: a single content column and edge-to-edge terminal footage.
    box(ctx,0,0,1152,1080,C.off);
    const terminal=videoFrame||await loadImage('assets/video/alternatives/slide-replay-poster.jpg?v=4');
    imageCover(ctx,terminal,1152,0,768,1080);
    text(ctx,eyebrow,80,65,940,42,{sizes:[26],color:C.red});
    text(ctx,title,80,144,992,248,{sizes:[88,80,72],weight:400,color:C.dark,line:1.08});
    text(ctx,body,80,374,960,174,{sizes:[34,32],weight:400,color:'#6C6565',line:1.25});
    const speaker=(content.expertise||'').split('\n');
    const [speakerName,...speakerRole]=(speaker[0]||'').split(' \u00b7 ');
    ctx.save();ctx.beginPath();ctx.roundRect(80,590,176,176,16);ctx.clip();imageCover(ctx,media,80,590,176,176);ctx.restore();
    text(ctx,speakerName,296,599,764,48,{sizes:[36,32],color:C.dark});
    const background=(speaker[1]||'').replace(/^Former NBIM portfolio manager\.?$/,'ex-NBIM');
    const credentials=[speakerRole.join(' \u00b7 '),background].filter(Boolean).join(' \u00b7 ');
    text(ctx,credentials,296,645,764,42,{sizes:[27,25],weight:400,color:C.dark});
    text(ctx,speaker.slice(2).join('\n'),296,702,740,75,{sizes:[29,27],weight:400,color:C.dark,line:1.2});
    text(ctx,detail,80,832,732,52,{sizes:[34,30],color:C.dark});
    text(ctx,location,80,880,732,40,{sizes:[28,26],weight:400,color:C.dark});
    text(ctx,content.agenda?.replace(/\n/g,' \u00b7 '),80,932,770,38,{sizes:[24,22],weight:400,color:'#6C6565'});
    // One shared centre axis; the widest item keeps the column's 80px inset.
    if(url){
      const modules=qrMatrix(url,{highCorrection:true}).length+8;
      const qr=modules*Math.floor(144/modules);
      ctx.font='700 27px "Replica LL"';
      const ctaWidth=Math.min(238,ctx.measureText(cta).width);
      const centre=1072-Math.max(qr,ctaWidth)/2;
      drawQr(ctx,url,Math.round(centre-qr/2),880,144,{symbol:await loadImage('assets/logos/SL_symbol_red_tight.svg')});
      text(ctx,cta,centre-ctaWidth/2,839,ctaWidth+2,40,{sizes:[27,25],color:C.red});
    }else text(ctx,cta,858,839,238,40,{sizes:[27,25],color:C.red});
  } else if(type==='event-deck') {
    // Template 43: original full-size chip alpha silhouette, recoloured to LOCK dark.
    const photo=media||await loadImage('assets/photos/workshop.jpg');
    imageCover(ctx,photo,652,0,1268,1080);
    tintImage(ctx,await loadImage('assets/brand/chip-frame.png'),C.dark,0,0,1920,1080);
    label(eyebrow,64,88,830);
    text(ctx,title.toUpperCase(),64,178,820,270,{sizes:[84,76,68],color:C.white});
    rule(ctx,64,532,160,C.red);
    text(ctx,body,64,565,810,110,{sizes:[32,28],weight:400,color:C.white});
    if(url){drawQr(ctx,url,64,687,252);text(ctx,detail,356,698,530,104,{sizes:[42,32],color:C.white});text(ctx,location,356,812,530,70,{sizes:[32,28],color:C.white});text(ctx,cta,356,898,530,66,{sizes:[28],color:C.white});}
    else{text(ctx,detail,64,702,820,100,{sizes:[42,32],color:C.white});text(ctx,location,64,822,820,62,{sizes:[32],color:C.white});text(ctx,cta,64,900,820,62,{sizes:[28],color:C.white});}
  } else if(type==='timeline') {
    text(ctx,eyebrow,64,62,1792,46,{sizes:[22],color:C.red});
    const words=title.trim().split(/\s+/),accent=words.splice(-2).join(' '),lead=words.length?words.join(' ')+' ':'';
    let size=64;ctx.font=`400 ${size}px "Replica LL"`;
    while(ctx.measureText(lead+accent).width>1792&&size>36){size-=2;ctx.font=`400 ${size}px "Replica LL"`;}
    if(ctx.measureText(lead+accent).width>1792)throw new Error('Kort ned overskriften på tidslinjen.');
    const leadWidth=ctx.measureText(lead).width;
    text(ctx,lead,64,112,1792,90,{sizes:[size],weight:400});
    text(ctx,accent,64+leadWidth,112,1792-leadWidth,90,{sizes:[size],weight:400,color:C.red});
    box(ctx,64,288,1792,3,C.grey);
    content.milestones.forEach((milestone,index)=>{
      const x=64+index*304;
      text(ctx,milestone.year,x,224,270,42,{sizes:[32],color:C.red});
      ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(x+16,288,16,0,Math.PI*2);ctx.fill();
      const titleHeight=text(ctx,milestone.title,x,322,274,76,{sizes:[32,28],weight:400,line:1.15});
      text(ctx,milestone.detail,x,330+titleHeight,274,158-titleHeight,{sizes:[22,20],weight:400,line:1.25,color:'#6C6565'});
    });
    const photos=await Promise.all(TIMELINE_PHOTOS.map(loadImage));
    photos.forEach((photo,index)=>{
      const x=64+index*606;ctx.save();ctx.beginPath();ctx.roundRect(x,506,584,370,24);ctx.clip();
      // Source's opening photo uses object-position 50% 40%; the other two are centred.
      const scale=Math.max(584/photo.naturalWidth,370/photo.naturalHeight),w=photo.naturalWidth*scale,h=photo.naturalHeight*scale;
      ctx.drawImage(photo,x+(584-w)/2,506+(370-h)*(index===0?.4:.5),w,h);ctx.restore();
    });
  } else if(type==='alumni') {
    label(eyebrow,64,62,1792);
    // Keep the final word red, matching the source headline's emphasis on “here”.
    const words=title.trim().split(/\s+/),last=words.pop(),lead=words.length?words.join(' ')+' ':'';
    let size=64;ctx.font=`400 ${size}px "Replica LL"`;
    while(ctx.measureText(lead+last).width>1792&&size>36){size-=2;ctx.font=`400 ${size}px "Replica LL"`;}
    if(ctx.measureText(lead+last).width>1792)throw new Error('Kort ned overskriften på logoveggen.');
    const leadWidth=ctx.measureText(lead).width;
    text(ctx,lead,64,112,1792,90,{sizes:[size],weight:400});
    text(ctx,last,64+leadWidth,112,1792-leadWidth,90,{sizes:[size],weight:400,color:C.red});
    const logos=await Promise.all(ALUMNI_LOGOS.map(logo=>loadImage(logo.image)));
    ALUMNI_LOGOS.forEach((logo,index)=>{
      const cx=230+(index%5)*366,cy=316+Math.floor(index/5)*224;
      if(logo.id==='huddly'){
        imageFit(ctx,logos[index],cx-67,cy-19,36,38);
        text(ctx,'Huddly',cx-22,cy-18,116,42,{sizes:[30]});
      }else imageFit(ctx,logos[index],cx-122,cy-52,244,104);
    });
  } else if(type==='eir-network') {
    // Standarddeck 62: left introduction, eight circular portraits in a 2 × 4 grid.
    text(ctx,eyebrow,128,126,650,62,{sizes:[22],color:C.red});
    const headline=title.split('\n');
    const headlineHeight=text(ctx,headline[0],128,180,640,100,{sizes:[64,54,44],weight:400});
    text(ctx,headline.slice(1).join('\n'),128,180+headlineHeight+20,640,90,{sizes:[64,54,44],weight:400,color:C.red});
    text(ctx,body,128,390,610,136,{sizes:[28,26],weight:400,color:'#6C6565',line:1.3});
    const areas=(content.expertise||'').split('\n').filter(Boolean);
    let areaY=550;
    for(let index=0;index<areas.length;index+=2){
      // Align each pair at the top; leave the same gap after single- and two-line rows.
      let rowHeight=0;
      areas.slice(index,index+2).forEach((area,column)=>{
        const x=128+column*322;
        ctx.fillStyle=C.red;ctx.beginPath();ctx.arc(x+7,areaY+13,7,0,Math.PI*2);ctx.fill();
        rowHeight=Math.max(rowHeight,text(ctx,area,x+30,areaY,272,57,{sizes:[23,21],weight:400}));
      });
      areaY+=rowHeight+24;
    }
    text(ctx,[detail,location].filter(Boolean).join(' '),128,749,610,66,{sizes:[23,21],weight:400,color:'#6C6565',line:1.25});
    if(url){const qrY=detail||location?838:748;drawQr(ctx,url,128,qrY,168);text(ctx,cta,320,qrY+56,432,80,{sizes:[30,26],color:C.red});}
    const portraits=await Promise.all(content.profiles.map(profile=>loadImage(profile.image)));
    content.profiles.forEach((profile,index)=>{
      const x=800+(index%2)*498,y=136+Math.floor(index/2)*188;
      ctx.beginPath();ctx.roundRect(x,y,476,166,24);ctx.fillStyle=C.white;ctx.fill();ctx.strokeStyle=C.grey;ctx.lineWidth=1;ctx.stroke();
      ctx.save();ctx.beginPath();ctx.arc(x+86,y+83,65,0,Math.PI*2);ctx.clip();imageCover(ctx,portraits[index],x+21,y+18,130,130);ctx.restore();
      const nameHeight=text(ctx,profile.name,x+168,y+25,292,66,{sizes:[28,26],line:1.1});
      text(ctx,profile.bio,x+168,y+33+nameHeight,287,122-nameHeight,{sizes:[24,22,20],weight:400,color:'#6C6565',line:1.2});
    });
  } else if(type==='eir') {
    if(!media)throw new Error('Legg til et portrett.');
    // Open off-white surface, now with the requested softly rounded portrait.
    label(eyebrow,64,88,1088);
    const parts=title.trim().split(/\s+/),surname=parts.pop(),first=parts.join(' ');
    text(ctx,first,64,186,1090,120,{sizes:[105,84,67],color:C.dark});
    text(ctx,surname,64,307,1090,128,{sizes:[105,84,67],color:C.red});
    text(ctx,'CAN HELP WITH',64,488,1000,45,{sizes:[28],color:C.dark});
    text(ctx,body,64,552,1070,225,{sizes:[54,42,32],weight:400});
    rule(ctx,64,806,1088,C.grey);
    text(ctx,detail,64,838,1088,65,{sizes:[32,28]});
    text(ctx,location,64,905,1088,65,{sizes:[32,28],weight:400});
    ctx.save();ctx.beginPath();ctx.roundRect(1280,184,512,512,40);ctx.clip();
    imageCover(ctx,media,1280,184,512,512);ctx.restore();
    if(url){drawQr(ctx,url,1264,768,204);text(ctx,cta||'View LinkedIn profile',1494,808,330,110,{sizes:[32,28],color:C.dark});}
    else text(ctx,cta,1264,780,560,160,{sizes:[32,28],color:C.dark});
  } else if(type==='external') {
    if(!media)throw new Error('Last opp en plakat først.');
    imageFit(ctx,media,64,32,1792,890);
    text(ctx,title,480,974,750,70,{sizes:[32],color:fg});
  } else if(type==='event') {
    label(eyebrow); titleText(96,208,1070,385);
    text(ctx,body,96,631,1040,186,{sizes:[42,32],weight:400,color:fg,line:1.25});
    box(ctx,1248,64,608,858,C.red);
    if(media)imageFit(ctx,media,1280,96,544,340);
    if(media)text(ctx,'COME ALONG',1296,466,512,75,{sizes:[42],weight:400,color:C.white});
    else text(ctx,'LET’S\nGET\nSTARTED.',1296,128,512,370,{sizes:[84,67],weight:400,color:C.white});
    rule(ctx,1296,556,512,C.white);
    text(ctx,detail,1296,600,512,132,{sizes:[42,32],color:C.white});
    text(ctx,location,1296,780,512,96,{sizes:[32,28],weight:400,color:C.white});
    text(ctx,cta,96,854,1040,75,{sizes:[32,28],color:fg});
  } else if(type==='welcome') {
    label(eyebrow); titleText(96,240,1400,375,[160,130,105,84]);
    text(ctx,body,100,674,1320,142,{sizes:[42,32],weight:400,color:fg,line:1.25});
    if(media)imageFit(ctx,media,1510,240,314,500);
    text(ctx,[detail,location].filter(Boolean).join(' / '),100,852,1720,82,{sizes:[32,28],color:fg});

  } else if(type==='benefit') {
    label(eyebrow); titleText(96,204,1050,378);
    text(ctx,body,96,614,1000,192,{sizes:[42,32],weight:400,line:1.25});
    box(ctx,1248,208,608,714,C.dark);
    text(ctx,'YOUR\nNEXT\nSTEP.',1296,256,512,332,{sizes:[84],weight:400,color:C.white});
    rule(ctx,1296,640,512,C.white);
    text(ctx,cta,1296,690,512,182,{sizes:[42,32],color:C.white});
    text(ctx,detail,96,851,1050,82,{sizes:[32,28]});
  } else if(type==='request') {
    label(eyebrow); titleText(96,226,1640,370,[130,105,84,67]);
    text(ctx,body,96,625,1470,142,{sizes:[42,32],weight:400,color:fg,line:1.25});
    rule(ctx,96,817,1728,C.red);
    text(ctx,detail,96,853,1020,78,{sizes:[32,28],color:fg});
    text(ctx,cta,1160,853,660,78,{sizes:[32,28],color:fg});
  } else {
    label(eyebrow); titleText(96,205,1728,375,[130,105,84,67]);
    text(ctx,body,96,613,1620,150,{sizes:[42,32],weight:400,line:1.25});
    box(ctx,96,805,1728,118,C.dark);
    text(ctx,detail,128,838,930,68,{sizes:[42,32],color:C.white});
    text(ctx,location,1120,844,670,60,{sizes:[32,28],color:C.white});
  }
  // Keep the signature in the same place across every layout.
  if(type==='external-bleed')imageFit(ctx,await loadImage('assets/logos/SL_symbol_white.svg'),64,936,72,108);
  else if(['eir','eir-network','alumni','timeline'].includes(type))tintImage(ctx,await loadImage('assets/brand/wordmark.svg'),C.red,64,1008,112,42);
  else if(type==='event-deck')tintImage(ctx,await loadImage('assets/brand/wordmark.svg'),C.white,64,980,180,68);
  else if(type==='benefit-roundup')tintImage(ctx,await loadImage('assets/brand/wordmark.svg'),C.red,80,992,112,42);
  else if(!['event-speaker','member-news','event-artwork','event-spotlight','transit'].includes(type))imageFit(ctx,logo,96,944,180,95);
  const footerDetail=['welcome','notice'].includes(type)?cta:['benefit','request'].includes(type)?location:'';
  if(!['external','external-bleed','event-deck','event-speaker','eir','eir-network','alumni','timeline','benefit-roundup','member-news','event-spotlight','event-artwork','transit'].includes(type)) text(ctx,[footerDetail,url.replace(/^https:\/\//,'')].filter(Boolean).join(' · '),480,978,890,66,{sizes:[28],weight:400,color:fg});
  canvas.width=1920;canvas.height=1080;canvas.getContext('2d').drawImage(scratch,0,0);
  canvas.setAttribute('aria-label',[eyebrow,title,body,content.expertise==='undefined'?'':content.expertise,...(content.cards||[]).flatMap(card=>[card.heading,card.detail,card.note]),detail,location,cta,url,'Demonstrasjonsinnhold'].filter(Boolean).join('. '));
}

export async function renderFallback(canvas) {
  return renderSlide(canvas,{type:'welcome',eyebrow:'LOCAL SCREEN TEST',title:'Room for\nwhat’s next.',body:'No approved content is scheduled for this screen right now.',detail:'',location:'',cta:'',url:'',image:''});
}
