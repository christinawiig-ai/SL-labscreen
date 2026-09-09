// Branded static layouts. Shared helpers keep preview and PNG export identical.
export async function renderMemberLayout(ctx,content,h){
  const {text,box,imageFit,imageCover,loadImage,drawQr,C}=h;
  const {type,eyebrow,title,body,detail,location,cta,url,image,expertise}=content;
  if(type==='benefit-roundup'){
    box(ctx,0,0,1920,1080,C.off);
    text(ctx,eyebrow,80,64,1760,44,{sizes:[26],color:C.red});
    text(ctx,title,80,146,1740,180,{sizes:[80,72],weight:400,line:1.05});
    text(ctx,body,80,365,1610,98,{sizes:[32,30],weight:400,color:'#6C6565',line:1.3});
    content.cards.forEach((card,index)=>{
      const x=80+index*600;
      box(ctx,x,518,540,3,C.red);
      text(ctx,card.heading,x,551,540,70,{sizes:[42,36]});
      text(ctx,card.detail,x,650,520,155,{sizes:[34,30],weight:400,line:1.3});
      text(ctx,card.note,x,828,index===2?400:520,86,{sizes:[25,23],weight:400,color:'#6C6565',line:1.3});
    });
    text(ctx,cta,1160,931,490,65,{sizes:[28,26],color:C.red});
    if(url)drawQr(ctx,url,1720,888,144);
    return;
  }
  if(type==='event-spotlight'||type==='event-artwork'){
    box(ctx,0,0,1920,1080,C.off);
    box(ctx,1152,0,768,1080,C.dark);
    if(content.cards?.length){
      content.cards.forEach((card,index)=>{
        const y=176+index*172;
        box(ctx,1200,y,48,3,C.red);
        text(ctx,card.heading,1200,y+28,640,64,{sizes:[40,36],color:C.white});
        text(ctx,card.detail,1200,y+96,640,70,{sizes:[28,26],weight:400,color:'#B8C1BF',line:1.25});
      });
      if(image)imageFit(ctx,await loadImage(image),1200,766,144,144);
      const [name,...role]=(expertise||'').split('\n');
      text(ctx,name,1372,782,472,60,{sizes:[34,30],color:C.white});
      text(ctx,role.join(' · '),1372,842,472,88,{sizes:[26,24],weight:400,color:'#B8C1BF'});
    }else if(image){
      const picture=await loadImage(image);
      if(type==='event-artwork')imageCover(ctx,picture,1152,0,768,1080);
      else imageFit(ctx,picture,1192,176,688,688);
    }
    if(type==='event-artwork'){
      const mark=await loadImage('assets/photos/ai-mad-lab-logo.png');
      imageFit(ctx,mark,80,54,76,76);
      text(ctx,eyebrow,180,75,884,54,{sizes:[26],color:C.red});
    }else text(ctx,eyebrow,80,64,980,48,{sizes:[26],color:C.red});
    text(ctx,title,80,154,992,254,{sizes:[80,72,64],weight:400,line:1.08});
    const topic=Boolean(content.cards?.length);
    text(ctx,body,80,444,952,topic?190:156,{sizes:topic?[36,34]:[32,30],weight:400,color:'#6C6565',line:1.3});
    if(!topic)text(ctx,expertise,80,630,952,94,{sizes:[32,28],weight:400,line:1.35});
    text(ctx,detail,80,topic?720:777,960,85,{sizes:[36,32],line:1.2});
    text(ctx,location,80,topic?814:873,740,84,{sizes:[28,26],weight:400,line:1.3});
    text(ctx,cta,80,topic?934:978,740,42,{sizes:[28,26],color:C.red});
    if(url)drawQr(ctx,url,936,884,144); // Plain QR, including AI Mad Lab.
    return;
  }
  if(type==='member-news'){
    box(ctx,0,0,1920,1080,C.dark);
    if(image)imageFit(ctx,await loadImage(image),1152,252,768,576);
    text(ctx,eyebrow,80,64,992,50,{sizes:[26],color:C.red});
    text(ctx,title,80,154,992,270,{sizes:[80,72,64],weight:400,color:C.white,line:1.08});
    text(ctx,body,80,459,936,204,{sizes:[34,32],weight:400,color:C.off,line:1.3});
    text(ctx,detail,80,720,992,54,{sizes:[27,25],weight:400,color:'#B8C1BF'});
    if(url){drawQr(ctx,url,80,835,168);text(ctx,cta,286,884,764,80,{sizes:[32,28],color:C.white});}
    text(ctx,location,1216,1001,640,52,{sizes:[20],weight:400,color:C.white});
  }
}
