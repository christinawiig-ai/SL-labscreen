import test from 'node:test';
import assert from 'node:assert/strict';
import {memberSamples} from '../js/pilot/member-content.mjs';
import {createItem,editItem,requestReview,approveItem,validateContent} from '../js/pilot/model.mjs';
import {fingerprint} from '../js/pilot/review-data.mjs';
test('member benefit changes preserve exact approved terms and reject extra card fields',()=>{
  const sample=memberSamples().find(x=>x.content.type==='benefit-roundup');
  const approved=approveItem(requestReview(createItem(sample.content,{id:sample.id})),1);
  const cards=structuredClone(sample.content.cards);cards[0].detail='New offer terms, pending approval.';
  const edited=editItem(approved,{cards});
  assert.equal(edited.revision,2);assert.equal(edited.approved.content.cards[0].detail,sample.content.cards[0].detail);
  assert.throws(()=>validateContent({...sample.content,cards:cards.slice(1)}));
  assert.throws(()=>validateContent({...sample.content,cards:cards.map(c=>({...c,approved:true}))}));
  cards[0].detail='Changed outside the model';assert.notEqual(edited.content.cards[0].detail,cards[0].detail);
});
test('empty card field does not invalidate feedback on existing slides',()=>{
  const before={revision:1,content:{title:'Existing'}};
  assert.equal(fingerprint(before),fingerprint({...before,content:{...before.content,cards:[]}}));
});
test('proposed Pradeep events have no invented registration link and keep their date unconfirmed',()=>{
  const drafts=memberSamples().filter(x=>x.id.includes('pradeep'));
  assert.equal(drafts.length,2);
  for(const draft of drafts){assert.equal(draft.content.url,'');assert.match(draft.content.detail,/announced/);assert.equal(draft.content.eyebrow,'AI X');}
});
test('dated events expire at their verified end and AI Mad Lab links to its exact event',()=>{
  const drafts=memberSamples();
  const mad=drafts.find(x=>x.content.type==='event-artwork');
  assert.equal(mad.content.url,'https://luma.com/5yosbokm');assert.equal(mad.content.endsAt,'2026-09-12T20:00:00+02:00');
  assert.match(mad.content.expertise,/approval required/);
  const bergen=drafts.find(x=>x.id.endsWith('operators-bergen'));assert.equal(bergen.content.screen,'bergen');assert.equal(bergen.content.endsAt,'2026-09-11T15:00:00+02:00');
});
