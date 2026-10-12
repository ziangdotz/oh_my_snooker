import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { compileFactoryModules } from '../../tooling/build/module-compiler.mjs';
import {
  assembleRuntime,
  assertDependencyBoundary,
  verifyAssetReferences,
} from '../../tooling/build/runtime-assembly.mjs';

test('source compilation preserves lazy class construction and live injected state', () => {
  const sources = new Map([
    [
      'src/application/main.js',
      "import createCounter from '../domain/counter.js'; export default function(module) { let value = 1; const Counter = createCounter({ get value() { return value; } }); module.exports = { counter: new Counter(), update(next) { value = next; } }; }",
    ],
    [
      'src/domain/counter.js',
      'export default function(dependencies) { return class Counter { read() { return dependencies.value; } }; }',
    ],
  ]);
  const compiled = compileFactoryModules(sources, ['src/application/main.js']);
  const factory = runInNewContext(
    `const sourceFactories = {}; ${compiled.code} sourceFactories['src/application/main.js'];`,
  );
  const module = {};
  factory(module);
  assert.equal(module.exports.counter.read(), 1);
  module.exports.update(2);
  assert.equal(module.exports.counter.read(), 2);
});

test('compiler rejects missing, cyclic, external and unsupported module imports', () => {
  const compile = (entries) => compileFactoryModules(new Map(entries), ['src/main.js']);
  assert.throws(
    () => compile([['src/main.js', "import f from './absent.js'; export default function() {}"]]),
    /Missing module source/,
  );
  assert.throws(
    () => compile([['src/main.js', "import f from './main.js'; export default function() {}"]]),
    /Circular source import/,
  );
  assert.throws(
    () => compile([['src/main.js', "import f from 'node:fs'; export default function() {}"]]),
    /must be relative/,
  );
  assert.throws(
    () => compile([['src/main.js', 'export const value = 1;']]),
    /Unsupported top-level/,
  );
});

test('compatibility ES modules compile through imports and reject unused implementations', () => {
  const catalog = {
    schemaVersion: 1,
    entry: 'main',
    bundles: { bootstrap: 'scripts/main.js' },
    modules: [{ id: 'main', source: 'src/main.js', bundle: 'bootstrap', dependencies: [] }],
  };
  const sources = new Map([
    [
      'src/main.js',
      "import recover from './compatibility/recover.js'; export default function(module) { module.exports = recover(); }",
    ],
    ['src/compatibility/recover.js', 'export default function() { return 42; }'],
    ['src/runtime/module-loader.js', 'export default function() {}'],
  ]);
  const runtime = assembleRuntime(catalog, sources);
  assert.ok(runtime.sourceFiles.includes('src/compatibility/recover.js'));
  assert.ok(runtime.outputs.get('scripts/main.js').toString().includes('return 42;'));
  sources.set('src/compatibility/unused.js', 'export default function() {}');
  assert.throws(() => assembleRuntime(catalog, sources), /Unregistered runtime source/);
});

test('dependency validation resolves the loader binding and rejects domain I/O', () => {
  const catalog = {
    schemaVersion: 1,
    entry: 'main',
    bundles: { bootstrap: 'scripts/main.js' },
    modules: [{ id: 'main', source: 'src/main.js', bundle: 'bootstrap', dependencies: [] }],
  };
  const sources = new Map([
    [
      'src/main.js',
      "export default function(module, exports, loadModule) { function inspect(loadModule) { return loadModule('test-only-value'); } module.exports = inspect(value => value); }",
    ],
    ['src/runtime/module-loader.js', 'export default function() {}'],
  ]);
  assert.doesNotThrow(() => assembleRuntime(catalog, sources));
  sources.set(
    'src/main.js',
    "export default function(module, exports, readModule) { module.exports = readModule('missing'); }",
  );
  assert.throws(() => assembleRuntime(catalog, sources), /Dependency catalog differs/);
  assert.throws(
    () => assertDependencyBoundary('src/domain/world.js', 'src/presentation/view.js'),
    /Domain dependency violation/,
  );
  assert.throws(
    () => assertDependencyBoundary('src/shared/data.js', 'src/infrastructure/network.js'),
    /Shared dependency violation/,
  );
});

test('resource references cover CSS suffixes, model textures, collision atlases and shader pairs', () => {
  const outputs = new Map([
    ['index.html', Buffer.from('<link href="./styles/game.css">')],
    ['styles/game.css', Buffer.from('body{background:url(../assets/atlas.png?v=1#image)}')],
    ['assets/atlas.png', Buffer.from('asset')],
    [
      'assets/models/table.babylon',
      Buffer.from('{"materials":[{"diffuseTexture":{"name":"../atlas.png"}}]}'),
    ],
    ['assets/collision/table.json', Buffer.from('{"side":{"nt":"../atlas.png"}}')],
    ['assets/shaders/power-view.vertex.fx', Buffer.from('shader')],
    ['assets/shaders/power-view.fragment.fx', Buffer.from('shader')],
  ]);
  const sources = new Map([
    [
      'src/view.js',
      "export default function(dependencies) { return new dependencies.UiShaderMaterial('power', {}, 'power-view'); }",
    ],
  ]);
  assert.equal(verifyAssetReferences(outputs, sources).length, 6);
  outputs.delete('assets/atlas.png');
  assert.throws(() => verifyAssetReferences(outputs, sources), /Missing asset reference/);
  outputs.set('assets/atlas.png', Buffer.from('asset'));
  outputs.delete('assets/shaders/power-view.fragment.fx');
  assert.throws(() => verifyAssetReferences(outputs, sources), /power-view.fragment.fx/);
});

test('stylesheet imports participate in asset validation', () => {
  const outputs = new Map([
    ['styles/game.css', Buffer.from("@import url('./typography.css');")],
    ['styles/typography.css', Buffer.from('body { color: white; }')],
  ]);
  assert.deepEqual(verifyAssetReferences(outputs, new Map()), [
    { from: 'styles/game.css', to: 'styles/typography.css', kind: 'asset' },
  ]);
  outputs.delete('styles/typography.css');
  assert.throws(() => verifyAssetReferences(outputs, new Map()), /Missing asset reference/);
});

test('native ESM imports cannot bypass domain and shared dependency boundaries', () => {
  for (const [from, to, error] of [
    ['src/domain/test.js', 'src/presentation/view.js', /Domain dependency violation/],
    ['src/shared/test.js', 'src/infrastructure/request.js', /Shared dependency violation/],
  ]) {
    const sources = new Map([
      [
        from,
        `import dependency from '${to.replace('src/', '../')}'; export default function() { return dependency; }`,
      ],
      [to, 'export default function() {}'],
    ]);
    assert.throws(() => compileFactoryModules(sources, [from]), error);
  }
});

test('scene collision definitions are validated before publication', () => {
  const sources = new Map([
    [
      'src/domain/scene/scene-definitions.js',
      "export default function(module) { module.exports = { table: { rgb: 'table.json' } }; }",
    ],
  ]);
  const outputs = new Map([['assets/collision/table.json', Buffer.from('{}')]]);
  assert.deepEqual(verifyAssetReferences(outputs, sources), [
    {
      from: 'src/domain/scene/scene-definitions.js',
      to: 'assets/collision/table.json',
      kind: 'asset',
    },
  ]);
  outputs.clear();
  assert.throws(() => verifyAssetReferences(outputs, sources), /Missing asset reference/);
});
