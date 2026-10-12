import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { setImmediate } from 'node:timers';
import transitionModule from '../../src/application/interior-transition.js';

function fixture() {
  const frames = [];
  const events = [];
  const listeners = new Map();
  const timers = new Map();
  let callbacks;
  const navigation = {
    href: 'http://localhost/?interior=interior-design-original',
    read: () => null,
    clear: () => events.push(['clear']),
    commit: (selection) => events.push(['commit', selection.id]),
    begin(selection) {
      events.push(['navigate', selection.id]);
      return { ...selection, previousHref: this.href };
    },
    retry: (record) => events.push(['retry', record.id]),
    back: (record) => events.push(['back', record.previousHref]),
  };
  const module = {};
  runInNewContext('(' + transitionModule.toString() + ')(module, {}, () => fonts)', {
    module,
    fonts: {},
    URL,
    createNavigation: () => navigation,
    createTransitionView(options) {
      callbacks = options;
      return {
        loading: (name, options) => events.push(['loading', name, options.handoff]),
        fail: () => events.push(['error']),
        hide: () => events.push(['hide']),
      };
    },
    window: {
      requestAnimationFrame: (callback) => frames.push(callback),
      addEventListener: (type, callback) => listeners.set(type, callback),
      removeEventListener: (type) => listeners.delete(type),
    },
    setTimeout(callback, duration) {
      assert.ok(duration === 45000 || duration === 150);
      timers.set(callback, duration);
      return callback;
    },
    clearTimeout: (callback) => timers.delete(callback),
  });
  module.exports.complete('interior-design-original');
  events.length = 0;
  return {
    transition: module.exports,
    events,
    frames,
    listeners,
    timers,
    navigation,
    get callbacks() {
      return callbacks;
    },
  };
}

const selection = {
  id: 'interior-design-001',
  name: 'Modern Club',
  href: 'http://localhost/?interior=interior-design-001',
};

test('selection presents one handoff frame before one-shot navigation and ignores old scene completion', () => {
  const state = fixture();
  state.transition.begin(selection);
  state.transition.begin({ ...selection, id: 'interior-design-002' });
  state.transition.complete('interior-design-original');
  assert.deepEqual(state.events, [['loading', selection.name, true]]);
  assert.equal(state.frames.length, 1);
  state.frames.shift()();
  assert.equal(state.events.length, 1);
  state.frames.shift()();
  assert.deepEqual(state.events.at(-1), ['navigate', selection.id]);
  assert.equal(state.frames.length, 0);
});

test('failure while awaiting paint cancels navigation and retains retry/back recovery', () => {
  const state = fixture();
  state.transition.begin(selection);
  state.frames.shift()();
  state.transition.fail();
  state.frames.shift()();
  assert.ok(!state.events.some(([event]) => event === 'navigate'));
  assert.equal(state.timers.size, 0);
  assert.equal(state.listeners.size, 0);
  state.callbacks.onRetry();
  state.callbacks.onBack();
  assert.deepEqual(state.events.slice(-2), [
    ['retry', selection.id],
    ['back', state.navigation.href],
  ]);
});

test('navigation I/O failure after paint displays recovery rather than escaping a RAF callback', () => {
  const state = fixture();
  state.navigation.begin = () => {
    throw new Error('Navigation unavailable');
  };
  state.transition.begin(selection);
  state.frames.shift()();
  assert.doesNotThrow(() => state.frames.shift()());
  assert.deepEqual(state.events.at(-1), ['error']);
  assert.equal(state.listeners.size, 0);
  assert.equal(state.timers.size, 0);
});

test('live switch keeps the document and ignores the old scene until the target is ready', async () => {
  const state = fixture();
  let resolve;
  const ready = new Promise((done) => {
    resolve = done;
  });
  const actions = {
    run: () => ready,
    cancel: () => state.events.push(['cancel']),
    finish: () => state.events.push(['finish']),
  };
  state.transition.begin(selection, actions);
  state.transition.begin(selection, actions);
  state.transition.complete('interior-design-original');
  state.frames.shift()();
  state.frames.shift()();
  await Promise.resolve();
  assert.ok(!state.events.some(([event]) => event === 'commit' || event === 'navigate'));
  resolve();
  await new Promise(setImmediate);
  assert.deepEqual(state.events.slice(-4), [
    ['commit', selection.id],
    ['finish'],
    ['clear'],
    ['hide'],
  ]);
  assert.equal(state.timers.size, 0);
});

test('failed live switch retries in place and back invalidates a late completion', async () => {
  const state = fixture();
  let resolve;
  let attempts = 0;
  const actions = {
    run() {
      attempts++;
      if (attempts === 1) {
        return Promise.reject(new Error('Missing texture'));
      }
      return new Promise((done) => {
        resolve = done;
      });
    },
    cancel: () => state.events.push(['cancel']),
    finish: () => state.events.push(['finish']),
  };
  state.transition.begin(selection, actions);
  state.frames.shift()();
  state.frames.shift()();
  await new Promise(setImmediate);
  assert.deepEqual(state.events.at(-1), ['error']);
  state.callbacks.onRetry();
  state.frames.shift()();
  state.frames.shift()();
  await Promise.resolve();
  state.callbacks.onBack();
  resolve();
  await new Promise(setImmediate);
  assert.equal(attempts, 2);
  assert.ok(
    !state.events.some(([event]) => ['navigate', 'retry', 'back', 'commit'].includes(event)),
  );
  assert.deepEqual(state.events.slice(-3), [['cancel'], ['hide'], ['finish']]);
});

test('cached switch completes without flashing a loading card or waiting for handoff frames', async () => {
  const state = fixture();
  state.transition.begin(selection, {
    quick: true,
    run: () => Promise.resolve(),
    cancel() {},
    finish() {},
  });
  assert.equal(state.frames.length, 0);
  await new Promise(setImmediate);
  assert.ok(!state.events.some(([event]) => event === 'loading' || event === 'navigate'));
  assert.ok(state.events.some(([event]) => event === 'commit'));
  assert.equal(state.timers.size, 0);
});
