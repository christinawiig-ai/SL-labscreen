import test from 'node:test';
import assert from 'node:assert/strict';
import {designSamples} from '../js/pilot/samples.mjs';
import {createItem,validateContent,requestReview,approveItem,editItem,activeItems} from '../js/pilot/model.mjs';
import {qrMatrix,drawQr} from '../js/pilot/qr.mjs';
test('timeline requires six bounded milestone records without arbitrary fields',()=>{
  const content=designSamples().find(item=>item.content.type==='timeline').content;
  for(const milestones of [{},[],content.milestones.slice(1),content.milestones.map((m,i)=>i?m:{...m,title:'x'.repeat(49)}),content.milestones.map((m,i)=>i?m:{...m,approved:true})])assert.throws(()=>validateContent({...content,milestones}));
});
test('network profile edits preserve the approved roster and roundtrip without spurious revisions',()=>{
  const example=designSamples().find(item=>item.content.type==='eir-network');
  const item=approveItem(requestReview(createItem(example.content,{id:example.id})),1);
  assert.equal(item.content.profiles.length,8);assert.match(item.content.body,/^40\+/);
  assert.equal(editItem(item,structuredClone(item.content)).revision,1);
  const profiles=structuredClone(item.content.profiles);profiles[0].bio='Product development and scaling.';
  const edited=editItem(item,{profiles});assert.equal(edited.revision,2);
  assert.equal(activeItems([edited],'home')[0].content.profiles[0].bio,item.content.profiles[0].bio);
  profiles[0].name='Changed outside the model';assert.notEqual(edited.content.profiles[0].name,profiles[0].name);
  for(const invalid of [[],{},[...item.content.profiles,item.content.profiles[0]],item.content.profiles.map((p,i)=>i?p:{...p,image:'https://example.com/photo.jpg'}),item.content.profiles.map((p,i)=>i?p:{...p,approved:true})])assert.throws(()=>validateContent({...item.content,profiles:invalid}));
});
test('all source-based design examples validate, including EIR portraits',()=>{
  const items=designSamples();assert.equal(new Set(items.map(i=>i.id)).size,items.length);
  for(const item of items)assert.doesNotThrow(()=>createItem(item.content,{id:item.id}));
  for(const item of items.filter(i=>i.content.type==='eir'))assert.throws(()=>validateContent({...item.content,image:''}));
});
test('changing a QR destination requires a new draft and preserves the approved URL',()=>{
  const example=designSamples()[0],item=approveItem(requestReview(createItem(example.content,{id:example.id})),1);
  const edited=editItem(item,{url:'https://www.startuplab.no/about'});
  assert.equal(edited.revision,2);assert.equal(activeItems([edited],'home')[0].content.url,example.content.url);
  assert.notDeepEqual(qrMatrix(item.content.url),qrMatrix(edited.content.url));
});
test('speaker event requires a portrait and preserves approved agenda when edited',()=>{
  const example=designSamples().find(item=>item.content.type==='event-speaker');
  assert.throws(()=>validateContent({...example.content,image:''}));
  const approved=approveItem(requestReview(createItem(example.content,{id:example.id})),1);
  const edited=editItem(approved,{agenda:'09:00 talk · 09:45 questions'});
  assert.equal(edited.approved.content.agenda,example.content.agenda);
  assert.equal(edited.content.agenda,'09:00 talk · 09:45 questions');
  assert.equal(edited.content.url,'https://luma.com/qgfee44a?tk=neBqXp');
});
test('QR drawing uses whole pixels and preserves a four-module white quiet zone',()=>{
  const fills=[],ctx={fillStyle:'',fillRect(...rect){fills.push({color:this.fillStyle,rect});}};
  const url=designSamples()[0].content.url,modules=qrMatrix(url).length,scale=Math.floor(252/(modules+8));
  const size=drawQr(ctx,url,64,687,252);assert.equal(size,(modules+8)*scale);assert.equal(fills[0].color,'#FFFFFF');
  for(const {rect:[x,y,w,h]}of fills.slice(1)){assert.ok(x>=64+4*scale&&y>=687+4*scale);assert.ok(x+w<=64+size-4*scale&&y+h<=687+size-4*scale);assert.equal(w,scale);assert.equal(h,scale);}
});
