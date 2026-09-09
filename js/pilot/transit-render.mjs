import {drawQr} from './qr.mjs?v=20260909-transit3';
import {STOP_URL,transitView,osloClock,osloStamp} from './transit.mjs?v=20260909-transit3';
const C={dark:'#1D2526',off:'#FAF8F7',red:'#FF3333',muted:'#B9BEBC',rule:'#495151'};
let localSnapshot,logo;
async function snapshotFile(){return localSnapshot ||= fetch('assets/data/transit-snapshot.json?v=20260909-transit3').then(r=>{if(!r.ok)throw new Error('Snapshot unavailable');return r.json();}).catch(()=>null);}
function label(ctx,text,x,y,size=28,color=C.off,weight=400,align='left'){
  ctx.font=`${weight} ${size}px "Replica LL", sans-serif`;ctx.fillStyle=color;ctx.textBaseline='top';ctx.textAlign=align;ctx.fillText(text,x,y);
}
function editableLabel(ctx,value,x,y,width,sizes,color=C.off,weight=400){
  const text=String(value);
  for(const size of sizes){
    ctx.font=`${weight} ${size}px "Replica LL", sans-serif`;
    if(!/[\r\n]/.test(text)&&ctx.measureText(text).width<=width){label(ctx,text,x,y,size,color,weight);return;}
  }
  throw new Error(`The text “${text.slice(0,48)}” is too long for this departure board. Please shorten it.`);
}
function fitted(ctx,value,x,y,width,size=32,color=C.off){
  ctx.font=`400 ${size}px "Replica LL", sans-serif`;
  const words=String(value).split(/\s+/);let lines=[''];
  for(const word of words){const i=lines.length-1,test=lines[i]?`${lines[i]} ${word}`:word;if(ctx.measureText(test).width>width&&lines[i])lines.push(word);else lines[i]=test;}
  if(lines.length>2){lines=lines.slice(0,2);let last=lines[1];while(last.length&&ctx.measureText(last+'…').width>width)last=last.slice(0,-1);lines[1]=last+'…';}
  lines.forEach((line,i)=>label(ctx,line,x,y+i*30,size,color));
}
function rect(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
async function brandLogo(){return logo ||= new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src='assets/logos/SL_symbol_red_tight.svg';});}
/** Draw the full 1920 x 1080 board. Fonts are loaded by the caller.
 * content.transitData overrides the archived gallery file; content.transitLive forbids that fallback.
 */
export async function renderTransit(ctx,content={}) {
  const data=content.transitData??(content.transitLive?null:await snapshotFile());
  const now=content.transitNow??Date.now(),view=transitView(data,{now,limit:5});
  ctx.save();
  try {
  rect(ctx,0,0,1920,1080,C.dark);
  const mark=await brandLogo();
  // Tight symbol is bounded by height; the full signature's tall SVG whitespace
  // otherwise pushes its visible wordmark into the headline below it.
  if(mark)ctx.drawImage(mark,80,60,44*mark.naturalWidth/mark.naturalHeight,44);
  editableLabel(ctx,content.eyebrow??'LEAVING THE LAB',120,66,1040,[28,26],C.red,700);
  editableLabel(ctx,content.title??'Your next departure.',80,130,1040,[88,84,80]);
  const clock=view.archived?view.reference:now;
  label(ctx,osloClock(clock),1840,70,86,C.off,400,'right');
  const status=view.archived?'SNAPSHOT · ARCHIVED DEPARTURES':view.valid?'DEPARTURES · UPDATED EVERY MINUTE':'DEPARTURES UNAVAILABLE';
  label(ctx,status,1840,179,26,view.archived?C.red:C.muted,700,'right');
  if(view.archived)label(ctx,osloStamp(data.queryTime),1840,216,26,C.muted,400,'right');
  rect(ctx,80,270,1760,2,C.rule);
  for(const [index,section] of view.sections.entries()){
    const x=80+index*600,w=560;
    label(ctx,section.mode==='metro'?'Metro':section.mode==='tram'?'Tram':'Bus',x,307,46,C.off,700);
    label(ctx,section.name,x,364,30,C.muted);
    
    if(!section.departures.length){
      fitted(ctx,view.valid?'No departures in the next two hours':'Waiting for updated departures',x,472,w,28,C.off);
      label(ctx,view.valid?'Find more travel options in Entur.':'Check Entur before you leave.',x,526,28,C.muted);
    }
    section.departures.forEach((departure,i)=>{
      const y=426+i*82;
      rect(ctx,x,y,64,52,C.red);label(ctx,departure.line,x+32,y+9,30,C.dark,700,'center');
      fitted(ctx,departure.destination,x+80,y+1,310,26,departure.cancelled?C.muted:C.off);
      const timeLabel=departure.cancelled?'Cancelled':departure.timeLabel==='Nå'?'Now':departure.timeLabel;
      label(ctx,timeLabel,x+w,y+1,32,departure.cancelled?C.red:C.off,700,'right');
      const delay=Math.round((Date.parse(departure.departureTime)-Date.parse(departure.aimedDepartureTime))/60000);
      const detail=departure.cancelled?'':departure.realtime&&delay>0?`+${delay} min`:!departure.realtime?'Scheduled':view.archived?'Recorded':'Live';
      label(ctx,detail,x+w,y+39,22,C.muted,400,'right');
      if(i<4)rect(ctx,x,y+73,w,1,C.rule);
    });
  }
  rect(ctx,80,858,1760,2,C.rule);
  editableLabel(ctx,content.cta??'Plan your journey',80,890,690,[43,38,34,30,28]);
  label(ctx,'Metro + tram: Forskningsparken',80,950,26,C.muted);
  label(ctx,'Bus: Gaustad',80,986,26,C.muted);
  const stamp=data?.fetchedAt?`Entur · retrieved ${osloStamp(data.fetchedAt)}`:'Entur · no current data';
  label(ctx,stamp,870,895,25,C.muted);

  label(ctx,view.archived?'Scan for current departures.':view.valid?'Check your journey before you leave.':'Waiting for updated data.',870,947,26,C.muted);
  drawQr(ctx,content.url||STOP_URL,1696,886,144);
  return view;
  } finally {ctx.restore();}
}
