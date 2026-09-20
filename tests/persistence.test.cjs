const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/diet_everyday/' });
global.window = dom.window;
global.document = dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { useAppData } = require('../src/lib/useAppData.ts');
const { DEFAULT_PROFILE } = require('../src/lib/store.ts');
const blank = () => ({ schemaVersion: 2, profile: { ...DEFAULT_PROFILE }, sets: [], meals: [], weights: [], customFoods: [], customExercises: [], lastPlace: 'gym' });
let current;
function Probe() { current = useAppData(); return null; }
async function mount() {
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(React.createElement(React.StrictMode, null, React.createElement(Probe))));
  return () => act(async () => root.unmount());
}
test('StrictMode mount and edits never overwrite unreadable original data', async () => {
  const original = '{broken'; let writes = 0;
  global.localStorage = { getItem: () => original, setItem: () => writes++ };
  const close = await mount();
  try {
    assert.ok(current.storageError); assert.equal(current.recoveryRaw, original);
    await act(async () => current.logWeight('2026-09-20', 70));
    assert.equal(writes, 0); assert.equal(current.data.weights[0].kg, 70);
    assert.equal(current.canRetrySave, false);
  } finally { await close(); }
});
test('save failures keep edits in memory, show error and allow explicit retry', async () => {
  let blocked = true, saved;
  global.localStorage = { getItem: () => null, setItem: (_key, value) => { if (blocked) throw Error('quota'); saved = value; } };
  const close = await mount();
  try {
    await act(async () => current.logWeight('2026-09-20', 70));
    assert.ok(current.storageError); assert.equal(current.data.profile.weightKg, 70);
    blocked = false;
    await act(async () => current.retrySave());
    assert.equal(current.storageError, null); assert.equal(JSON.parse(saved).weights[0].kg, 70);
  } finally { await close(); }
});
test('confirmed valid restore re-enables saving after a corrupt read', async () => {
  let saved;
  global.localStorage = { getItem: () => 'null', setItem: (_key, value) => saved = value };
  const close = await mount();
  try {
    assert.ok(current.storageError);
    await act(async () => current.replaceData(blank()));
    assert.equal(current.storageError, null); assert.equal(current.canRetrySave, true);
    assert.deepEqual(JSON.parse(saved).weights, []);
  } finally { await close(); }
});
