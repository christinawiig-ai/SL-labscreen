import {EIR_NETWORK} from './eir-network.mjs?v=20260909-transit3';
import {TIMELINE_MILESTONES} from './timeline.mjs?v=20260909-transit3';
import {memberSamples} from './member-content.mjs?v=20260909-transit3';
export const TYPES = {
  event: 'Event og office hours', welcome: 'Velkomst og EIR', benefit: 'Medlemsfordel',
  request: 'Medlemmer hjelper medlemmer', notice: 'Praktisk beskjed', external: 'Ekstern plakat',
  'eir-network':'EIR · nettverk + Notion-QR', alumni:'Alumni · logovegg', timeline:'Historie · tidslinje og bilder', 'event-speaker':'Event · foredragsholder + QR', 'event-deck':'Event · standarddeck + QR', eir:'EIR · portrett og erfaring', 'external-bleed':'Ekstern illustrasjon · full bleed', 'event-spotlight':'Event · foredragsholder og originalgrafikk', 'event-artwork':'Event · AI Mad Lab', 'benefit-roundup':'Tre medlemsfordeler', 'member-news':'Medlemmer i nyhetene', transit:'Kollektivavganger · Entur'
};
export const SCREENS = {home: 'Samsung hjemme · test', oslo: 'Oslo · test', bergen: 'Bergen · test'};
export function samples(now = new Date()) {
  const base = {eyebrow:'', title:'', body:'', detail:'', location:'', cta:'', url:'', image:'', screen:'home',
    startsAt:new Date(+now - 60000).toISOString(), endsAt:new Date(+now + 3*3600000).toISOString()};
  return [
    {type:'event', eyebrow:'OFFICE HOURS', title:'Your next step.\nA fresh perspective.', body:'Bring a question. Leave with a clearer plan. A template for expert advice, workshops and community events.', detail:'Demo session · 13:00–15:00', location:'Startuplab · Oslo', cta:'Add your booking link'},
    {type:'welcome', eyebrow:'WELCOME TO THE LAB', title:'Good to\nhave you here.', body:'Meet the people building what comes next.', detail:'Guest visit · example', location:'Startuplab', cta:'Say hello to the team'},
    {type:'benefit', eyebrow:'MAKE MORE OF YOUR MEMBERSHIP', title:'Useful help.\nCloser than you think.', body:'A place to highlight member resources: expert advice, practical templates and tools for your next stage.', detail:'One benefit. One clear next step.', location:'Member resources', cta:'Ask the Startuplab team'},
    {type:'request', eyebrow:'MEMBERS HELPING MEMBERS', title:'A fresh pair\nof eyes?', body:'Use this space to find test users, exchange experience or ask for an introduction.', detail:'Example request · 20-minute feedback', location:'Open to fellow builders', cta:'Add a contact or Slack link'},
    {type:'notice', eyebrow:'TODAY AT THE LAB', title:'Take a break.\nMeet a neighbour.', body:'A simple notice for shared lunches, practical updates and small moments that bring us together.', detail:'Example lunch · 11:30', location:'Shared kitchen', cta:'Come as you are'},
    {type:'external', eyebrow:'HOSTED AT STARTUPLAB', title:'AI Mad Lab', body:'', detail:'Existing artwork · layout example', location:'External organiser', cta:'', image:'assets/photos/aimadlab-cover.png'}
  ].map(content => ({...base,...content}));
}

// Copy and portraits: EIR-oversikt/src/roster.html, read 8 September 2026.
// These are editable introductions, not claims of current availability.
export function designSamples(now = new Date()) {
  const base={eyebrow:'',title:'',body:'',detail:'',location:'',cta:'',url:'',image:'',screen:'home',startsAt:new Date(+now-60000).toISOString(),endsAt:new Date(+now+3*3600000).toISOString()};
  return [
    ['deck-event',{type:'event-deck',eyebrow:'STARTUPLAB EVENTS',title:'GOOD QUESTIONS.\nNEW PERSPECTIVES.',body:'Meet fellow founders. Compare notes. Find your next conversation.',detail:'Example event · 13:00–15:00',location:'Startuplab · Oslo',cta:'Scan for the event calendar',url:'https://www.startuplab.no/events',image:'assets/photos/workshop.jpg'}],
    ['deck-eye',{type:'external-bleed',title:'AI Mad Lab',image:'assets/photos/aimadlab-cover.png'}],
    ['eir-christian',{type:'eir',eyebrow:'ENTREPRENEUR IN RESIDENCE',title:'Christian Sæterhaug',body:'B2B sales\nSales funnels & structure\nProduct–market fit',detail:'Former VP New Markets, Gelato',location:'Built Gelato’s first US office in Boston.',cta:'',url:'https://www.linkedin.com/in/christian-s%C3%A6terhaug-5020472/',image:'assets/eir/christian-saeterhaug.jpg'}],
    ['eir-pradeep',{type:'eir',eyebrow:'EXECUTIVE IN RESIDENCE',title:'Pradeep Sankaran',body:'AI-first product strategy\nPricing & commercialisation\nB2B SaaS',detail:'Former SVP Product, Gelato · 19 years in product',location:'AI product: zero to multi-million ARR in under 6 months.',cta:'Connect on LinkedIn',url:'https://www.linkedin.com/in/pradeep-sankaran/',image:'assets/photos/pradeep-sankaran-linkedin.png'}],
    ['eir-hege',{type:'eir',eyebrow:'EXECUTIVE IN RESIDENCE',title:'Hege Nikolaisen',body:'Positioning & storytelling\nPR in the US & Europe\nInvestor communications',detail:'Communications & scaling · 1X and Ayfie',location:'Led the rebrand from Halodi Robotics to 1X.',cta:'Connect on LinkedIn',url:'https://www.linkedin.com/in/hegenikolaisen/',image:'assets/eir/hege-nikolaisen.jpg'}]
    ,['eir-network',EIR_NETWORK]
    ,['alumni',{type:'alumni',eyebrow:'550+ ALUMNI COMPANIES',title:'You know them. They started here.'}]
    ,['timeline',{type:'timeline',eyebrow:'SINCE 2012',title:'Fourteen years of founders first.',milestones:TIMELINE_MILESTONES}]
    ,['event-novem',{type:'event-speaker',eyebrow:'AI X · VIBECODING',title:'What your agent\nis actually doing.',body:'Your AI agent moves fast. Sometimes in the wrong direction. Learn what happens under the hood, when to step in, and how to keep things moving.\nNo coding background needed.',expertise:'Sondov Engen \u00b7 Co-founder & CEO, novem.io\nFormer NBIM portfolio manager.\nDeep in the code. Ridiculously good at explaining it.',agenda:'08:30 breakfast \u00b7 09:00 talk\n09:30 conversations',detail:'Thu 10 Sep \u00b7 08:30\u201310:00',location:'Startuplab Oslo',cta:'Save your spot',url:'https://luma.com/qgfee44a?tk=neBqXp',image:'assets/photos/sondov-engen.jpg',startsAt:'2026-09-08T00:00:00+02:00',endsAt:'2026-09-10T10:00:00+02:00'}]
  ].map(([id,content])=>({id:`design-v2-${id}`,content:{...base,...content}})).concat(memberSamples(now));
}
