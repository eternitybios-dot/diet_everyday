const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Module = require('node:module');
const ts = require('typescript');

// Compile project TS in memory; no build artifacts or extra test dependencies.
require.extensions['.ts'] = (module, filename) => {
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  module._compile(source, filename);
};
const load = (name) => {
  const filename = path.resolve(__dirname, '../src/lib', name + '.ts');
  return Module._load(filename, module);
};
const { validateBackup, validDay } = load('validation');
const { withWeight } = load('records');
const { loadData, parseImport, DEFAULT_PROFILE } = load('store');
const { matchSearch } = load('format');
const backup = () => ({ schemaVersion: 2, profile: { ...DEFAULT_PROFILE }, sets: [], meals: [], weights: [], customFoods: [], customExercises: [], lastPlace: 'gym' });
const meal = () => ({ id: 'm1', day: '2026-09-20', at: 1, slot: 'lunch', name: 'ごはん', serving: '1杯', kcal: 200, protein: 3, fat: 1, carb: 45, qty: 1 });
const file = (data) => new File([JSON.stringify(data)], 'backup.json');

test('accepts a current backup and preserves an empty weight history', async () => {
  const raw = backup(); validateBackup(raw);
  const result = await parseImport(file(raw));
  assert.deepEqual(result.weights, []);
});
test('legacy macros are filled independently without overwriting provided values', async () => {
  const raw = backup(); raw.schemaVersion = 1;
  const m = meal(); delete m.fat; delete m.carb; delete m.qty; raw.meals.push(m);
  raw.customFoods.push({ id: 'f1', name: '食品', serving: '1個', cat: 'home', kcal: 200, protein: 10, fat: 3 });
  const result = await parseImport(file(raw));
  assert.equal(result.meals[0].qty, 1);
  assert.ok(Number.isFinite(result.meals[0].fat));
  assert.equal(result.customFoods[0].fat, 3);
  assert.ok(Number.isFinite(result.customFoods[0].carb));
});
test('rejects unsupported schema, malformed roots and invalid array members', () => {
  for (const raw of [null, [], {}, { ...backup(), schemaVersion: 3 }, { ...backup(), meals: [null] }, { ...backup(), weights: 'bad' }]) {
    assert.throws(() => validateBackup(raw));
  }
});
test('rejects non-finite/negative values, zero quantities, invalid dates and enums', () => {
  for (const patch of [{ kcal: NaN }, { protein: -1 }, { qty: 0 }, { day: '2026-02-30' }, { slot: 'other' }]) {
    assert.throws(() => validateBackup({ ...backup(), meals: [{ ...meal(), ...patch }] }));
  }
  assert.throws(() => validateBackup({ ...backup(), profile: { ...DEFAULT_PROFILE, heightCm: 0 } }));
  assert.equal(validDay('2024-02-29'), true);
});
test('duplicate record IDs are rejected before they can cause bulk deletion', () => {
  assert.throws(() => validateBackup({ ...backup(), meals: [meal(), meal()] }));
});
test('corrupt saved data is preserved and read failure does not write defaults', () => {
  let writes = 0;
  global.localStorage = { getItem: () => '{broken', setItem: () => writes++ };
  const result = loadData();
  assert.ok(result.error); assert.equal(result.raw, '{broken'); assert.equal(writes, 0);
});
test('unavailable storage reports an error rather than crashing', () => {
  global.localStorage = { getItem: () => { throw Error('blocked'); } };
  assert.ok(loadData().error);
});
test('first launch has no fabricated weigh-in', () => {
  global.localStorage = { getItem: () => null };
  const result = loadData(); assert.equal(result.error, null); assert.deepEqual(result.data.weights, []);
});
test('v1 storage remains readable', () => {
  global.localStorage = { getItem: (key) => key === 'tremeshi-v1' ? JSON.stringify({ ...backup(), schemaVersion: 1 }) : null };
  assert.equal(loadData().data.schemaVersion, 2); assert.equal(loadData().error, null);
});
test('backdated weight preserves latest weight; editing latest weight updates it', () => {
  let data = withWeight(backup(), '2026-09-20', 70);
  data = withWeight(data, '2026-09-01', 73);
  assert.equal(data.profile.weightKg, 70);
  assert.deepEqual(data.weights.map(w => w.day), ['2026-09-01', '2026-09-20']);
  data = withWeight(data, '2026-09-20', 69);
  assert.equal(data.weights.length, 2); assert.equal(data.profile.weightKg, 69);
  assert.equal(withWeight(data, '2026-09-20', 0), data);
  assert.equal(withWeight(data, 'bad', 70), data);
});
test('search ignores width, kana, case and whitespace differences', () => {
  assert.equal(matchSearch('プロテイン 20g', 'ﾌﾟﾛﾃｲﾝ２０Ｇ'), true);
  assert.equal(matchSearch('サラダチキン', 'さらだ ちきん'), true);
});
test('oversized imports are rejected before reading', async () => {
  await assert.rejects(parseImport({ size: 11 * 1024 * 1024, text() { assert.fail('must not read'); } }), /10MB/);
});

function worker(overrides = {}) {
  const handlers = {}, deleted = [];
  const scope = 'https://example.test/diet_everyday/';
  const context = {
    self: { registration: { scope }, location: { origin: 'https://example.test' }, clients: { claim: async () => {} }, addEventListener: (event, cb) => handlers[event] = cb },
    caches: { keys: async () => ['other-app-v1', 'tremeshi-v2', `tremeshi:${scope}:v2`, `tremeshi:${scope}:v3`], delete: async key => deleted.push(key) },
    URL, Response, ...overrides,
  };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../public/sw.js'), 'utf8'), context);
  return { handlers, deleted, scope };
}
test('service worker activation never deletes another application cache', async () => {
  const w = worker(); let done;
  w.handlers.activate({ waitUntil: p => done = p }); await done;
  assert.deepEqual(w.deleted, [`tremeshi:${w.scope}:v2`]);
});
test('service worker does not intercept another application or POST', () => {
  const w = worker();
  for (const request of [{ method: 'GET', url: 'https://example.test/papa-ikuji/' }, { method: 'POST', url: w.scope }]) {
    w.handlers.fetch({ request, respondWith: () => assert.fail('not in scope') });
  }
});
test('offline fallback reads only this app cache', async () => {
  let cacheName, response;
  const w = worker({ fetch: async () => { throw Error('offline'); }, caches: { open: async name => { cacheName = name; return { match: async () => new Response('cached') }; } } });
  w.handlers.fetch({ request: { method: 'GET', url: w.scope }, respondWith: p => response = p });
  assert.equal(await (await response).text(), 'cached');
  assert.equal(cacheName, `tremeshi:${w.scope}:v3`);
});
