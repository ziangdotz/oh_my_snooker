import assert from 'node:assert/strict';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ROOT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import { sha256 } from '../../tooling/lib/integrity.mjs';
import { DESIGN_IDS } from '../../tooling/lib/artifact-paths.mjs';
import { waitForActiveBasicGuide } from '../helpers/game-ui-actions.mjs';
import { waitForCamera, captureFailure } from './browser-observations.mjs';
import {
  browserCandidates,
  launchTestBrowser,
  createRuntimeFixture,
  inspectRuntimeRoute,
  waitForHome,
  openVenueDrawer,
} from '../helpers/runtime-fixture.mjs';

const output = path.join(ROOT, 'artifacts/testing/interior-switching');
await mkdir(output, { recursive: true });
const fixture = await createRuntimeFixture();
const report = {
  date: new Date().toISOString(),
  viewport: { width: 960, height: 600 },
  buildManifestHashes: Object.fromEntries(
    await Promise.all(
      ['development', 'production'].map(async (target) => [
        target,
        sha256(await readFile(path.join(ROOT, BUILD_OUTPUTS[target], 'build-manifest.json'))),
      ]),
    ),
  ),
  targets: [],
  passed: false,
  method:
    'Actual drawer clicks; time through scene readiness and interactive menu. Exact framebuffer comparison against fresh direct loads in the same browser, with native clock and rendering.',
  limitations: [
    'Headless browser timing is specific to this machine; it does not guarantee performance on other devices.',
  ],
};
async function pixels(page) {
  const encoded = await page.evaluate(() => {
    const game = window.__pcolTestGame;
    const scene = game._gView._scene;
    scene.render();
    scene.render();
    const gl = game._engine._gl;
    const bytes = new Uint8Array(
      game._engine.getRenderWidth() * game._engine.getRenderHeight() * 4,
    );
    gl.readPixels(
      0,
      0,
      game._engine.getRenderWidth(),
      game._engine.getRenderHeight(),
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      bytes,
    );
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 16384) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
    }
    return window.btoa(binary);
  });
  return Buffer.from(encoded, 'base64');
}
async function closeGuide(page) {
  await waitForActiveBasicGuide(page);
  const guide = page.locator('.controls-guide-box:visible');
  if (await guide.count()) {
    await guide.getByRole('button', { name: 'CLOSE', exact: true }).click();
    await guide.waitFor({ state: 'hidden' });
  }
  await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
}
try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of fixture.targets.filter(
        (entry) => !process.argv.includes('--source') || entry.name === 'source',
      )) {
        const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.route('**/*', async (route) => {
          assert.equal(new URL(route.request().url()).origin, target.origin);
          if (!(await inspectRuntimeRoute(route, target))) {
            await route.continue();
          }
        });
        const result = {
          browser: candidate.name,
          target: target.name,
          switches: [],
          comparisons: [],
          passed: false,
        };
        report.targets.push(result);
        const references = new Map();
        for (const id of DESIGN_IDS) {
          await page.goto(target.origin + '/?interior=' + id);
          await waitForHome(page, id);
          references.set(id, await pixels(page));
        }
        await page.goto(target.origin + '/?interior=interior-design-original&diagnostics=1#room');
        await waitForHome(page, DESIGN_IDS[0]);
        await page.evaluate(() => {
          const game = window.__pcolTestGame;
          window.__venueIdentity = {
            game,
            engine: game._engine,
            scene: game._gView._scene,
            table: game._gView._scene.getMeshByName('Frame'),
            balls: [...game._gView.ballMeshes],
            timeOrigin: performance.timeOrigin,
          };
        });
        let cachedCounts;
        for (const index of [1, 2, 3, 0, 1, 2, 3, 0, 1]) {
          const id = DESIGN_IDS[index];
          await openVenueDrawer(page);
          await page.evaluate(() => {
            window.__venueLoadingFlashes = 0;
            window.__venueLoadingObserver = new window.MutationObserver(() => {
              if (!document.querySelector('.interior-transition').hidden) {
                window.__venueLoadingFlashes++;
              }
            });
            window.__venueLoadingObserver.observe(document.querySelector('.interior-transition'), {
              attributes: true,
            });
          });
          const requests = [];
          const onRequest = (request) => requests.push(new URL(request.url()).pathname);
          page.on('request', onRequest);
          const start = performance.now();
          await page.locator('[data-design-id="' + id + '"]').evaluate((button) => {
            button.click();
            button.click();
          });
          await page.waitForURL((url) => url.searchParams.get('interior') === id);
          const sceneReadyMs = performance.now() - start;
          assert.equal(
            await page.evaluate(() => {
              const controller = window.__pcolTestGame._currentController;
              return !controller._interiorDialog._closing || controller._homeMainMenu.element.inert;
            }),
            true,
            'Menu input unlocked before the drawer finished closing',
          );
          await waitForHome(page, id);
          page.off('request', onRequest);
          const elapsedMs = performance.now() - start;
          const loadingFlashes = await page.evaluate(() => {
            window.__venueLoadingObserver.disconnect();
            return window.__venueLoadingFlashes;
          });
          if (result.switches.length >= 3) {
            assert.equal(loadingFlashes, 0, 'Cached switch flashed a loading card');
          }
          const state = await page.evaluate(() => {
            const game = window.__pcolTestGame;
            const scene = game._gView._scene;
            const old = window.__venueIdentity;
            return {
              identities:
                old.game === game &&
                old.engine === game._engine &&
                old.scene === scene &&
                old.table === scene.getMeshByName('Frame') &&
                old.balls.every((ball, index) => ball === game._gView.ballMeshes[index]) &&
                old.timeOrigin === performance.timeOrigin,
              activeRooms: [
                ...new Set(
                  scene.meshes
                    .filter(
                      (mesh) => mesh.isEnabled() && /^interior-design-00[123]-/.test(mesh.name),
                    )
                    .map((mesh) => mesh.name.slice(0, 19)),
                ),
              ],
              activeLights: scene.lights.filter(
                (light) => light.isEnabled() && light.name.startsWith('interior-design-'),
              ).length,
              counts: [
                scene.meshes.length,
                scene.materials.length,
                scene.textures.length,
                scene.lights.length,
                game._engine.onResizeObservable._observers.length,
                game._engine.onContextRestoredObservable._observers.length,
              ],
            };
          });
          assert.equal(state.identities, true);
          assert.equal(state.activeRooms.length, index === 0 ? 0 : 1);
          assert.equal(state.activeLights, index === 0 ? 0 : 8);
          assert.equal(new URL(page.url()).searchParams.get('diagnostics'), '1');
          assert.equal(new URL(page.url()).hash, '#room');
          assert.ok(
            !requests.some((url) => /\.(?:js|mjs|babylon|woff2?)$/.test(url)),
            'Shared runtime/model/font fetched again',
          );
          if (result.switches.length === 3) {
            cachedCounts = state.counts;
          }
          if (result.switches.length > 3) {
            assert.deepEqual(
              state.counts,
              cachedCounts,
              'Cached rooms accumulated resources or listeners',
            );
          }
          const actual = await pixels(page);
          const reference = references.get(id);
          let changedChannels = 0;
          for (let channel = 0; channel < actual.length; channel++) {
            if (actual[channel] !== reference[channel]) {
              changedChannels++;
            }
          }
          result.comparisons.push({
            id,
            changedChannels,
            sha256: sha256(actual),
            referenceSHA256: sha256(reference),
          });
          assert.equal(changedChannels, 0, 'Switched room differs from direct load: ' + id);
          result.switches.push({
            id,
            elapsedMs,
            sceneReadyMs,
            requests,
            loadingFlashes,
            cached: result.switches.length >= 3,
          });
          console.log(
            candidate.name +
              ' ' +
              target.name +
              ' ' +
              id +
              ': ' +
              Math.round(elapsedMs) +
              'ms, exact pixels and persistent scene',
          );
        }
        // Restore a scene with all four cached rooms, then use an inactive room.
        await page.evaluate(async () => {
          const game = window.__pcolTestGame;
          const engine = game._engine;
          const scene = game._gView._scene;
          const extension = engine._gl.getExtension('WEBGL_lose_context');
          if (!extension) {
            throw new Error('Context loss unavailable');
          }
          const lost = new Promise((resolve) => {
            const observer = engine.onContextLostObservable.add(() => {
              engine.onContextLostObservable.remove(observer);
              resolve();
            });
          });
          const restored = new Promise((resolve) => {
            const observer = engine.onContextRestoredObservable.add(() => {
              engine.onContextRestoredObservable.remove(observer);
              resolve();
            });
          });
          extension.loseContext();
          await lost;
          await new Promise((resolve) => setTimeout(resolve, 100));
          extension.restoreContext();
          await restored;
          while (
            scene.textures.some((texture) => !texture.isReady()) ||
            Object.values(engine._compiledEffects).some((effect) => !effect.isReady())
          ) {
            await new Promise((resolve) => window.requestAnimationFrame(resolve));
          }
        });
        await waitForHome(page, DESIGN_IDS[1]);
        assert.equal(
          sha256(await pixels(page)),
          sha256(references.get(DESIGN_IDS[1])),
          'Active cached room changed after context restoration',
        );
        await openVenueDrawer(page);
        await page.locator('[data-design-id="' + DESIGN_IDS[3] + '"]').click();
        await waitForHome(page, DESIGN_IDS[3]);
        assert.equal(
          sha256(await pixels(page)),
          sha256(references.get(DESIGN_IDS[3])),
          'Inactive cached room changed after context restoration',
        );
        result.cachedContextRestoration = true;
        await page.screenshot({
          path: path.join(output, candidate.name + '-' + target.name + '-cached-gallery.png'),
        });
        if (candidate.name === 'chrome' && target.name === 'source') {
          await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
          await page.waitForFunction(
            () =>
              window.__pcolTestGame._currentController.name === 'game' &&
              window.__pcolTestGame._currentController.state === 3,
          );
          await closeGuide(page);
          await waitForCamera(page);
          const point = await page.evaluate(() => {
            const game = window.__pcolTestGame;
            const B = window.__pcolTestRequire('adapters/rendering/babylon-engine');
            const view = game._gView;
            const point = B.Vector3.Project(
              new B.Vector3(-1.18, 0.02625, 0.12).add(view._playArea.position),
              B.Matrix.Identity(),
              view._scene.getTransformMatrix(),
              view._scene.activeCamera.viewport.toGlobal(
                game._engine.getRenderWidth(),
                game._engine.getRenderHeight(),
              ),
            );
            return { x: point.x, y: point.y };
          });
          await page.mouse.move(point.x, point.y);
          try {
            await page.waitForFunction(() => {
              const control = window.__pcolTestGame._currentController._activeSubControl;
              return control._isValidSpot && !control._needsUpdate;
            });
          } catch (error) {
            await captureFailure(
              [{ page, routeName: target.name, observations: { point } }],
              output,
              'cached-practice',
              error,
              'place-cue',
            );
            const diagnostic = await page.evaluate((point) => {
              const c = window.__pcolTestGame._currentController._activeSubControl;
              return {
                name: c.name,
                mouse: [c._mouseX, c._mouseY],
                spot: [c._spot.x, c._spot.y, c._spot.z],
                needsUpdate: c._needsUpdate,
                valid: c._isValidSpot,
                hit: document.elementFromPoint(point.x, point.y)?.outerHTML.slice(0, 400),
              };
            }, point);
            console.log(JSON.stringify(diagnostic));
            throw error;
          }
          await page.mouse.down();
          await page.mouse.up();
          await page.waitForFunction(
            () => window.__pcolTestGame._currentController._activeSubControl.name === 'gaming',
          );
          await closeGuide(page);
          await page.locator('#game-view').focus();
          await page.keyboard.press('w');
          await page.waitForFunction(() =>
            window.__pcolTestGame._currentController._playerCtls[0].isReadyToStroke(),
          );
          await closeGuide(page);
          await page.locator('#game-view').focus();
          await page.keyboard.press('Space');
          await page.waitForFunction(
            () => window.__pcolTestGame._currentController._model.getContext('nRounds') === 1,
            null,
            { timeout: 45000 },
          );
          assert.equal(
            await page.evaluate(
              () => window.__pcolTestGame._currentController._model.players[0].shootingCount,
            ),
            1,
          );
          result.realStrokeAfterCachedRestoration = true;
        }
        assert.deepEqual(errors, []);
        result.passed = true;
        await page.close();
      }
    } finally {
      await browser.close();
    }
  }
  report.passed = true;
} finally {
  await writeFile(
    path.join(ROOT, 'reports/validation/interior-switching.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await fixture.close();
}
