import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { setTimeout, clearTimeout, setImmediate } from 'node:timers';
import pageFontsModule from '../../src/presentation/typography/page-fonts.js';

function service(fonts, timers = { setTimeout, clearTimeout }) {
  const module = {};
  runInNewContext('(' + pageFontsModule.toString() + ')(module)', {
    module,
    document: { fonts },
    ...timers,
  });
  return module.exports;
}

test('startup and view share one readiness promise and wait for both real faces', async () => {
  const requests = [];
  const pending = [];
  const fonts = service({
    load(face) {
      requests.push(face);
      return new Promise((resolve) => pending.push(resolve));
    },
  });
  const startup = fonts.ready();
  assert.equal(fonts.ready(), startup);
  await Promise.resolve();
  assert.deepEqual(requests, [
    '600 16px "Saira ExtraCondensed SemiBold"',
    '700 16px "Saira ExtraCondensed Bold"',
  ]);
  let complete = false;
  startup.then(() => {
    complete = true;
  });
  pending[0]([{}]);
  await Promise.resolve();
  assert.equal(complete, false);
  pending[1]([{}]);
  assert.equal(await startup, 'ready');
  assert.equal(fonts.ready(), startup);
  assert.equal(requests.length, 2);
});

test('stalled fonts settle to fallback once, without changing when a late face arrives', async () => {
  let timeout;
  const resolveFonts = [];
  let cleared = false;
  const fonts = service(
    {
      load: () =>
        new Promise((resolve) => {
          resolveFonts.push(resolve);
        }),
    },
    {
      setTimeout(callback, milliseconds) {
        assert.equal(milliseconds, 10000);
        timeout = callback;
        return 1;
      },
      clearTimeout() {
        cleared = true;
      },
    },
  );
  const ready = fonts.ready();
  await Promise.resolve();
  timeout();
  assert.equal(await ready, 'fallback');
  resolveFonts.forEach((resolve) => resolve([{}]));
  await new Promise(setImmediate);
  assert.equal(await fonts.ready(), 'fallback');
  assert.equal(cleared, true);
});

test('font failure, absent faces and unavailable API produce a stable fallback result', async () => {
  for (const load of [
    () => Promise.reject(new Error('missing font')),
    () => Promise.resolve([]),
    () => {
      throw new Error('font API failure');
    },
  ]) {
    const fonts = service({ load });
    assert.equal(await fonts.ready(), 'fallback');
    assert.equal(await fonts.ready(), 'fallback');
  }
  assert.equal(await service(undefined).ready(), 'fallback');
});
