import test from 'node:test';
import assert from 'node:assert/strict';
import createSelection from '../../src/application/interior-selection.js';
import createNavigation from '../../src/infrastructure/navigation/interior-navigation.js';
import registryFactory from '../../src/presentation/scenes/interior-design-registry.js';

function registry() {
  const module = {};
  registryFactory(module, {}, (id) => id);
  return module.exports;
}
function browser(href = 'http://127.0.0.1:5173/?interior=interior-design-001') {
  const storage = new Map();
  const calls = [];
  return {
    storage,
    calls,
    location: {
      href,
      assign: (value) => calls.push(['assign', value]),
      replace: (value) => calls.push(['replace', value]),
      reload: () => calls.push(['reload']),
    },
    sessionStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
  };
}

test('room selection preserves deployment path, unrelated parameters and hash, removes wall study', () => {
  const selection = createSelection(registry()).choose(
    'http://localhost:8080/pcol/?wall-study=modern&diagnostics=1#room',
    null,
    'interior-design-002',
  );
  const url = new URL(selection.href);
  assert.equal(url.pathname, '/pcol/');
  assert.equal(url.searchParams.get('diagnostics'), '1');
  assert.equal(url.searchParams.get('interior'), 'interior-design-002');
  assert.equal(url.searchParams.has('wall-study'), false);
  assert.equal(url.hash, '#room');
  assert.equal(selection.name, 'Amber Lounge');
  assert.equal(createSelection(registry()).choose(url.href, selection.id, selection.id), null);
  assert.throws(
    () => createSelection(registry()).choose(url.href, selection.id, 'unknown'),
    /Unknown/,
  );
});

test('registry exposes ordered display metadata without apply functions or mutable list entries', () => {
  const designs = registry();
  const list = designs.list();
  assert.deepEqual(
    list.map((entry) => entry.code),
    ['ORIGINAL', '001', '002', '003'],
  );
  assert.ok(list.every((entry) => entry.preview && !Object.hasOwn(entry, 'apply')));
  list[0].displayName = 'changed';
  assert.equal(designs.get(list[0].id).displayName, 'Original Club');
});

test('pending navigation is one-shot and scoped to the exact same-origin deployment and URL', () => {
  const client = browser();
  const navigation = createNavigation(client);
  const target = {
    id: 'interior-design-002',
    name: '琥珀复古会所',
    href: 'http://127.0.0.1:5173/?interior=interior-design-002',
  };
  const record = navigation.begin(target);
  assert.equal(navigation.read(), null);
  client.location.href = target.href;
  assert.deepEqual(navigation.read(), record);
  navigation.retry(record);
  assert.deepEqual(client.calls.at(-1), ['reload']);
  navigation.back(record);
  assert.deepEqual(client.calls.at(-1), ['replace', record.previousHref]);
  assert.equal(client.storage.size, 0);
});

test('corrupt, expired and foreign recovery records cannot supply a return URL', () => {
  const client = browser();
  const navigation = createNavigation(client);
  const key = 'oh-my-snooker:interior-transition';
  for (const record of [
    '{broken',
    JSON.stringify({
      href: client.location.href,
      previousHref: 'https://example.com/',
      id: 'interior-design-001',
      name: 'room',
      startedAt: Date.now(),
    }),
    JSON.stringify({
      href: client.location.href,
      previousHref: client.location.href,
      id: 'interior-design-001',
      name: 'room',
      startedAt: Date.now() - 300001,
    }),
  ]) {
    client.storage.set(key, record);
    assert.equal(navigation.read(), null);
  }
});

test('disabled session storage does not block navigation, retry or return', () => {
  const client = browser();
  client.sessionStorage = {
    getItem() {
      throw new Error('disabled');
    },
    setItem() {
      throw new Error('disabled');
    },
    removeItem() {
      throw new Error('disabled');
    },
  };
  const navigation = createNavigation(client);
  assert.equal(navigation.read(), null);
  const record = navigation.begin({
    id: 'interior-design-003',
    name: 'room',
    href: client.location.href,
  });
  navigation.retry(record);
  navigation.back(record);
  assert.equal(client.calls.length, 3);
});
