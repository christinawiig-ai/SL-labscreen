import {TIMELINE_MILESTONES} from '../js/pilot/timeline.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as model from '../js/pilot/model.mjs';
import * as storage from '../js/pilot/storage.mjs';
import * as examples from '../js/pilot/samples.mjs';
import * as handover from '../js/pilot/handover.mjs';
import {EIR_PROFILES} from '../js/pilot/eir-network.mjs';

// Exercise the actual browser controllers with a small DOM/storage boundary.
// Rendering is stubbed here; visual fidelity is checked separately in Chrome.
const sources = Object.fromEntries(await Promise.all(['studio', 'player'].map(async name => [
  name, (await readFile(new URL(`../js/pilot/${name}.mjs`, import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '')
])));
const settle = () => new Promise(resolve => setImmediate(resolve));

function node() {
  const attributes = new Map();
  return {
    value: '', textContent: '', hidden: false, disabled: false, style: {}, children: [], listeners: {}, draws: [],
    addEventListener(event, listener) { this.listeners[event] = listener; },
    setAttribute(name, value) { attributes.set(name, value); },
    getAttribute(name) { return attributes.get(name); },
    replaceChildren(...children) { this.children = children; },
    append(...children) { this.children.push(...children); },
    add(option) { this.children.push(option); },
    getContext() { return {drawImage: (...args) => this.draws.push(args)}; }
  };
}

function environment(item) {
  const elements = new Map();
  const get = id => { if (!elements.has(id)) elements.set(id, node()); return elements.get(id); };
  const fields = model.CONTENT_FIELDS.filter(name => !['image','profiles','milestones','cards'].includes(name)).map(name => Object.assign(get(name), {name}));
  get('editor-form').elements = fields;
  let raw = storage.encodeStore([item]);
  const writes = [];
  const events = {};
  const dependencies = {
    ...model, ...examples, ...storage, ...handover, EIR_PROFILES, TIMELINE_MILESTONES, designSamples:()=>[],
    document: {getElementById: get, createElement: node, querySelector: get, querySelectorAll: () => [...elements.values()]},
    window: {addEventListener: (event, listener) => { events[event] = listener; }},
    localStorage: {getItem: () => raw, setItem: (key, value) => { writes.push(value); raw = value; }},
    FormData: class { constructor(form) { this.fields = form.elements; } *[Symbol.iterator]() { for (const field of this.fields) yield [field.name, field.value]; } },
    Option: class { constructor(label, value) { this.label = label; this.value = value; } },
    renderSlide: async (canvas, content) => canvas.setAttribute('aria-label', content.title),
    renderFallback: async canvas => canvas.setAttribute('aria-label', 'Neutral fallback'),
    setInterval: callback => { events.interval = callback; }
  };
  return {get, dependencies, writes, events, read: () => storage.decodeStore(raw)[0]};
}

function run(name, dependencies) {
  new Function(...Object.keys(dependencies), sources[name])(...Object.values(dependencies));
}

function approvedItem() {
  const content = {...examples.samples()[0], startsAt: '2030-09-08T10:00:37.123Z', endsAt: '2030-09-08T11:00:49.987Z'};
  return model.approveItem(model.requestReview(model.createItem(content, {id: 'precision-test'})), 1);
}

test('adding new design drafts preserves existing approvals and is idempotent',async()=>{
  const item=approvedItem(),env=environment(item);env.dependencies.designSamples=examples.designSamples;
  run('studio',env.dependencies);await settle();assert.deepEqual(env.read(),item);assert.equal(env.writes.length,1);
  const added=storage.decodeStore(env.writes[0]);assert.equal(added.length,1+examples.designSamples().length);assert.ok(added.slice(1).every(i=>i.approved===null));
  run('studio',env.dependencies);await settle();assert.equal(env.writes.length,1);assert.deepEqual(env.read(),item);
});

test('saving unrelated copy preserves exact schedule instants and approved snapshot', async () => {
  const item = approvedItem(), env = environment(item);
  run('studio', env.dependencies);
  await settle();
  env.get('title').value = 'A revised title';
  env.get('editor-form').listeners.input();
  await settle();
  await env.get('editor-form').listeners.submit({preventDefault() {}});
  const saved = env.read();
  assert.equal(saved.revision, 2);
  assert.equal(saved.content.title, 'A revised title');
  assert.equal(saved.content.startsAt, item.content.startsAt);
  assert.equal(saved.content.endsAt, item.content.endsAt);
  assert.deepEqual(saved.approved, item.approved);
});

test('choosing a library image creates a draft without replacing the approved image',async()=>{
  const item=approvedItem(),env=environment(item);run('studio',env.dependencies);await settle();
  env.get('library-image').value='assets/photos/pradeep-sankaran-linkedin.png';
  await env.get('library-image').listeners.change();
  await env.get('editor-form').listeners.submit({preventDefault(){}});
  assert.equal(env.read().content.image,'assets/photos/pradeep-sankaran-linkedin.png');
  assert.deepEqual(env.read().approved,item.approved);
});

test('older drafts with missing optional copy show empty form fields',async()=>{
  const item=approvedItem();delete item.content.expertise;delete item.content.agenda;
  const env=environment(item);run('studio',env.dependencies);await settle();
  assert.equal(env.get('expertise').value,'');assert.equal(env.get('agenda').value,'');
});

test('editing a network card through the form saves all eight profiles and retains approval',async()=>{
  const sample=examples.designSamples().find(item=>item.content.type==='eir-network');
  const item=model.approveItem(model.requestReview(model.createItem(sample.content,{id:sample.id})),1),env=environment(item);
  run('studio',env.dependencies);await settle();
  const groups=env.get('profile-fields').children;assert.equal(groups.length,8);
  groups[0].children.find(field=>field.id==='profile-0-bio').value='Product development and scaling.';
  env.get('editor-form').listeners.input();await settle();
  await env.get('editor-form').listeners.submit({preventDefault(){}});
  const saved=env.read();assert.equal(saved.revision,2);assert.equal(saved.content.profiles[0].bio,'Product development and scaling.');assert.deepEqual(saved.approved,item.approved);
  assert.deepEqual(saved.content.profiles.slice(1),item.content.profiles.slice(1));
});

test('timeline milestone fields save together and retain the approved timeline',async()=>{
  const sample=examples.designSamples().find(item=>item.content.type==='timeline');
  const item=model.approveItem(model.requestReview(model.createItem(sample.content,{id:sample.id})),1),env=environment(item);
  run('studio',env.dependencies);await settle();
  const groups=env.get('milestone-fields').children;assert.equal(groups.length,6);
  groups[0].children.find(field=>field.id==='milestone-0-title').value='Startuplab opens';
  env.get('editor-form').listeners.input();await settle();await env.get('editor-form').listeners.submit({preventDefault(){}});
  assert.equal(env.read().content.milestones[0].title,'Startuplab opens');assert.equal(env.read().revision,2);assert.deepEqual(env.read().approved,item.approved);
});

test('an explicitly changed schedule field is saved while the other instant retains precision', async () => {
  const item = approvedItem(), env = environment(item);
  run('studio', env.dependencies);
  await settle();
  env.get('endsAt').value = '2030-09-09T17:05';
  env.get('editor-form').listeners.input();
  await settle();
  await env.get('editor-form').listeners.submit({preventDefault() {}});
  assert.equal(env.read().content.endsAt, new Date('2030-09-09T17:05').toISOString());
  assert.equal(env.read().content.startsAt, item.content.startsAt);
});

test('withdrawal cannot erase unsaved text, and works after explicit discard', async () => {
  const item = approvedItem(), env = environment(item);
  run('studio', env.dependencies);
  await settle();
  env.get('title').value = 'Unsaved work';
  env.get('editor-form').listeners.input();
  await settle();
  assert.equal(env.get('withdraw').disabled, true);
  env.get('withdraw').onclick(); // Check the handler guard as well as the disabled control.
  assert.equal(env.writes.length, 0);
  assert.equal(env.get('title').value, 'Unsaved work');
  assert.deepEqual(env.read().approved, item.approved);
  env.get('discard').onclick();
  await settle();
  assert.equal(env.get('title').value, item.content.title);
  assert.equal(env.get('withdraw').disabled, false);
  env.get('withdraw').onclick();
  assert.equal(env.read().approved, null);
  assert.equal(env.read().reviewRevision, null);
});

test('failed approved artwork displays a visible neutral fallback and retains the error', async () => {
  const item = model.approveItem(model.requestReview(model.createItem(examples.samples()[0], {id: 'broken-artwork'})), 1);
  const env = environment(item);
  env.get('screen').value = 'home';
  env.dependencies.renderSlide = async () => { throw new Error('Image could not load'); };
  run('player', env.dependencies);
  await settle();
  assert.equal(env.get('playback').style.visibility, 'visible');
  assert.equal(env.get('playback').getAttribute('aria-label'), 'Neutral fallback');
  assert.match(env.get('player-error').textContent, /Image could not load/);
  await env.events.interval();
  assert.equal(env.get('playback').draws.length, 1, 'No flashing/repainting fallback on every tick');
  assert.match(env.get('player-error').textContent, /Image could not load/);
});

test('expired approved content is replaced immediately by the neutral fallback', async () => {
  const item = model.approveItem(model.requestReview(model.createItem(examples.samples()[0], {id: 'expiring-artwork'})), 1);
  const env = environment(item);
  env.get('screen').value = 'home';
  run('player', env.dependencies);
  await settle();
  assert.equal(env.get('playback').getAttribute('aria-label'), item.content.title);
  const expired = structuredClone(item);
  expired.content.startsAt = expired.approved.content.startsAt = '2020-01-01T00:00:00.000Z';
  expired.content.endsAt = expired.approved.content.endsAt = '2020-01-02T00:00:00.000Z';
  env.dependencies.localStorage.setItem(storage.STORAGE_KEY, storage.encodeStore([expired]));
  const tick = env.events.interval();
  assert.equal(env.get('playback').style.visibility, 'hidden', 'Old slide disappears before fallback finishes');
  await tick;
  assert.equal(env.get('playback').style.visibility, 'visible');
  assert.equal(env.get('playback').getAttribute('aria-label'), 'Neutral fallback');
});
