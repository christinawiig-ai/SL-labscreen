import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../js/pilot/model.mjs';

const start = '2026-09-08T10:00:00.000Z';
const end = '2026-09-08T11:00:00.000Z';
const before = '2026-09-08T09:00:00.000Z';
const content = (patch = {}) => ({ type: 'event', title: 'DEMO event', screen: 'home', startsAt: start, endsAt: end, ...patch });
const draft = () => model.createItem(content(), { id: 'item-1', now: before });
const approved = () => model.approveItem(model.requestReview(draft(), before), 1, before);

test('exports the agreed pure model interface', () => {
  for (const name of ['createItem', 'editItem', 'requestReview', 'approveItem', 'withdrawItem', 'activeItems', 'validateContent', 'statusOf']) assert.equal(typeof model[name], 'function', name);
});

test('drafts never play and optional copy defaults to empty text', () => {
  const item = draft();
  assert.equal(item.content.body, '');
  assert.equal(item.revision, 1);
  assert.equal(model.statusOf(item, start), 'draft');
  assert.deepEqual(model.activeItems([item], 'home', start), []);
});

test('approval requires a pending review of the exact current revision', () => {
  assert.throws(() => model.approveItem(draft(), 1, before));
  const pending = model.requestReview(draft(), before);
  assert.equal(model.statusOf(pending, start), 'review');
  assert.throws(() => model.approveItem(pending, 0, before));
  const edited = model.editItem(pending, { title: 'New draft' }, before);
  assert.equal(edited.reviewRevision, null);
  assert.throws(() => model.approveItem(edited, 1, before));
});

test('playback includes start, excludes end and matches the selected screen', () => {
  const item = approved();
  assert.equal(model.activeItems([item], 'home', before).length, 0);
  assert.equal(model.activeItems([item], 'home', start).length, 1);
  assert.equal(model.activeItems([item], 'home', end).length, 0);
  assert.equal(model.activeItems([item], 'oslo', start).length, 0);
  assert.equal(model.statusOf(item, before), 'scheduled');
  assert.equal(model.statusOf(item, start), 'live');
  assert.equal(model.statusOf(item, end), 'expired');
});

test('new draft copy and dates cannot change the previously approved playback', () => {
  const item = approved();
  const edited = model.editItem(item, { title: 'Unapproved replacement', screen: 'oslo', endsAt: '2026-09-09T12:00:00Z' }, start);
  assert.equal(edited.revision, 2);
  assert.equal(edited.approved.content.title, 'DEMO event');
  assert.equal(model.statusOf(edited, start), 'draft');
  const playback = model.activeItems([edited], 'home', start);
  assert.equal(playback[0].content.title, 'DEMO event');
  assert.equal(playback[0].revision, 1);
  assert.equal(model.activeItems([edited], 'oslo', start).length, 0);
  assert.equal(model.activeItems([edited], 'home', end).length, 0);
});

test('approving the new revision replaces the previous snapshot', () => {
  const edited = model.editItem(approved(), { title: 'Reviewed replacement' }, start);
  const pending = model.requestReview(edited, start);
  assert.equal(model.statusOf(pending, start), 'review');
  const item = model.approveItem(pending, 2, start);
  assert.equal(model.activeItems([item], 'home', start)[0].content.title, 'Reviewed replacement');
  assert.equal(item.approved.revision, 2);
  assert.equal(item.reviewRevision, null);
});

test('withdraw immediately clears review and approved playback', () => {
  const item = model.requestReview(model.editItem(approved(), { title: 'Pending' }, start), start);
  const withdrawn = model.withdrawItem(item, start);
  assert.equal(withdrawn.approved, null);
  assert.equal(withdrawn.reviewRevision, null);
  assert.equal(model.statusOf(withdrawn, start), 'draft');
  assert.deepEqual(model.activeItems([withdrawn], 'home', start), []);
});

test('materially unchanged edits preserve revision, review and history', () => {
  const pending = model.requestReview(draft(), before);
  const unchanged = model.editItem(pending, { title: ' DEMO event ', startsAt: '2026-09-08T12:00:00+02:00' }, before);
  assert.deepEqual(unchanged, pending);
  assert.notEqual(unchanged, pending);
});

