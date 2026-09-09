export const REVIEW_KEY='startuplab-labscreen-review-v1';
export function fingerprint(item){
  const content={...item.content};
  // New optional fields must not invalidate comments on unchanged older slides.
  if(!content.agenda)delete content.agenda;
  if(!content.expertise)delete content.expertise;
  if(!content.profiles?.length)delete content.profiles;
  if(!content.milestones?.length)delete content.milestones;
  if(!content.cards?.length)delete content.cards;
  return JSON.stringify({revision:item.revision,content});
}
export function decodeReview(raw){
  if(raw===null)return {version:1,notes:{},selected:null};
  const data=JSON.parse(raw);
  if(data?.version!==1||!data.notes||typeof data.notes!=='object'||Array.isArray(data.notes)||!(data.selected===null||Array.isArray(data.selected)))throw new Error('Ukjent format på lagrede kommentarer.');
  for(const note of Object.values(data.notes))if(typeof note?.text!=='string'||typeof note?.fingerprint!=='string')throw new Error('En lagret kommentar har feil format.');
  return data;
}
export function feedbackExport(entries,notes,now=new Date()){
  const slides=entries.map(({item,title})=>{const note=notes[item.id];return {id:item.id,title,revision:item.revision,content:item.content,feedback:note?.text||'',feedbackMatchesVersion:!note||note.fingerprint===fingerprint(item)};});
  return {format:'startuplab-slide-feedback',version:1,createdAt:now.toISOString(),publication:'draft-only',slides};
}
export function feedbackMarkdown(data){return '# Tilbakemeldinger på labskjermer\n\nUtkast – ingen publisering eller godkjenning.\n\n'+data.slides.map((slide,index)=>`## ${index+1}. ${slide.title}\n\nInnlegg: ${slide.id} · versjon ${slide.revision}\n${slide.feedbackMatchesVersion?'':'\nOBS: Kommentaren er fra en tidligere versjon.\n'}\n${slide.feedback.trim()||'(Ingen kommentar)'}\n`).join('\n');}
