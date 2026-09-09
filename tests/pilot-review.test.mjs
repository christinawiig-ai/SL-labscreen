import test from 'node:test';
import assert from 'node:assert/strict';
import {crc32,zipFiles} from '../js/pilot/zip.mjs';
import {fingerprint,feedbackExport,feedbackMarkdown,decodeReview} from '../js/pilot/review-data.mjs';
test('new empty network fields preserve feedback on older drafts',()=>{
  const old={revision:1,content:{title:'Existing draft',type:'event'}};
  assert.equal(fingerprint({...old,content:{...old.content,expertise:'',profiles:[]}}),JSON.stringify(old));
});
test('ZIP integrity uses standard CRC32 and rejects duplicate/path filenames',async()=>{
  assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);
  assert.throws(()=>zipFiles([{name:'../bad',data:'x'}]));assert.throws(()=>zipFiles([{name:'x',data:''},{name:'x',data:''}]));
  const bytes=new Uint8Array(await zipFiles([{name:'ø.txt',data:'æøå'}]).arrayBuffer()),view=new DataView(bytes.buffer);
  assert.equal(view.getUint32(0,true),0x04034b50);assert.equal(view.getUint16(6,true),0x0800);assert.equal(view.getUint32(bytes.length-22,true),0x06054b50);assert.equal(view.getUint16(bytes.length-12,true),1);
});
test('feedback export contains only chosen slides and flags comments from older revisions',()=>{
  const item={id:'one',revision:2,content:{title:'Now'}},old={...item,revision:1};
  const data=feedbackExport([{item,title:'Slide one'}],{one:{text:'Større bilde',fingerprint:fingerprint(old)},two:{text:'Not chosen',fingerprint:''}});
  assert.equal(data.slides.length,1);assert.equal(data.slides[0].feedbackMatchesVersion,false);assert.match(feedbackMarkdown(data),/tidligere versjon/);assert.doesNotMatch(feedbackMarkdown(data),/Not chosen/);
});
test('review storage roundtrips comments and selection, rejecting corrupt formats',()=>{
  const review={version:1,notes:{one:{text:'Mindre tekst',fingerprint:'snapshot'}},selected:['one']};
  assert.deepEqual(decodeReview(JSON.stringify(review)),review);assert.deepEqual(decodeReview(null),{version:1,notes:{},selected:null});assert.throws(()=>decodeReview('{bad'));assert.throws(()=>decodeReview('{"version":1,"notes":{"a":{}},"selected":null}'));
});
