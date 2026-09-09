import {enableReviewVideo} from './review-video.mjs?v=video1';
﻿import {designSamples} from './samples.mjs?v=20260909-transit3';
import {renderSlide} from './render.mjs?v=20260909-transit3';
import {STORAGE_KEY,decodeStore} from './storage.mjs?v=20260909-transit3';
import {REVIEW_KEY,decodeReview,fingerprint,feedbackExport,feedbackMarkdown} from './review-data.mjs?v=20260909-transit3';
import {zipFiles} from './zip.mjs?v=20260909-transit3';
import {MEMBER_DESCRIPTIONS} from './member-content.mjs?v=20260909-transit3';
const $=id=>document.getElementById(id),entries=[];
let review,rawSeen,locked=false,busy=false,unsaved=false;
const descriptions=[
 ['event','Event · chip-vindu + QR','Mal 43 med originalt chip-motiv og QR fra mal 48. QR følger lenken i utkastet. Tidspunktet er et eksempel.'],
 ['eye','AI Mad Lab · full bleed','Mal 30: illustrasjonen fyller skjermen. Den kvadratiske originalen beskjæres til 16:9 rundt midten.'],
 ['christian','Christian Sæterhaug · B2B-salg','Entrepreneur in Residence. Avrundede hjørner, mindre logo og QR til Christians LinkedIn-profil.'],
 ['pradeep','Pradeep Sankaran · AI og produkt','Portrett med avrundede hjørner på lys bakgrunn og mindre logo.'],
 ['hege','Hege Nikolaisen · kommunikasjon og vekst','Portrett med avrundede hjørner og mindre logo. EIR-oversikten knytter Hege til 1X.']
,
 ['network','EIR-nettverket · 40+ og Notion-QR','Mal 62: åtte profiler, redigerbare tekster og QR til EIR-databasen i Notion.'],
 ['alumni','Alumni · They started here','Standarddeck 6a / mal 25: original logovegg med 14 selskaper. Overskrift og antall kan redigeres i studio.'],
 ['timeline','Historie · Fourteen years of founders first','Standarddeck H1 / mal 08: seks redigerbare milepæler og de tre originalbildene fra historiedecket.'],
 ['novem','AI X · Sondov Engen / novem','10. september 2026, 08:30–10:00. Eventdetaljer fra Luma; portrett og utdanning fra novem.io. QR går til arrangementet.']
];
function notify(text){$('review-status').textContent=text;}
function selected(){return entries.filter(entry=>entry.check.checked);}
function refresh(){const count=selected().length;$('selection-count').textContent=`${count} av ${entries.length} slides valgt`;$('export-feedback').disabled=busy||!count;$('export-zip').disabled=busy||!count||selected().some(entry=>!entry.ready);}
function persist(){
  unsaved=true;
  try{if(locked||localStorage.getItem(REVIEW_KEY)!==rawSeen){locked=true;throw new Error('Kommentarene er endret i en annen fane. Eksporter dine kommentarer og last siden på nytt.');}
    const raw=JSON.stringify(review);localStorage.setItem(REVIEW_KEY,raw);rawSeen=raw;unsaved=false;return true;
  }catch(error){notify(`Ikke lagret lokalt: ${error.message} Du kan fortsatt eksportere.`);return false;}
}
function saveSelection(){review.selected=selected().map(entry=>entry.item.id);persist();refresh();}
function download(blob,name){const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),10000);}
function png(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Et bilde kunne ikke eksporteres.')),'image/png'));}
function dataForSelection(){return feedbackExport(selected(),review.notes);}
$('select-all').onclick=()=>{entries.forEach(entry=>entry.check.checked=entry.ready);saveSelection();};
$('select-none').onclick=()=>{entries.forEach(entry=>entry.check.checked=false);saveSelection();};
$('export-feedback').onclick=()=>{const data=dataForSelection();if(!data.slides.length)return;download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),'labscreen-feedback.json');notify(`Feedback for ${data.slides.length} slides er eksportert. Gi filen til assistenten, eller skriv «feedback klar» i chatten for gjennomgang i nettleseren.`);};
$('export-zip').onclick=async()=>{
  const chosen=selected(),data=structuredClone(dataForSelection());if(!chosen.length||chosen.some(entry=>!entry.ready))return;
  busy=true;refresh();notify('Pakker valgte bilder og feedback …');
  try{const notes=['STARTUPLAB LABSCREENS — LOCAL REVIEW','Review images without a DEMO watermark. This ZIP does not publish to a TV.','',...chosen.map(entry=>`${entry.title}: ${entry.sourceNote}`),'','QR codes link to the supplied sources. A PNG of departures is a dated snapshot, never a live feed.'];
    const files=[{name:'read-me.txt',data:notes.join('\n')},{name:'feedback.json',data:JSON.stringify(data,null,2)},{name:'feedback.md',data:feedbackMarkdown(data)}];
    for(const [index,entry]of chosen.entries()){const blob=await png(entry.canvas);files.push({name:`${String(index+1).padStart(2,'0')}-${entry.item.id}-v${entry.item.revision}.png`,data:new Uint8Array(await blob.arrayBuffer())});}
    download(zipFiles(files),'labscreen-valgte-slides.zip');notify(`${chosen.length} bilder og feedback er samlet i ZIP-filen. Dette er utkast, ikke en publisering.`);
  }catch(error){notify(`Eksport mislyktes: ${error.message}`);}finally{busy=false;refresh();}
};
try{
  rawSeen=localStorage.getItem(REVIEW_KEY);review=decodeReview(rawSeen);
  const stored=decodeStore(localStorage.getItem(STORAGE_KEY))||[];
  const priority=['design-v2-event-novem','member-review-pradeep-ai-product','member-review-pradeep-team-os','member-review-mad-hack-agentic-loops','design-v2-eir-network','member-review-operators-bergen','member-review-news-saro','member-review-departures'];
  const ordered=designSamples(new Date('2026-09-08T12:00:00Z')).map((example,index)=>({example,index})).sort((a,b)=>{const rank=id=>priority.includes(id)?priority.indexOf(id):priority.length;return rank(a.example.id)-rank(b.example.id)||a.index-b.index;});
  for(const {index,example}of ordered){
    const item=structuredClone(stored.find(item=>item.id===example.id)||{...example,revision:0});
    const [id,title,description]=MEMBER_DESCRIPTIONS[example.id]||descriptions[index],article=document.createElement('article');article.id=id;article.className='review-slide';
    const row=document.createElement('div'),label=document.createElement('label'),check=document.createElement('input'),link=document.createElement('a'),copy=document.createElement('p'),canvas=document.createElement('canvas'),noteLabel=document.createElement('label'),textarea=document.createElement('textarea'),state=document.createElement('div'),version=document.createElement('footer');
    row.className='review-heading';label.className='review-select';check.type='checkbox';check.checked=review.selected===null||review.selected.includes(item.id);label.append(check,document.createTextNode(title));
    link.textContent='Rediger i studio';link.className='button';link.href=`studio.html?item=${encodeURIComponent(item.id)}`;copy.textContent=description;canvas.setAttribute('role','img');
    if(item.id==='design-v2-event-novem')copy.textContent+=' DATO MÅ AVKLARES: e-post bekrefter flytting til 17. september; Luma viser fortsatt 10. september. Ikke bruk datoen på dette utkastet før avklaring.';
    if(item.content.type==='transit'){const live=document.createElement('a');live.href='transit.html';live.textContent='Åpne oppdaterte avganger';live.className='button';row.append(live);}
    textarea.id=`feedback-${id}`;textarea.rows=3;textarea.maxLength=5000;textarea.placeholder='For eksempel: større bilde, kortere tittel, flytt QR-koden …';noteLabel.htmlFor=textarea.id;noteLabel.textContent=`Feedback: ${title}`;textarea.value=review.notes[item.id]?.text||'';state.className='note-status';
    const prior=review.notes[item.id];state.textContent=prior&&prior.fingerprint!==fingerprint(item)?'Kommentaren gjelder en tidligere versjon. Oppdater den etter at du har sett denne sliden.':prior?'Kommentar lagret lokalt.':'';
    version.textContent=item.revision?`Viser lagret utkast v${item.revision}. Kommentarer endrer ikke godkjenning eller selve sliden.`:'Viser originalt designeksempel. Åpne studioet for å opprette et redigerbart utkast.';
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Details';details.className='slide-details';details.append(summary,copy);
    row.append(label,link);article.append(row,canvas,noteLabel,textarea,state,details);
    if(item.id==='design-v2-event-novem'){const issue=document.createElement('p');issue.className='factual-issue';issue.textContent='Date to confirm: Luma says 10 September; the latest email says 17 September.';canvas.after(issue);}$('designs').append(article);
    if(item.content.type==='event-speaker'){const motion=document.createElement('a');motion.className='button';motion.href='event-motion.html';motion.textContent='Se bevegelig versjon / last ned video';details.append(motion);}
    const entry={item,title,check,canvas,sourceNote:copy.textContent,ready:false};entries.push(entry);check.onchange=saveSelection;
    textarea.oninput=()=>{review.notes[item.id]={text:textarea.value,fingerprint:fingerprint(item)};state.textContent=persist()?'Kommentar lagret lokalt.':'Kommentaren er ikke lagret. Eksporter for å ta vare på den.';};
    try{await renderSlide(canvas,item.content);entry.ready=true;if(item.id==='design-v2-event-novem')enableReviewVideo(canvas);}catch(error){copy.textContent=error.message;copy.className='error';check.checked=false;check.disabled=true;}
    refresh();
  }

}catch(error){locked=true;notify(`Kunne ikke åpne data: ${error.message} Lagrede data er ikke overskrevet.`);}
window.addEventListener('storage',event=>{if(event.key===REVIEW_KEY){locked=true;notify('Kommentarene er endret i en annen fane. Eksporter lokale kommentarer før du laster på nytt.');}if(event.key===STORAGE_KEY)notify('Et utkast er endret i studioet. Denne siden viser fortsatt versjonen du har kommentert. Last på nytt for siste versjon.');});
window.addEventListener('beforeunload',event=>{if(unsaved){event.preventDefault();event.returnValue='';}});
