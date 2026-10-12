import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { parse } from 'espree';

const html = await readFile(
  new URL('../../docs/development/rooms-panel-prototype.html', import.meta.url),
  'utf8',
);
const source = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
const extract = (node) => source.slice(...node.range);
const declaration = (name) =>
  ast.body
    .filter((node) => node.type === 'VariableDeclaration')
    .flatMap((node) => node.declarations)
    .find((node) => node.id.name === name);
const functions = ['updateVenueBackground', 'loadSceneImage', 'transitionScene']
  .map((name) =>
    extract(ast.body.find((node) => node.type === 'FunctionDeclaration' && node.id.name === name)),
  )
  .join('\n');
const venueSource = (index) =>
  `../../src/assets/images/interior-design-${['original', '001', '002', '003'][index]}-preview.jpg`;
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
async function flush() {
  for (let index = 0; index < 12; index += 1) {
    await Promise.resolve();
  }
}
function fixture(reduced = false) {
  const loads = [];
  const animations = [];
  const state = { view: 'hotseat', venue: 1, names: ['Alice', 'Bob'] };
  const sceneNote = { hidden: true, textContent: '' };
  const sceneRetry = { hidden: true };
  const sceneLayers = [0, 1].map((index) => {
    const img = { src: index === 0 ? venueSource(1) : '', decode: () => Promise.resolve() };
    return {
      style: { opacity: index === 0 ? '1' : '0' },
      dataset: { kind: index === 0 ? 'venue' : '' },
      querySelector: () => img,
      animate(frames, options) {
        const done = deferred();
        const animation = {
          finished: done.promise,
          frames,
          options,
          finish: done.resolve,
          cancel() {},
        };
        animations.push(animation);
        return animation;
      },
    };
  });
  class Image {
    decode() {
      const done = deferred();
      loads.push({ image: this, ...done });
      return done.promise;
    }
  }
  const backgroundMotion = { matches: reduced };
  const context = vm.createContext({
    state,
    sceneNote,
    sceneRetry,
    sceneLayers,
    sceneImages: new Map(),
    Image,
    backgroundMotion,
  });
  vm.runInContext(
    `const venues = ${extract(declaration('venues').init)}; const background = ${extract(declaration('background').init)};` +
      functions,
    context,
  );
  return {
    state,
    sceneNote,
    sceneRetry,
    sceneLayers,
    loads,
    animations,
    context,
    update: context.updateVenueBackground,
    background: vm.runInContext('background', context),
  };
}
test('background keeps the old frame until decode and fades only the prepared new frame', async () => {
  const f = fixture();
  f.state.venue = 2;
  const pending = f.update();
  assert.equal(f.background.key, 'venue:' + venueSource(1));
  assert.equal(f.sceneLayers[0].style.opacity, '1');
  assert.equal(f.animations.length, 0);
  f.loads[0].resolve();
  await flush();
  assert.equal(f.animations.length, 1);
  assert.equal(f.animations[0].options.duration, 220);
  assert.equal(f.sceneLayers[0].style.opacity, '1');
  assert.equal(f.background.key, 'venue:' + venueSource(1));
  f.animations[0].finish();
  assert.equal(await pending, true);
  assert.equal(f.background.key, 'venue:' + venueSource(2));
  assert.equal(f.sceneLayers[1].style.opacity, '1');
  assert.equal(f.sceneLayers[0].style.opacity, '0');
  assert.deepEqual(f.state.names, ['Alice', 'Bob']);
});
test('rapid out-of-order image completion cannot overwrite the latest venue', async () => {
  const f = fixture(true);
  f.state.venue = 0;
  const old = f.update();
  f.state.venue = 3;
  const latest = f.update();
  f.loads[1].resolve();
  assert.equal(await latest, true);
  f.loads[0].resolve();
  assert.equal(await old, false);
  assert.equal(f.background.key, 'venue:' + venueSource(3));
  assert.equal(f.animations.length, 0);
});
test('returning to the visible selection invalidates an unfinished image request', async () => {
  const f = fixture(true);
  f.state.venue = 2;
  const stale = f.update();
  f.state.venue = 1;
  assert.equal(await f.update(), true);
  f.loads[0].resolve();
  assert.equal(await stale, false);
  assert.equal(f.background.key, 'venue:' + venueSource(1));
  assert.equal(f.sceneLayers[0].style.opacity, '1');
});
test('an active fade finishes before the newest ready frame; intermediate clicks do not play back', async () => {
  const f = fixture();
  f.state.venue = 0;
  const first = f.update();
  f.loads[0].resolve();
  await flush();
  f.state.venue = 2;
  const skipped = f.update();
  f.loads[1].resolve();
  await flush();
  f.state.venue = 3;
  const final = f.update();
  f.loads[2].resolve();
  await flush();
  assert.equal(f.animations.length, 1);
  f.animations[0].finish();
  await flush();
  assert.equal(f.animations.length, 2);
  assert.equal(await first, false);
  assert.equal(await skipped, false);
  f.animations[1].finish();
  assert.equal(await final, true);
  assert.equal(f.background.key, 'venue:' + venueSource(3));
  assert.equal(f.background.fade, null);
});
test('decode failures retain the visible frame, expose retry, and retry does not reuse a rejection', async () => {
  const f = fixture(true);
  f.state.venue = 2;
  const failed = f.update();
  f.loads[0].reject(new Error('decode failure'));
  assert.equal(await failed, false);
  assert.equal(f.background.key, 'venue:' + venueSource(1));
  assert.equal(f.sceneNote.hidden, false);
  assert.equal(f.sceneRetry.hidden, false);
  const retry = f.update();
  assert.equal(f.loads.length, 2);
  f.loads[1].resolve();
  assert.equal(await retry, true);
  assert.equal(f.sceneNote.hidden, true);
  assert.equal(f.sceneRetry.hidden, true);
});
test('duplicate pending requests share one decode; decoded frames are cached for return navigation', async () => {
  const f = fixture(true);
  f.state.venue = 2;
  const first = f.update();
  assert.equal(f.update(), first);
  assert.equal(f.loads.length, 1);
  f.loads[0].resolve();
  await first;
  f.state.venue = 1;
  const back = f.update();
  f.loads[1].resolve();
  await back;
  f.state.venue = 2;
  await f.update();
  assert.equal(f.loads.length, 2);
  assert.equal(f.background.key, 'venue:' + venueSource(2));
});
test('game/results use one opening image; late match failures cannot disrupt a menu return', async () => {
  const f = fixture(true);
  f.state.view = 'game';
  const game = f.update();
  assert.ok(f.loads[0].image.src.endsWith('interior-design-001-opening-scene.jpg'));
  f.state.view = 'result';
  assert.equal(f.update(), game);
  f.state.view = 'hotseat';
  await f.update();
  f.loads[0].reject(new Error('missing capture'));
  await game;
  assert.equal(f.sceneNote.hidden, true);
  assert.equal(f.background.key, 'venue:' + venueSource(1));
  f.state.view = 'game';
  const retry = f.update();
  f.loads[1].reject(new Error('missing capture'));
  await retry;
  assert.ok(f.sceneNote.textContent.includes('node scripts/capture-match-opening.mjs'));
  const recovered = f.update();
  f.loads[2].resolve();
  await recovered;
  assert.equal(f.sceneLayers[f.background.active].dataset.kind, 'match');
  f.state.view = 'result';
  await f.update();
  assert.equal(f.loads.length, 3);
});
test('turning on reduced motion finishes an already active fade', async () => {
  const f = fixture();
  f.state.venue = 2;
  const pending = f.update();
  f.loads[0].resolve();
  await flush();
  const listener = ast.body.find(
    (node) =>
      node.type === 'ExpressionStatement' &&
      node.expression.type === 'CallExpression' &&
      node.expression.callee.object?.name === 'backgroundMotion',
  );
  const change = vm.runInContext(`(${extract(listener.expression.arguments[1])})`, f.context);
  f.context.backgroundMotion.matches = true;
  change({ matches: true });
  await pending;
  assert.equal(f.background.animation, null);
  assert.equal(f.background.fade, null);
});
