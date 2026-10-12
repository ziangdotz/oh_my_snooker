import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { absolute, LAYOUT } from '../../config/project.config.mjs';

test('browser compatibility boundary keeps telemetry disabled and records errors passively', async () => {
  const listeners = new Map();
  const window = {
    addEventListener(name, handler) {
      listeners.set(name, handler);
    },
    fetch() {
      throw new Error('Compatibility boundary must not request network resources');
    },
  };
  const originalFetch = window.fetch;
  vm.runInNewContext(await readFile(absolute(`${LAYOUT.compatibility}/browser.js`), 'utf8'), {
    window,
  });
  assert.equal(typeof window.gtag, 'function');
  window.gtag('event', 'test');
  assert.equal(window.fetch, originalFetch);
  assert.ok(Object.isFrozen(window.PCOLCompatibility));
  const diagnostics = window.PCOLCompatibility.diagnostics;
  listeners.get('error')({ target: window, message: 'page error' });
  listeners.get('error')({ target: { src: '/missing.png' } });
  listeners.get('unhandledrejection')({ reason: 'rejection' });
  assert.deepEqual(Array.from(diagnostics.errors), ['page error', 'rejection']);
  assert.deepEqual(Array.from(diagnostics.resourceFailures), ['/missing.png']);
});
