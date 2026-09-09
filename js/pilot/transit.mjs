// Entur Journey Planner v3. Stop identities verified against Entur 2026-09-09.
export const TRANSIT_ENDPOINT='https://api.entur.io/journey-planner/v3/graphql';
export const TRANSIT_CLIENT='startuplab-labscreen';
export const MAX_AGE_MS=180_000;
export const STOPS=Object.freeze([
  {key:'metro',id:'NSR:StopPlace:59600',name:'Forskningsparken',mode:'metro',label:'T-bane'},
  {key:'tram',id:'NSR:StopPlace:59600',name:'Forskningsparken',mode:'tram',label:'Trikk'},
  {key:'bus',id:'NSR:StopPlace:59519',name:'Gaustad',mode:'bus',label:'Buss'},
]);
export const STOP_URL='https://entur.no/nearby-stop-place-detail?id=NSR:StopPlace:59600';
export const TRANSIT_QUERY=`query Departures($start: DateTime!) {
  ${STOPS.map(stop=>`${stop.key}: stopPlace(id: "${stop.id}") {
    id name estimatedCalls(startTime: $start, timeRange: 7200, numberOfDepartures: 60) {
      realtime cancellation aimedDepartureTime expectedDepartureTime
      destinationDisplay { frontText }
      quay { id name publicCode }
      serviceJourney { id journeyPattern { line { publicCode transportMode } } }
    }
  }`).join('\n')}
}`;
const epoch=value=>typeof value==='string'?Date.parse(value):NaN;
export function osloClock(value) {
  const time=typeof value==='number'?value:epoch(value);
  return Number.isFinite(time)?new Intl.DateTimeFormat('nb-NO',{timeZone:'Europe/Oslo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(time):'—';
}
export function osloStamp(value) {
  const time=typeof value==='number'?value:epoch(value);
  return Number.isFinite(time)?new Intl.DateTimeFormat('nb-NO',{timeZone:'Europe/Oslo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(time):'ukjent tidspunkt';
}
export function normalizeTransit(response,{fetchedAt=new Date().toISOString(),queryTime=fetchedAt,kind='live'}={}) {
  if(response?.errors?.length)throw new Error('Entur svarte med en feil.');
  if(!Number.isFinite(epoch(fetchedAt))||!Number.isFinite(epoch(queryTime)))throw new Error('Ugyldig hentetidspunkt.');
  const sections=STOPS.map(stop=>{
    const source=response?.data?.[stop.key];
    if(source?.id!==stop.id||!Array.isArray(source.estimatedCalls))throw new Error(`Mangler avganger fra ${stop.name}.`);
    const seen=new Set();
    const departures=source.estimatedCalls.flatMap(call=>{
      const line=call.serviceJourney?.journeyPattern?.line;
      if(line?.transportMode!==stop.mode)return [];
      const aimed=call.aimedDepartureTime,expected=call.expectedDepartureTime;
      const realtime=call.realtime===true&&Number.isFinite(epoch(expected));
      const departureTime=realtime?expected:aimed;
      if(!Number.isFinite(epoch(departureTime)))return [];
      const id=[call.serviceJourney?.id,call.quay?.id,aimed].join('|');
      if(seen.has(id))return [];seen.add(id);
      return [{id,line:String(line.publicCode||'—'),destination:call.destinationDisplay?.frontText||'Ukjent destinasjon',
        quay:call.quay?.publicCode||'',quayId:call.quay?.id||'',departureTime,aimedDepartureTime:aimed,
        realtime,cancelled:call.cancellation===true}];
    }).sort((a,b)=>epoch(a.departureTime)-epoch(b.departureTime));
    return {...stop,departures};
  });
  return {version:1,source:'Entur',kind:kind==='snapshot'?'snapshot':'live',fetchedAt,queryTime,sections};
}
export function isFresh(snapshot,now=Date.now()) {
  const age=now-epoch(snapshot?.fetchedAt);
  // Clock skew beyond 30 seconds must not turn old data into indefinitely fresh data.
  return Number.isFinite(age)&&age>=-30_000&&age<=MAX_AGE_MS;
}
export function departureLabel(departure,{snapshot=false,now=Date.now()}={}) {
  if(departure.cancelled)return 'Innstilt';
  if(snapshot||!departure.realtime)return osloClock(departure.departureTime);
  const remaining=epoch(departure.departureTime)-now;
  if(!Number.isFinite(remaining)||remaining<0)return '—';
  return remaining<60_000?'Nå':remaining<600_000?`${Math.ceil(remaining/60_000)} min`:osloClock(departure.departureTime);
}
export function transitView(snapshot,{now=Date.now(),limit=5}={}) {
  const archived=snapshot?.kind==='snapshot';
  const fresh=isFresh(snapshot,now);
  // Archived examples use their explicit query clock, never the viewer's live clock.
  const reference=archived?epoch(snapshot?.queryTime):now;
  const valid=archived?Number.isFinite(reference):fresh;
  return {archived,fresh,valid,reference,sections:STOPS.map(stop=>({
    ...stop,departures:valid?(snapshot?.sections?.find(s=>s.key===stop.key)?.departures||[])
      .filter(d=>Number.isFinite(epoch(d.departureTime))&&epoch(d.departureTime)>=reference)
      .slice(0,limit).map(d=>({...d,timeLabel:departureLabel(d,{snapshot:archived,now:reference})})):[],
  }))};
}
export async function fetchTransit({fetchImpl=globalThis.fetch,now=()=>Date.now(),timeoutMs=10_000}={}) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  const queryTime=new Date(now()).toISOString();
  try {
    const response=await fetchImpl(TRANSIT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','ET-Client-Name':TRANSIT_CLIENT},
      body:JSON.stringify({query:TRANSIT_QUERY,variables:{start:queryTime}}),signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw new Error(`Entur er utilgjengelig (${response.status}).`);
    return normalizeTransit(await response.json(),{fetchedAt:new Date(now()).toISOString(),queryTime,kind:'live'});
  } finally {clearTimeout(timer);}
}
