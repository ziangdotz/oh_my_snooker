import assert from 'node:assert/strict';

const baselineIds = Object.freeze({
  'adapters/rendering/babylon-engine': 11,
  'domain/math/vector-three': 12,
  'domain/game/game-state': 15,
  'domain/game/game-records': 19,
  'domain/physics/world': 39,
});

/** Test-only HTTP response rewriting; never included in published builds. */
export function inspectRuntimeEntry(
  source,
  { baseline = false, gameHandle = '__pcolTestGame' } = {},
) {
  assert.match(gameHandle, /^[a-zA-Z_$][a-zA-Z0-9_$]*$/);
  if (baseline) {
    const loader = /i\(i\.s\s*=\s*9\)/;
    const application = /\(new\s*\(0,\s*e\.default\)\)\.launch/;
    assert.equal([...source.matchAll(new RegExp(loader.source, 'g'))].length, 1);
    assert.equal([...source.matchAll(new RegExp(application.source, 'g'))].length, 1);
    return source
      .replace(
        loader,
        `(window.__pcolTestRequire=(id)=>i(${JSON.stringify(baselineIds)}[id]),i(i.s=9))`,
      )
      .replace(application, `((window.${gameHandle}=new (0,e.default))).launch`);
  }
  const loader = 'moduleLoader.require("application/launch-game");';
  const application = 'const application = new GameApplication();';
  assert.equal(source.split(loader).length, 2, 'Runtime launch inspection point drifted');
  assert.equal(source.split(application).length, 2, 'Application inspection point drifted');
  return source
    .replace(loader, `window.__pcolTestRequire = moduleLoader.require;\n${loader}`)
    .replace(application, `const application = window.${gameHandle} = new GameApplication();`);
}

export function runtimeEntryPath(routeName) {
  return routeName === 'baseline' ? 'res/index.js' : 'scripts/runtime-bootstrap.js';
}

/** Native source inspection stays in test HTTP responses, never in src launch code. */
export function inspectSourceEntry(source, { application = false } = {}) {
  const point = application
    ? 'const application = new GameApplication();'
    : 'loader.require(catalog.entry);';
  assert.equal(source.split(point).length, 2, 'Source launch inspection point drifted');
  return source.replace(
    point,
    application
      ? 'const application = window.__pcolTestGame = new GameApplication();'
      : 'window.__pcolTestRequire = loader.require;\n' + point,
  );
}
