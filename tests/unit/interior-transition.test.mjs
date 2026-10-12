import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
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
      assert.equal(duration, 45000);
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
