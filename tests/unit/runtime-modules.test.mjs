import test from 'node:test';
import assert from 'node:assert/strict';
import createModuleLoader from '../../src/runtime/module-loader.js';
import legacyFactory from '../../src/compatibility/legacy-factory.js';

test('source loading preserves legacy UMD globals without changing factory bytes', () => {
  function factory(module) {
    module.exports = (function () {
      return this;
    })();
  }
  assert.equal(factory({}), undefined);
  const adapted = legacyFactory(factory);
  const module = {};
  adapted.call(module.exports, module);
  assert.equal(module.exports, globalThis);
  assert.equal(adapted.toString(), factory.toString());
});

test('source bundle transport deduplicates concurrent loads and retries incomplete registration', async () => {
  let attempts = 0;
  const loader = createModuleLoader(
    { game: 'game' },
    {
      async loadFactories(id, register) {
        attempts++;
        if (attempts === 1) {
          return;
        }
        register(id, {
          game(module) {
            module.exports = 'ready';
          },
        });
      },
    },
  );
  await Promise.all([
    assert.rejects(loader.require.e('game'), /did not register/),
    assert.rejects(loader.require.e('game'), /did not register/),
  ]);
  assert.equal(attempts, 1);
  await loader.require.e('game');
  assert.equal(loader.require('game'), 'ready');
  await loader.require.e('game');
  assert.equal(attempts, 2);
});

test('named modules retain circular exports, receiver and singleton initialization', () => {
  const loader = createModuleLoader({ bootstrap: './bootstrap.js' });
  let launches = 0;
  loader.register('bootstrap', {
    alpha(module, exports, require) {
      assert.equal(this, exports);
      launches++;
      exports.name = 'alpha';
      exports.peer = require('beta');
    },
    beta(module, exports, require) {
      exports.peer = require('alpha');
    },
  });
  const alpha = loader.require('alpha');
  assert.equal(alpha.peer.peer, alpha);
  assert.equal(loader.require('alpha'), alpha);
  assert.equal(launches, 1);
  assert.throws(() => loader.require('unknown'), /Unknown runtime module/);
});

test('live default exports remain live and failed initialization can retry', () => {
  const loader = createModuleLoader({ bootstrap: './bootstrap.js' });
  let attempts = 0;
  loader.register('bootstrap', {
    unstable(module) {
      if (++attempts === 1) {
        throw new Error('temporary initialization failure');
      }
      module.exports = { ready: true };
    },
    named(_module, exports, require) {
      require.r(exports);
      exports.default = 'first';
    },
  });
  assert.throws(() => loader.require('unstable'), /temporary initialization failure/);
  assert.deepEqual(loader.require('unstable'), { ready: true });
  const exports = loader.require('named');
  const defaultExport = loader.require.n(exports);
  assert.equal(defaultExport.a, 'first');
  exports.default = 'second';
  assert.equal(defaultExport.a, 'second');
});

test('concurrent script loading is deduplicated, validates registration and recovers from errors', async (t) => {
  const previous = globalThis.document;
  t.after(() => {
    if (previous === undefined) {
      delete globalThis.document;
    } else {
      globalThis.document = previous;
    }
  });
  const scripts = [];
  globalThis.document = {
    createElement() {
      return {
        removed: false,
        remove() {
          this.removed = true;
        },
      };
    },
    head: {
      appendChild(script) {
        scripts.push(script);
      },
    },
  };
  const loader = createModuleLoader({ bootstrap: './bootstrap.js', game: './game.js' });
  loader.register('bootstrap', {});
  const first = loader.require.e('game');
  const concurrent = loader.require.e('game');
  assert.equal(scripts.length, 1);
  scripts[0].onerror();
  await assert.rejects(first, /failed to load/);
  await assert.rejects(concurrent, /failed to load/);
  assert.equal(scripts[0].removed, true);
  assert.equal(scripts[0].onload, null);
  const retry = loader.require.e('game');
  loader.register('game', {
    game(module) {
      module.exports = 'ready';
    },
  });
  scripts[1].onload();
  await retry;
  assert.equal(loader.require('game'), 'ready');
  await loader.require.e('game');
  assert.equal(scripts.length, 2);
  await assert.rejects(loader.require.e('unknown'), /Unknown runtime bundle/);
  assert.throws(() => loader.register('game', {}), /duplicate runtime bundle/);
});
