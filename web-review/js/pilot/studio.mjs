import {EIR_PROFILES} from './eir-network.mjs?v=20260909-transit3';
import {TIMELINE_MILESTONES} from './timeline.mjs?v=20260909-transit3';
import {createItem,editItem,requestReview,approveItem,withdrawItem,statusOf,validateContent,IMAGE_PATHS,MEMBER_IMAGE_PATHS} from './model.mjs?v=20260909-transit3';
import {samples,designSamples,TYPES,SCREENS} from './samples.mjs?v=20260909-transit3';
import {renderSlide} from './render.mjs?v=20260909-transit3';
import {STORAGE_KEY,decodeStore,encodeStore} from './storage.mjs?v=20260909-transit3';
import {makeRequest,applyResponse} from './handover.mjs?v=20260909-transit3';

const $=id=>document.getElementById(id), form=$('editor-form');
const labels={draft:'Utkast',review:'Til godkjenning',scheduled:'Planlagt · test',live:'Vises · lokal test',expired:'Utløpt'};
const actions={created:'Utkast opprettet',edited:'Innhold endret','review-requested':'Klar til godkjenning',approved:'Godkjenning simulert',withdrawn:'Testpublisering trukket tilbake'};
let items=[],selected='',imageValue='',profileFields=[],milestoneFields=[],cardFields=[],dirty=false,renderOK=false,renderToken=0,renderPromise,rawSeen=null,locked=false;
const localDate=value=>{const d=new Date(value);return new Date(d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
const current=()=>items.find(i=>i.id===selected);
function notify(message){$('feedback').textContent=message;}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10000);}
function checkStorage(){if(locked)throw new Error('Lagringen er låst. Last siden på nytt før du fortsetter.');if(localStorage.getItem(STORAGE_KEY)!==rawSeen)throw new Error('Innholdet er endret i en annen fane. Last siden på nytt før du lagrer.');}
function persist(next){checkStorage();const raw=encodeStore(next);try{localStorage.setItem(STORAGE_KEY,raw);}catch{throw new Error('Kunne ikke lagre lokalt. Bildene kan være for store eller nettleserlagring er blokkert. Endringen er ikke lagret.');}rawSeen=raw;items=next;}
function replace(item){persist(items.map(i=>i.id===item.id?item:i));}
function contentFromForm(){const data=Object.fromEntries(new FormData(form));data.image=imageValue;data.cards=cardFields.map(fields=>Object.fromEntries(Object.entries(fields).map(([key,field])=>[key,field.value])));data.milestones=milestoneFields.map(fields=>Object.fromEntries(Object.entries(fields).map(([key,field])=>[key,field.value])));data.profiles=profileFields.map(fields=>Object.fromEntries(Object.entries(fields).map(([key,field])=>[key,field.value])));for(const k of ['startsAt','endsAt']){if(data[k]===localDate(current().content[k])){data[k]=current().content[k];continue;}const d=new Date(data[k]);if(!Number.isFinite(+d))throw new Error('Velg både start og slutt for visningen.');data[k]=d.toISOString();}return validateContent(data);}
function updateFields(){const type=$('type').value;$('cards-fields').hidden=!(type==='benefit-roundup'||(type==='event-spotlight'&&cardFields.length));if(type==='benefit-roundup'&&!cardFields.length)editCards(designSamples().find(x=>x.content.type==='benefit-roundup').content.cards);$('timeline-fields').hidden=type!=='timeline';if(type==='timeline'&&!milestoneFields.length)editMilestones(TIMELINE_MILESTONES);$('network-fields').hidden=type!=='eir-network';if(type==='eir-network'&&!profileFields.length)editProfiles(EIR_PROFILES);for(const name of ['eyebrow','body','detail','location','cta','url']){const hidden=(type==='transit'&&['body','detail','location'].includes(name))||['external','external-bleed'].includes(type)||(['alumni','timeline'].includes(type)&&name!=='eyebrow');$(name).hidden=hidden;document.querySelector(`label[for="${name}"]`).hidden=hidden;}$('image-fields').hidden=!['external','external-bleed','event','event-deck','event-speaker','event-spotlight','event-artwork','member-news','eir','welcome'].includes(type);
  $('expertise-fields').hidden=!['eir-network','event-speaker','event-spotlight','event-artwork'].includes(type);$('agenda-fields').hidden=type!=='event-speaker';document.querySelector('label[for="expertise"]').textContent=['event-speaker','event-spotlight','event-artwork'].includes(type)?'Foredragsholder og kort introduksjon':'Kompetanseomr\u00e5der \u00b7 opptil seks linjer';
  const labels=type==='eir'?{title:'Navn',body:'Kan hjelpe med · ett område per linje',detail:'Tidligere roller / erfaring',location:'Et konkret resultat eller erfaringsbevis'}:{title:'Hovedbudskap · maks. 90 tegn',body:'Kort forklaring · maks. 220 tegn',detail:'Tidspunkt eller viktig detalj',location:'Sted / målgruppe'};
  for(const [name,label]of Object.entries(labels))document.querySelector(`label[for="${name}"]`).textContent=label;
  if(type==='eir-network')for(const [name,label]of Object.entries({title:'Overskrift · linje to vises i rødt',detail:'Tilbud · office hours, pitch og introduksjoner',location:'Hvem tilbudet gjelder'}))document.querySelector(`label[for="${name}"]`).textContent=label;
  $('image-help').textContent=type==='external-bleed'?'Full bleed fyller hele skjermen og beskjærer topp/bunn eller sider. Velg vanlig ekstern plakat for å beholde hele bildet.':'PNG, JPG eller WebP. Maks. 8 MB. Hele bildet beholdes i portrett- og plakatmalene.';
  if(type==='eir')$('image-help').textContent='Portrettet vises med avrundede hjørner. Velg et bilde med ansiktet sentrert. PNG, JPG eller WebP, maks. 8 MB.';
  $('url-help').textContent=['event-deck','event-speaker','event-spotlight','event-artwork','member-news','benefit-roundup','eir-network','eir','transit'].includes(type)?'Lenke · blir en skannbar QR-kode':'Lenke · valgfritt, vises som tekst';
}
function markDirty(value){dirty=value;$('dirty').textContent=value?'Du har ulagrede endringer. Lagre før godkjenning og eksport.':'Alle endringer er lagret lokalt.';updateWorkflow();}
function updateWorkflow(){
  if(!current())return;
  const item=current(),status=statusOf(item);$('status').textContent=`${labels[status]} · v${item.revision}`;
  $('review').hidden=status!=='draft';$('approve').hidden=status!=='review';$('withdraw').hidden=!item.approved&&status!=='review';
  for(const id of ['review','approve','png','request-export'])$(id).disabled=dirty||!renderOK||locked;
  $('patch-apply').disabled=dirty||locked;$('withdraw').disabled=dirty||locked;$('discard').disabled=!dirty||locked;$('save').disabled=!dirty||!renderOK||locked;
  const info={draft:['Gjør utkastet klart.','Lagre endringene og send den ferdige versjonen til lokal testgodkjenning.'],review:['Slik ser Nissik utkastet.','Testknappen simulerer godkjenning av akkurat denne versjonen. Ingen melding sendes til Nissik.'],scheduled:['Klart for senere visning.','Den godkjente versjonen dukker opp i testspilleren når perioden starter.'],live:['Innholdet er aktivt i testspilleren.','Åpne testskjermen i samme nettleser og velg riktig skjerm. Ingen fysisk TV er bekreftet tilkoblet.'],expired:['Visningsperioden er over.','Innlegget er fjernet fra lokal avspilling. Endre perioden for å lage et nytt utkast.']};
  $('workflow-title').textContent=info[status][0];$('workflow-description').textContent=info[status][1];
  if(item.approved&&item.approved.revision!==item.revision)$('workflow-description').textContent+=` Godkjent v${item.approved.revision} beholdes i sin opprinnelige periode. Det nye utkastet vises ikke før ny godkjenning.`;
}
async function preview(content){
  const token=++renderToken;renderOK=false;updateWorkflow();
  renderPromise=(async()=>{try{const buffer=document.createElement('canvas');await renderSlide(buffer,content);if(token!==renderToken)return;$('preview').getContext('2d').drawImage(buffer,0,0);$('preview').setAttribute('aria-label',buffer.getAttribute('aria-label'));$('render-error').hidden=true;renderOK=true;}catch(e){if(token!==renderToken)return;$('render-error').textContent=e.message;$('render-error').hidden=false;renderOK=false;}finally{if(token===renderToken)updateWorkflow();}})();
  await renderPromise;
}
function renderList(){
  $('items').replaceChildren();items.forEach((item,index)=>{
    const button=document.createElement('button');button.className='item';button.setAttribute('aria-current',String(item.id===selected));
    const num=document.createElement('span');num.className='item-num';num.textContent=String(index+1).padStart(2,'0');
    const name=document.createElement('span');name.className='item-name';name.textContent=item.content.title.replace(/\n/g,' ');
    const state=document.createElement('span');state.className='item-state';state.textContent=`${TYPES[item.content.type]} · v${item.revision}`;name.append(state);button.append(num,name);
    button.onclick=()=>{if(dirty){notify('Lagre endringene før du bytter innlegg.');return;}select(item.id);};$('items').append(button);
  });
}
function editProfiles(profiles){
  profileFields=[];$('profile-fields').replaceChildren();
  profiles.forEach((profile,index)=>{
    const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=`Profil ${index+1}`;group.append(legend);const fields={};
    for(const [key,label]of [['name','Navn'],['bio','Erfaring'],['image','Portrett']]){
      const caption=document.createElement('label'),field=document.createElement(key==='image'?'select':key==='bio'?'textarea':'input');field.id=`profile-${index}-${key}`;caption.htmlFor=field.id;caption.textContent=label;
      if(key==='image')for(const person of [...EIR_PROFILES,{name:'Pradeep Sankaran',image:'assets/eir/pradeep-sankaran.jpg'}])field.add(new Option(person.name,person.image));
      else field.maxLength=key==='name'?48:140;
      field.value=profile[key];fields[key]=field;group.append(caption,field);
    }
    profileFields.push(fields);$('profile-fields').append(group);
  });
}
function editMilestones(milestones){
  milestoneFields=[];$('milestone-fields').replaceChildren();
  milestones.forEach((milestone,index)=>{
    const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=`Milepæl ${index+1}`;group.append(legend);const fields={};
    for(const [key,label,max]of [['year','År',8],['title','Overskrift',48],['detail','Beskrivelse',150]]){
      const caption=document.createElement('label'),field=document.createElement(key==='detail'?'textarea':'input');field.id=`milestone-${index}-${key}`;caption.htmlFor=field.id;caption.textContent=label;field.maxLength=max;field.value=milestone[key];fields[key]=field;group.append(caption,field);
    }
    milestoneFields.push(fields);$('milestone-fields').append(group);
  });
}
function editCards(cards){
  cardFields=[];$('card-fields').replaceChildren();
  cards.forEach((card,index)=>{
    const group=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=`Innhold ${index+1}`;group.append(legend);const fields={};
    for(const [key,label,max]of [['heading','Overskrift',36],['detail','Beskrivelse',135],['note','Vilkår / kilde',90]]){
      const caption=document.createElement('label'),field=document.createElement(key==='heading'?'input':'textarea');field.id=`card-${index}-${key}`;caption.htmlFor=field.id;caption.textContent=label;field.maxLength=max;field.value=card[key];fields[key]=field;group.append(caption,field);
    }
    cardFields.push(fields);$('card-fields').append(group);
  });
}
function select(id){
  selected=id;const item=current();if(!item)return;
  for(const field of form.elements){if(!field.name)continue;field.value=['startsAt','endsAt'].includes(field.name)?localDate(item.content[field.name]):(item.content[field.name]??'');}
  editProfiles(item.content.profiles||[]);
  editMilestones(item.content.milestones||[]);
  editCards(item.content.cards||[]);
  imageValue=item.content.image;$('library-image').value=[...IMAGE_PATHS,...MEMBER_IMAGE_PATHS].includes(imageValue)?imageValue:'';$('image').value='';$('patch').value='';$('prompt').value='';$('item-title').textContent=item.content.title.replace(/\n/g,' ');$('template-label').textContent=TYPES[item.content.type].toUpperCase();
  updateFields();$('remove-image').hidden=!imageValue;
  $('history').replaceChildren();item.history.slice().reverse().forEach(entry=>{const li=document.createElement('li');li.textContent=`v${entry.revision} · ${actions[entry.action]||entry.action} · ${new Date(entry.at).toLocaleString('nb-NO')}`;$('history').append(li);});
  markDirty(false);renderList();preview(item.content);
}
form.addEventListener('input',()=>{markDirty(true);try{preview(contentFromForm());}catch(e){renderToken++;renderOK=false;$('render-error').textContent=e.message;$('render-error').hidden=false;updateWorkflow();}});
async function checkCandidate(item,base){await renderSlide(document.createElement('canvas'),item.content);if(selected!==base.id||current().revision!==base.revision)throw new Error('Utkastet ble endret mens bildet ble tegnet. Prøv igjen.');}
form.addEventListener('submit',async event=>{event.preventDefault();try{checkStorage();const base=current(),item=editItem(base,contentFromForm());await checkCandidate(item,base);if(JSON.stringify(contentFromForm())!==JSON.stringify(item.content))throw new Error('Du endret innholdet under lagringen. Trykk Lagre igjen.');replace(item);select(item.id);notify(`Versjon ${item.revision} er lagret lokalt.`);}catch(e){notify(e.message);}});
$('type').addEventListener('change',()=>{updateFields();markDirty(true);try{preview(contentFromForm());}catch(e){renderToken++;renderOK=false;$('render-error').textContent=e.message;$('render-error').hidden=false;updateWorkflow();}});
$('discard').onclick=()=>{select(selected);notify('Ulagrede endringer er forkastet.');};
async function transition(action){try{const base=current();if(dirty)throw new Error('Lagre utkastet først.');await renderPromise;if(dirty||selected!==base.id||current().revision!==base.revision)throw new Error('Utkastet ble endret. Se gjennom det og prøv igjen.');if(!renderOK)throw new Error('Forhåndsvisningen må være gyldig først.');checkStorage();const item=action(base);replace(item);select(item.id);notify('Lokal teststatus oppdatert.');}catch(e){notify(e.message);}}
$('review').onclick=()=>transition(item=>requestReview(item));
$('approve').onclick=()=>transition(item=>approveItem(item,item.revision));
$('withdraw').onclick=()=>{try{if(dirty)throw new Error('Lagre eller forkast endringene før du trekker tilbake publiseringen.');const item=withdrawItem(current());replace(item);select(item.id);notify('Innholdet er trukket tilbake fra testspilleren.');}catch(e){notify(e.message);}};
$('duplicate').onclick=()=>{try{if(dirty)throw new Error('Lagre utkastet før du lager en kopi.');const item=createItem(current().content,{id:crypto.randomUUID()});if(items.length>=100)throw new Error('Piloten støtter opptil 100 innlegg.');persist([...items,item]);select(item.id);notify('Ny kopi opprettet som utkast.');}catch(e){notify(e.message);}};
$('backup').onclick=()=>download(new Blob([encodeStore(items)],{type:'application/json'}),'labscreen-local-backup.json');
$('png').onclick=async()=>{await renderPromise;if(!renderOK||dirty)return;const item=current();$('preview').toBlob(blob=>{if(blob)download(blob,`labscreen-demo-${item.content.type}-v${item.revision}.png`);else notify('PNG-eksport mislyktes.');},'image/png');};
$('request-export').onclick=()=>{try{checkStorage();const request=makeRequest(current(),$('prompt').value);download(new Blob([request],{type:'text/plain;charset=utf-8'}),`cowork-${current().id}-v${current().revision}.txt`);notify('Forespørsel lastet ned. Legg den i Cowork, og lim inn JSON-svaret her.');}catch(e){notify(e.message);}};
$('patch-apply').onclick=async()=>{try{if(dirty)throw new Error('Lagre utkastet før du bruker svaret.');checkStorage();const base=current(),item=applyResponse(base,$('patch').value);await checkCandidate(item,base);if(dirty)throw new Error('Du endret utkastet mens svaret ble behandlet. Lagre endringene først.');replace(item);select(item.id);notify(`Svaret er lagret som v${item.revision}.`);}catch(e){notify(e.message);}};
$('image').addEventListener('change',async()=>{
  const file=$('image').files[0],id=selected;if(!file)return;
  try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('Velg PNG, JPG eller WebP under 8 MB.');
    const bitmap=await createImageBitmap(file);const scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const data=canvas.toDataURL('image/webp',.9);if(id!==selected)return;imageValue=data;$('remove-image').hidden=false;markDirty(true);await preview(contentFromForm());
  }catch(e){notify(e.message);}
});
$('library-image').addEventListener('change',async()=>{const value=$('library-image').value;if(!value)return;imageValue=value;$('image').value='';$('remove-image').hidden=false;markDirty(true);try{await preview(contentFromForm());}catch(e){notify(e.message);}});
for(const path of [...new Set([...IMAGE_PATHS,...MEMBER_IMAGE_PATHS])])$('library-image').add(new Option(path.split('/').pop().replace(/\.[^.]+$/,'').replaceAll('-',' '),path));
$('remove-image').onclick=()=>{imageValue='';$('library-image').value='';$('image').value='';$('remove-image').hidden=true;markDirty(true);try{preview(contentFromForm());}catch(e){renderOK=false;notify(e.message);$('render-error').textContent=e.message;$('render-error').hidden=false;updateWorkflow();}};
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
window.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY)return;locked=true;updateWorkflow();notify('Innholdet ble endret i en annen fane. Last siden på nytt før du lagrer.');});
for(const [id,options] of [['type',TYPES],['screen',SCREENS]])for(const [value,label]of Object.entries(options)){$(id).add(new Option(label,value));}
$('timezone').textContent=`Tidssone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}. Perioden styrer avspilling, ikke teksten om arrangementet.`;
setInterval(updateWorkflow,1000);
try{rawSeen=localStorage.getItem(STORAGE_KEY);items=decodeStore(rawSeen)||[];if(rawSeen===null)persist(samples().map((content,index)=>createItem(content,{id:`sample-${index+1}`})));const additions=designSamples().filter(example=>!items.some(item=>item.id===example.id)).map(example=>createItem(example.content,{id:example.id}));if(additions.length)persist([...items,...additions]);if(!items.length)throw new Error('Ingen lokale innlegg finnes.');const requested=new URLSearchParams(window.location?.search||'').get('item');select(items.some(i=>i.id===requested)?requested:items[0].id);}catch(e){locked=true;notify(`Kunne ikke åpne lagrede data: ${e.message} Eksisterende data er ikke overskrevet.`);for(const el of document.querySelectorAll('button,input,textarea,select'))el.disabled=true;}
