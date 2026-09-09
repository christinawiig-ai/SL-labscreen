import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {STOPS,normalizeTransit,isFresh,departureLabel,transitView,osloClock,fetchTransit,MAX_AGE_MS} from '../js/pilot/transit.mjs';
const now=Date.parse('2026-09-09T06:00:00Z');
const aimed='2026-09-09T08:05:00+02:00',expected='2026-09-09T08:08:00+02:00';
function call(mode='metro',changes={}){return {realtime:true,cancellation:false,aimedDepartureTime:aimed,expectedDepartureTime:expected,
  destinationDisplay:{frontText:'Bergkrystallen via Majorstuen'},quay:{id:'quay',publicCode:'1'},
  serviceJourney:{id:'service',journeyPattern:{line:{publicCode:'4',transportMode:mode}}},...changes};}
function response(){return {data:Object.fromEntries(STOPS.map(s=>[s.key,{id:s.id,estimatedCalls:[call(s.mode)]}]))};}
const options={fetchedAt:new Date(now).toISOString(),queryTime:new Date(now).toISOString()};
test('stop identities and mode filters keep Gaustad buses separate from metro and tram',()=>{
  const raw=response();raw.data.metro.estimatedCalls.push(call('tram'),call('bus'));raw.data.bus.estimatedCalls.push(call('metro'));
  const data=normalizeTransit(raw,options);assert.deepEqual(data.sections.map(s=>s.departures.length),[1,1,1]);
  assert.deepEqual(data.sections.map(s=>s.name),['Forskningsparken','Forskningsparken','Gaustad']);
  raw.data.bus.id='NSR:StopPlace:wrong';assert.throws(()=>normalizeTransit(raw,options));
});
test('realtime uses expected time, scheduled uses aimed time, malformed time is dropped',()=>{
  const raw=response();raw.data.metro.estimatedCalls=[call('metro',{realtime:false})];
  assert.equal(normalizeTransit(raw,options).sections[0].departures[0].departureTime,aimed);
  raw.data.metro.estimatedCalls=[call('metro',{expectedDepartureTime:'invalid'})];
  assert.equal(normalizeTransit(raw,options).sections[0].departures[0].realtime,false);
  raw.data.metro.estimatedCalls=[call('metro',{realtime:false,aimedDepartureTime:'invalid'})];
  assert.equal(normalizeTransit(raw,options).sections[0].departures.length,0);
});
test('cancellations remain visible and are never a departure countdown',()=>{
  const raw=response();raw.data.metro.estimatedCalls=[call('metro',{cancellation:true})];
  const data=normalizeTransit(raw,options),departure=data.sections[0].departures[0];
  assert.equal(departureLabel(departure,{now}),'Innstilt');
  assert.equal(transitView(data,{now}).sections[0].departures[0].timeLabel,'Innstilt');
});
test('live data expires at 180 seconds even if it still contains future departures',()=>{
  const data=normalizeTransit(response(),options);
  assert.equal(isFresh(data,now+MAX_AGE_MS),true);assert.equal(isFresh(data,now+MAX_AGE_MS+1),false);
  assert.equal(transitView(data,{now:now+MAX_AGE_MS+1}).sections[0].departures.length,0);
  assert.equal(isFresh(data,now-30_001),false);assert.equal(isFresh({...data,fetchedAt:'bad'},now),false);
});
test('archived samples use absolute clocks and explicit archive state, regardless of current date',()=>{
  const data=normalizeTransit(response(),{...options,kind:'snapshot'});
  const view=transitView(data,{now:now+100*86400_000});
  assert.equal(view.archived,true);assert.equal(view.fresh,false);assert.equal(view.sections[0].departures[0].timeLabel,'08:08');
  assert.equal(departureLabel({...data.sections[0].departures[0],realtime:false,departureTime:aimed},{now}),'08:05');
});
test('Europe/Oslo clock handles winter, summer, and midnight without host timezone assumptions',()=>{
  assert.equal(osloClock('2026-09-08T22:00:00Z'),'00:00');assert.equal(osloClock('2026-01-09T06:00:00Z'),'07:00');
  assert.equal(osloClock('2026-09-09T06:00:00Z'),'08:00');assert.equal(osloClock('bad'),'—');
});
test('departed services are removed and duplicate quay/service calls are collapsed',()=>{
  const raw=response();raw.data.metro.estimatedCalls.push(call());
  const data=normalizeTransit(raw,options);assert.equal(data.sections[0].departures.length,1);
  const fresh={...data,fetchedAt:new Date(now+9*60_000).toISOString()};
  assert.equal(transitView(fresh,{now:now+9*60_000}).sections[0].departures.length,0);
});
test('fetch supplies required client identity and rejects transport and GraphQL errors',async()=>{
  let request;
  const data=await fetchTransit({now:()=>now,fetchImpl:async(url,options)=>{request={url,...options};return {ok:true,json:async()=>response()};}});
  assert.equal(data.kind,'live');assert.equal(request.headers['ET-Client-Name'],'startuplab-labscreen');
  assert.equal(JSON.parse(request.body).variables.start,new Date(now).toISOString());
  await assert.rejects(fetchTransit({fetchImpl:async()=>({ok:false,status:503})}));
  await assert.rejects(fetchTransit({fetchImpl:async()=>({ok:true,json:async()=>({errors:[{message:'failure'}]})})}));
  await assert.rejects(fetchTransit({timeoutMs:5,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout'))))}));
});
test('checked-in fixture contains actual dated source data for all three modes',async()=>{
  const snapshot=JSON.parse(await readFile(new URL('../assets/data/transit-snapshot.json',import.meta.url),'utf8'));
  assert.equal(snapshot.kind,'snapshot');assert.equal(snapshot.source,'Entur');assert.ok(Number.isFinite(Date.parse(snapshot.queryTime)));assert.deepEqual(snapshot.sections.map(s=>s.mode),['metro','tram','bus']);
  assert.ok(snapshot.sections.every(s=>s.departures.length>=4));
  assert.equal(transitView(snapshot).archived,true);assert.ok(transitView(snapshot).sections[1].departures.every(d=>['17','18'].includes(d.line)));
});
test('renderer honors editable copy and QR, keeps stop names fixed, without a demo watermark',async()=>{
  const {renderTransit}=await import('../js/pilot/transit-render.mjs');
  const OriginalImage=globalThis.Image;
  globalThis.Image=class{naturalWidth=38;naturalHeight=103;set src(_value){queueMicrotask(()=>this.onload());}};
  function context(){return {texts:[],pixels:[],depth:0,save(){this.depth++;},restore(){this.depth--;},
    fillText(text){this.texts.push(text);},fillRect(...args){if(this.fillStyle==='#000000')this.pixels.push(args);},
    drawImage(){},measureText(text){return {width:String(text).length*parseFloat(this.font.match(/(\d+)px/)[1])*.5};}};}
  try{
    const data=normalizeTransit(response(),{...options,kind:'snapshot'}),a=context(),b=context();
    await renderTransit(a,{transitData:data,title:'Heading edited',eyebrow:'EYEBROW EDITED',cta:'CTA edited',url:'https://example.com/first'});
    await renderTransit(b,{transitData:{...data,kind:'live'},transitNow:now,url:'https://example.com/second'});
    for(const value of ['Heading edited','EYEBROW EDITED','CTA edited','Forskningsparken','Gaustad'])assert.ok(a.texts.includes(value));
    assert.ok(b.texts.includes('Your next departure.'));assert.ok(![...a.texts,...b.texts].some(text=>text.includes('NOT FOR PUBLICATION')));
    assert.notDeepEqual(a.pixels,b.pixels,'changing the approved URL must change the QR');
    const tooLong=context();await assert.rejects(renderTransit(tooLong,{transitData:data,title:'W'.repeat(90)}),/too long/);assert.equal(tooLong.depth,0);
  }finally{globalThis.Image=OriginalImage;}
});