test('input and returned snapshots share no mutable objects', () => {
  const item = approved();
  const original = structuredClone(item);
  const edited = model.editItem(item, { title: 'Changed' }, start);
  edited.approved.content.title = 'Attempted mutation';
  edited.history[0].action = 'Changed';
  assert.deepEqual(item, original);
  const playback = model.activeItems([item], 'home', start);
  playback[0].content.title = 'Another mutation';
  assert.deepEqual(item, original);
});

test('six template families validate; unknown templates and screens fail', () => {
  for (const type of ['event', 'welcome', 'benefit', 'request', 'notice', 'external']) assert.equal(model.validateContent(content({ type, image: 'assets/photos/aimadlab-cover.png' })).type, type);
  assert.throws(() => model.validateContent(content({ type: 'unknown' })));
  assert.throws(() => model.validateContent(content({ screen: 'all' })));
  assert.throws(() => model.validateContent(content({ title: '  ' })));
});

test('unknown fields cannot inject state via creation or an editing patch', () => {
  assert.throws(() => model.createItem(content({ approved: {} }), { id: 'x', now: start }));
  assert.throws(() => model.editItem(draft(), { revision: 99 }, start));
  assert.throws(() => model.editItem(draft(), { approved: {} }, start));
  assert.throws(() => model.editItem(draft(), JSON.parse('{"__proto__": {"approved": true}}'), start));
});

test('each copy field enforces its rendering length budget', () => {
  for (const [field, cap] of Object.entries({ eyebrow: 60, expertise: 220, title: 90, body: 220, detail: 80, location: 70, cta: 60 })) {
    assert.doesNotThrow(() => model.validateContent(content({ [field]: 'x'.repeat(cap) })));
    assert.throws(() => model.validateContent(content({ [field]: 'x'.repeat(cap + 1) })));
  }
  assert.throws(() => model.validateContent(content({ body: 12 })));
  assert.throws(() => model.validateContent(content({ url: `https://example.com/${'a'.repeat(300)}` })));
});

test('only absolute HTTPS links are accepted', () => {
  assert.equal(model.validateContent(content({ url: 'https://example.com/info?q=demo' })).url, 'https://example.com/info?q=demo');
  for (const url of ['http://example.com', 'javascript:alert(1)', '/relative', 'https://', 'https://user:password@example.com']) assert.throws(() => model.validateContent(content({ url })));
});

test('media allowlist accepts supplied photos and raster data URLs only', () => {
  for (const image of ['assets/photos/aimadlab-cover.png', 'assets/photos/event-fintech.jpg', 'assets/photos/event-fintech-2.jpg', 'assets/photos/windturbines.png', 'assets/photos/winecoding-hero.jpg', 'data:image/png;base64,aGVsbG8=', 'data:image/jpeg;base64,aGVsbG8=', 'data:image/webp;base64,aGVsbG8=']) assert.doesNotThrow(() => model.validateContent(content({ type: 'external', image })));
  for (const image of ['', 'assets/photos/missing.png', 'assets/photos/../secret.png', 'https://example.com/image.png', 'data:image/svg+xml;base64,aGVsbG8=', 'data:image/png;base64,%%%']) assert.throws(() => model.validateContent(content({ type: 'external', image })));
  assert.throws(() => model.validateContent(content({ image: `data:image/png;base64,${'A'.repeat(2_600_000)}` })));
});

test('dates require real ordered ISO instants with explicit timezone', () => {
  for (const startsAt of ['', 'nonsense', '2026-09-08', '2026-09-08T10:00', '2026-02-30T10:00:00Z', '2026-09-08T25:00:00Z', end]) assert.throws(() => model.validateContent(content({ startsAt })));
  assert.throws(() => model.validateContent(content({ endsAt: before })));
  assert.equal(model.validateContent(content({ startsAt: '2026-09-08T12:00:00+02:00' })).startsAt, start);
});

test('bad identifiers and operation clocks fail clearly', () => {
  assert.throws(() => model.createItem(content(), { id: '', now: start }));
  assert.throws(() => model.editItem(draft(), { title: 'Change' }, 'invalid'));
  assert.throws(() => model.activeItems([approved()], 'home', 'invalid'));
  assert.throws(() => model.statusOf(approved(), 'invalid'));
});
