import {EIR_PROFILES} from './eir-network.mjs?v=20260909-transit3';
/** Pure local-pilot model. Approval is a simulation, with no identity authority. */
export const CONTENT_FIELDS = Object.freeze(['type', 'eyebrow', 'title', 'body', 'detail', 'location', 'cta', 'url', 'image', 'screen', 'startsAt', 'endsAt', 'expertise', 'agenda', 'profiles', 'milestones', 'cards']);
export const CONTENT_LIMITS = Object.freeze({ eyebrow: 60, expertise: 220, agenda: 120, title: 90, body: 220, detail: 80, location: 70, cta: 60, url: 300 });
export const TYPES = Object.freeze(['event', 'welcome', 'benefit', 'request', 'notice', 'external', 'event-deck', 'event-speaker', 'eir', 'external-bleed', 'eir-network', 'alumni', 'timeline', 'benefit-roundup', 'member-news', 'event-spotlight', 'event-artwork', 'transit']);
export const SCREENS = Object.freeze(['home', 'oslo', 'bergen']);
export const IMAGE_PATHS = Object.freeze([...EIR_PROFILES.map(profile=>profile.image), 'assets/photos/aimadlab-cover.png', 'assets/photos/event-fintech.jpg', 'assets/photos/event-fintech-2.jpg', 'assets/photos/windturbines.png', 'assets/photos/winecoding-hero.jpg', 'assets/photos/workshop.jpg', 'assets/photos/sondov-engen.jpg', 'assets/eir/christian-saeterhaug.jpg', 'assets/eir/pradeep-sankaran.jpg', 'assets/eir/hege-nikolaisen.jpg']);
export const MEMBER_IMAGE_PATHS=Object.freeze(['assets/photos/pradeep-sankaran-linkedin.png','assets/photos/news-saro.jpg','assets/photos/ai-mad-lab-agentic-loops-cover.png','assets/photos/ai-mad-lab-logo.png','assets/photos/aurora-operators-session-bergen-luma.png','assets/photos/aurora-klaeboe-berg.png']);
export const MAX_IMAGE_LENGTH = 2_500_000;

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new Error(`${label} må være et objekt.`);
}

function allowedFields(value) {
  object(value, 'Innhold');
  for (const field of Object.keys(value)) if (!CONTENT_FIELDS.includes(field)) throw new Error(`Ukjent innholdsfelt: ${field}.`);
}

function instant(value, label) {
  // Date.parse alone silently accepts dates such as 30 February and local times.
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw new Error(`${label} må være et ISO-tidspunkt med tidssone.`);
  const [, year, month, day, hour, minute, second = '0', , zone] = match;
  const days = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  const badZone = zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59);
  if (+month < 1 || +month > 12 || +day < 1 || +day > days || +hour > 23 || +minute > 59 || +second > 59 || badZone || !Number.isFinite(Date.parse(value))) throw new Error(`${label} er ikke et gyldig tidspunkt.`);
  return new Date(value).toISOString();
}

function clock(now = new Date()) {
  if (now instanceof Date || typeof now === 'number') {
    const date = new Date(now);
    if (!Number.isFinite(date.getTime())) throw new Error('Klokken er ugyldig.');
    return date.toISOString();
  }
  return instant(now, 'Klokken');
}

/** Returns a fresh normalized content object; throws a readable error on invalid input. */
export function validateContent(content) {
  allowedFields(content);
  const result = {};
  for (const field of CONTENT_FIELDS) {
    if(['profiles','milestones','cards'].includes(field)) continue;
    const value = content[field] === undefined ? '' : content[field];
    if (typeof value !== 'string') throw new Error(`${field} må være tekst.`);
    result[field] = value.trim();
    if (CONTENT_LIMITS[field] && [...result[field]].length > CONTENT_LIMITS[field]) throw new Error(`${field} kan ha maksimalt ${CONTENT_LIMITS[field]} tegn.`);
  }
  const cards=content.cards??[];
  if(!Array.isArray(cards)||cards.length>3)throw new Error('Bruk opptil tre medlemsfordeler.');
  result.cards=cards.map(card=>{
    object(card,'Medlemsfordel');
    if(Object.keys(card).some(key=>!['heading','detail','note'].includes(key)))throw new Error('Ukjent felt i medlemsfordel.');
    const result={};
    for(const [key,max]of [['heading',36],['detail',135],['note',90]]){
      if(typeof card[key]!=='string'||!card[key].trim()||[...card[key]].length>max)throw new Error(`Medlemsfordel ${key}: bruk 1–${max} tegn.`);
      result[key]=card[key].trim();
    }
    return result;
  });
  if(result.type==='benefit-roundup'&&cards.length!==3)throw new Error('Denne malen trenger tre medlemsfordeler.');
  const profiles=content.profiles ?? [];
  if(!Array.isArray(profiles) || profiles.length>8) throw new Error('Bruk opptil åtte EIR-profiler.');
  result.profiles=profiles.map(profile=>{
    object(profile,'EIR-profil');
    if(Object.keys(profile).some(key=>!['name','bio','image'].includes(key))) throw new Error('Ukjent felt i EIR-profil.');
    for(const [key,max]of [['name',48],['bio',140]]) if(typeof profile[key]!=='string'||!profile[key].trim()||[...profile[key]].length>max) throw new Error(`EIR ${key}: bruk 1–${max} tegn.`);
    if(!IMAGE_PATHS.includes(profile.image)||!profile.image.startsWith('assets/eir/')) throw new Error('Velg et medfølgende EIR-portrett.');
    return {name:profile.name.trim(),bio:profile.bio.trim(),image:profile.image};
  });
  if(result.type==='eir-network' && result.profiles.length!==8) throw new Error('Nettverksmalen trenger åtte profiler.');
  if(result.type==='eir-network' && result.expertise.split('\n').filter(Boolean).length>6) throw new Error('Bruk opptil seks kompetanseområder.');
  const milestones=content.milestones ?? [];
  if(!Array.isArray(milestones)||milestones.length>6)throw new Error('Bruk opptil seks milepæler.');
  result.milestones=milestones.map(milestone=>{
    object(milestone,'Milepæl');
    if(Object.keys(milestone).some(key=>!['year','title','detail'].includes(key)))throw new Error('Ukjent felt i milepæl.');
    for(const [key,max]of [['year',8],['title',48],['detail',150]])if(typeof milestone[key]!=='string'||!milestone[key].trim()||[...milestone[key]].length>max)throw new Error(`Milepæl ${key}: bruk 1–${max} tegn.`);
    return {year:milestone.year.trim(),title:milestone.title.trim(),detail:milestone.detail.trim()};
  });
  if(result.type==='timeline'&&result.milestones.length!==6)throw new Error('Tidslinjen trenger seks milepæler.');
  if (!TYPES.includes(result.type)) throw new Error('Velg en gyldig maltype.');
  if (!result.title) throw new Error('Tittel er påkrevd.');
  if (!SCREENS.includes(result.screen)) throw new Error('Velg en gyldig skjerm.');
  result.startsAt = instant(result.startsAt, 'Starttid');
  result.endsAt = instant(result.endsAt, 'Sluttid');
  if (Date.parse(result.endsAt) <= Date.parse(result.startsAt)) throw new Error('Sluttid må være etter starttid.');
  if (result.url) {
    let parsed;
    try { parsed = new URL(result.url); } catch { throw new Error('Lenken må være en fullstendig HTTPS-adresse.'); }
    if (!/^https:\/\//i.test(result.url) || parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password || /\s/.test(result.url)) throw new Error('Lenken må være en HTTPS-adresse uten brukerinformasjon.');
  }
  if (result.image && !IMAGE_PATHS.includes(result.image) && !MEMBER_IMAGE_PATHS.includes(result.image)) {
    if (result.image.length > MAX_IMAGE_LENGTH) throw new Error('Bildet er for stort for lokal lagring.');
    if (!/^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(result.image) || result.image.endsWith(',')) throw new Error('Bruk et medfølgende bilde eller et PNG-, JPEG- eller WebP-bilde.');
  }
  if (['external','external-bleed','eir','event-speaker','event-spotlight','event-artwork','member-news'].includes(result.type) && !result.image) throw new Error('Denne malen krever et bilde.');
  return result;
}

function copyItem(item) {
  object(item, 'Innlegg');
  if (typeof item.id !== 'string' || !item.id.trim() || !Number.isSafeInteger(item.revision) || item.revision < 1 || !Array.isArray(item.history)) throw new Error('Innlegget har ugyldig ID, revisjon eller historikk.');
  if (item.reviewRevision !== null && item.reviewRevision !== item.revision) throw new Error('Innlegget har en ugyldig gjennomgangsrevisjon.');
  const copy = structuredClone(item);
  copy.content = validateContent(copy.content);
  if (copy.approved !== null) {
    object(copy.approved, 'Godkjenning');
    if (!Number.isSafeInteger(copy.approved.revision) || copy.approved.revision < 1 || copy.approved.revision > copy.revision) throw new Error('Innlegget har en ugyldig godkjent revisjon.');
    copy.approved.content = validateContent(copy.approved.content);
    copy.approved.approvedAt = instant(copy.approved.approvedAt, 'Godkjenningstid');
  }
  return copy;
}

function record(item, action, at) {
  item.history.push({ action, revision: item.revision, at });
  return item;
}

export function createItem(content, { id, now } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new Error('Innlegget trenger en ID.');
  return record({ id: id.trim(), revision: 1, content: validateContent(content), reviewRevision: null, approved: null, history: [] }, 'created', clock(now));
}

export function editItem(item, patch, now) {
  allowedFields(patch);
  const copy = copyItem(item);
  const at = clock(now);
  const candidate = validateContent({ ...copy.content, ...patch });
  if (CONTENT_FIELDS.every(field => JSON.stringify(candidate[field]) === JSON.stringify(copy.content[field]))) return copy;
  if (copy.revision === Number.MAX_SAFE_INTEGER) throw new Error('Revisjonsgrensen er nådd.');
  copy.content = candidate;
  copy.revision += 1;
  copy.reviewRevision = null;
  return record(copy, 'edited', at);
}

export function requestReview(item, now) {
  const copy = copyItem(item);
  const at = clock(now);
  if (copy.reviewRevision === copy.revision) throw new Error('Denne revisjonen venter allerede på gjennomgang.');
  if (copy.approved?.revision === copy.revision) throw new Error('Denne revisjonen er allerede godkjent.');
  copy.reviewRevision = copy.revision;
  return record(copy, 'review-requested', at);
}

export function approveItem(item, expectedRevision, now) {
  const copy = copyItem(item);
  const at = clock(now);
  if (expectedRevision !== copy.revision || copy.reviewRevision !== copy.revision) throw new Error('Godkjenning krever gjeldende revisjon sendt til gjennomgang.');
  copy.approved = { revision: copy.revision, content: structuredClone(copy.content), approvedAt: at };
  copy.reviewRevision = null;
  return record(copy, 'approved', at);
}

export function withdrawItem(item, now) {
  const copy = copyItem(item);
  const at = clock(now);
  if (!copy.approved && copy.reviewRevision === null) return copy;
  copy.approved = null;
  copy.reviewRevision = null;
  return record(copy, 'withdrawn', at);
}

/** Playback projections expose only approved content/revision in their top-level fields. */
export function activeItems(items, screen, now) {
  if (!Array.isArray(items)) throw new Error('Innleggslisten er ugyldig.');
  if (!SCREENS.includes(screen)) throw new Error('Velg en gyldig skjerm.');
  const timestamp = Date.parse(clock(now));
  return items.map(copyItem).filter(item => {
    const content = item.approved?.content;
    return content && content.screen === screen && Date.parse(content.startsAt) <= timestamp && timestamp < Date.parse(content.endsAt);
  }).map(item => ({ ...item, content: structuredClone(item.approved.content), revision: item.approved.revision, reviewRevision: null }));
}

/** Authoring status describes the current revision; an older approval can still play. */
export function statusOf(item, now) {
  const copy = copyItem(item);
  const timestamp = Date.parse(clock(now));
  if (copy.reviewRevision === copy.revision) return 'review';
  if (copy.approved?.revision !== copy.revision) return 'draft';
  if (timestamp < Date.parse(copy.approved.content.startsAt)) return 'scheduled';
  if (timestamp >= Date.parse(copy.approved.content.endsAt)) return 'expired';
  return 'live';
}
