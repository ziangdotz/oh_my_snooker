import assert from 'node:assert/strict';
import path from 'node:path';
import { clearTimeout } from 'node:timers';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import {
  browserCandidates,
  createRuntimeFixture,
  inspectRuntimeRoute,
  launchTestBrowser,
  waitForHome,
} from '../helpers/runtime-fixture.mjs';

const directory = path.join(ROOT, 'artifacts/testing/interior-shadow-cache');
const model = JSON.parse(
  await readFile(
    path.join(ROOT, 'src/assets/models/interior-design-original-room.babylon'),
    'utf8',
  ),
);
const modelNames = model.meshes.map((mesh) => mesh.name);
await mkdir(directory, { recursive: true });
const fixture = await createRuntimeFixture();
const report = { date: new Date().toISOString(), targets: [], passed: false };
async function captureCanvas(page) {
  const pixels = await page.evaluate(() => {
    const game = window.__pcolTestGame;
    game._gView._scene.render();
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
    return {
      raw: window.btoa(binary),
      png: game._engine.getRenderingCanvas().toDataURL('image/png').split(',')[1],
    };
  });
  const raw = Buffer.from(pixels.raw, 'base64');
  raw.png = Buffer.from(pixels.png, 'base64');
  assert.ok(
    raw.some((value) => value !== 0),
    'Empty framebuffer',
  );
  return raw;
}
async function withRecoveryDeadline(action) {
  let timer;
  try {
    return await Promise.race([
      action,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Context recovery timed out')), 30000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of fixture.targets) {
        for (const design of [
          'interior-design-001',
          'interior-design-002',
          'interior-design-003',
        ]) {
          const context = await browser.newContext({ viewport: { width: 960, height: 600 } });
          const page = await context.newPage();
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.route('**/*', async (route) => {
            if (!(await inspectRuntimeRoute(route, target))) {
              await route.continue();
            }
          });
          try {
            await page.goto(target.origin + '/?interior=' + design);
            await waitForHome(page, design);
            await page.waitForFunction(
              () => document.getElementById('game-view').style.opacity === '1',
            );
            await page.evaluate(async (modelNames) => {
              const game = window.__pcolTestGame;
              const scene = game._gView._scene;
              game._engine.stopRenderLoop();
              // Exclude animated balls/aim overlays from a static-room pixel oracle.
              for (const mesh of scene.meshes) {
                if (!modelNames.includes(mesh.name) && !mesh.name.startsWith('interior-design-')) {
                  mesh.setEnabled(false);
                }
              }
              const shadows = scene.lights
                .filter((light) => /interior-design-/.test(light.name))
                .map((light) => light.getShadowGenerator())
                .filter(Boolean);
              await Promise.all(shadows.map((shadow) => shadow.forceCompilationAsync()));
              window.__shadowCacheAudit = shadows.map((shadow) => {
                const entry = { shadow, renders: 0, map: null, observer: null };
                const attach = () => {
                  if (entry.map && entry.observer) {
                    entry.map.onBeforeRenderObservable.remove(entry.observer);
                    entry.map.onAfterUnbindObservable.remove(entry.afterObserver);
                  }
                  entry.map = shadow.getShadowMap();
                  entry.observer = entry.map.onBeforeRenderObservable.add(() => {
                    entry.renders++;
                    entry.rendering = true;
                  });
                  entry.afterObserver = entry.map.onAfterUnbindObservable.add(() => {
                    entry.rendering = false;
                  });
                };
                entry.attach = attach;
                attach();
                return entry;
              });
              scene.activeCamera.position.set(-4.5, 1.8, 5);
              scene.activeCamera.lockedTarget.set(0.15, 1.3, 0);
              for (const entry of window.__shadowCacheAudit) {
                entry.map.resetRefreshCounter();
              }
              scene.render();
            }, modelNames);
            const first = await captureCanvas(page);
            const cached = await page.evaluate(() => {
              const scene = window.__pcolTestGame._gView._scene;
              for (let frame = 0; frame < 12; frame++) {
                scene.activeCamera.position.x += 0.01;
                scene.render();
              }
              scene.activeCamera.position.set(-4.5, 1.8, 5);
              scene.render();
              return window.__shadowCacheAudit.map((entry) => ({
                name: entry.map.name,
                renders: entry.renders,
                refreshRate: entry.map.refreshRate,
              }));
            });
            assert.equal(cached.length, 2);
            assert.ok(cached.every((entry) => entry.renders === 1 && entry.refreshRate === 0));
            const moved = await captureCanvas(page);
            assert.ok(first.equals(moved), 'Returning camera changed cached-shadow pixels');
            await page.evaluate(() => {
              const scene = window.__pcolTestGame._gView._scene;
              for (const entry of window.__shadowCacheAudit) {
                entry.map.refreshRate = 1;
              }
              scene.render();
              scene.render();
            });
            const dynamic = await captureCanvas(page);
            assert.ok(first.equals(dynamic), 'Cached shadow differs from full redraw');
            if (candidate.name === 'chrome' && target.name === 'source') {
              await writeFile(path.join(directory, design + '-cached.png'), first.png);
              await writeFile(path.join(directory, design + '-redrawn.png'), dynamic.png);
            }
            // Return to the production mode and verify a real viewport resize invalidates
            // exactly one complete generation, including the filtered shadow texture.
            await page.evaluate(() => {
              for (const entry of window.__shadowCacheAudit) {
                entry.map.refreshRate = 0;
                entry.renders = 0;
              }
            });
            await page.setViewportSize({ width: 1000, height: 620 });
            await page.waitForFunction(() => {
              const engine = window.__pcolTestGame._engine;
              return (
                engine.getRenderWidth() === 1000 &&
                engine.getRenderHeight() === 620 &&
                engine._gl.drawingBufferWidth === 1000 &&
                engine._gl.drawingBufferHeight === 620
              );
            });
            const resized = await page.evaluate(() => {
              const scene = window.__pcolTestGame._gView._scene;
              scene.render();
              scene.render();
              return window.__shadowCacheAudit.map((entry) => entry.renders);
            });
            assert.deepEqual(resized, [1, 1]);
            const resizedPixels = await captureCanvas(page);
            const restored = await withRecoveryDeadline(
              page.evaluate(async () => {
                const game = window.__pcolTestGame;
                const engine = game._engine;
                const scene = game._gView._scene;
                const extension = engine._gl.getExtension('WEBGL_lose_context');
                if (!extension) {
                  throw new Error('Context loss extension unavailable');
                }
                const recovered = new Promise((resolve) => {
                  const observer = engine.onContextRestoredObservable.add(() => {
                    engine.onContextRestoredObservable.remove(observer);
                    resolve();
                  });
                });
                const lost = new Promise((resolve) => {
                  const observer = engine.onContextLostObservable.add(() => {
                    engine.onContextLostObservable.remove(observer);
                    resolve();
                  });
                });
                extension.loseContext();
                await lost;
                await new Promise((resolve) => setTimeout(resolve, 100));
                extension.restoreContext();
                await recovered;
                // Frozen original materials can report scene readiness before the
                // engine's asynchronously rebuilt effects finish compilation.
                await Promise.all(
                  Object.values(engine._compiledEffects).map(
                    (effect) => new Promise((resolve) => effect.executeWhenCompiled(resolve)),
                  ),
                );
                while (scene.textures.some((texture) => !texture.isReady())) {
                  await new Promise((resolve) => window.requestAnimationFrame(resolve));
                }
                await new Promise((resolve) => scene.executeWhenReady(resolve));
                for (const entry of window.__shadowCacheAudit) {
                  entry.renders = 0;
                  entry.attach();
                }
                await Promise.all(
                  window.__shadowCacheAudit.map((entry) => entry.shadow.forceCompilationAsync()),
                );
                scene.render();
                scene.render();
                return window.__shadowCacheAudit.map((entry) => ({
                  renders: entry.renders,
                  refreshRate: entry.map.refreshRate,
                }));
              }),
            );
            assert.deepEqual(restored, [
              { renders: 1, refreshRate: 0 },
              { renders: 1, refreshRate: 0 },
            ]);
            const restoredPixels = await captureCanvas(page);
            const fullScenePreRestoreEqual = resizedPixels.equals(restoredPixels);
            if (!fullScenePreRestoreEqual) {
              const prefix = [candidate.name, target.name, design].join('-');
              await writeFile(path.join(directory, prefix + '-before.rgba'), resizedPixels);
              await writeFile(path.join(directory, prefix + '-restored.rgba'), restoredPixels);
              await writeFile(path.join(directory, prefix + '-before.png'), resizedPixels.png);
              await writeFile(path.join(directory, prefix + '-restored.png'), restoredPixels.png);
            }
            await page.evaluate(() => {
              for (const entry of window.__shadowCacheAudit) {
                entry.map.refreshRate = 1;
              }
            });
            await captureCanvas(page);
            const restoredRedrawnPixels = await captureCanvas(page);
            let changedChannels = 0,
              maxDifference = 0;
            for (let index = 0; index < restoredPixels.length; index++) {
              const difference = Math.abs(restoredPixels[index] - restoredRedrawnPixels[index]);
              changedChannels += difference > 0;
              maxDifference = Math.max(maxDifference, difference);
            }
            assert.ok(
              restoredRedrawnPixels.equals(restoredPixels),
              'Restored cached shadows differ from complete redraw',
            );
            if (candidate.name === 'chrome' && target.name === 'source') {
              await writeFile(
                path.join(directory, design + '-before-context.png'),
                resizedPixels.png,
              );
              await writeFile(
                path.join(directory, design + '-restored-cached.png'),
                restoredPixels.png,
              );
              await writeFile(
                path.join(directory, design + '-restored-redrawn.png'),
                restoredRedrawnPixels.png,
              );
            }
            assert.ok(fullScenePreRestoreEqual, 'Restored room differs from pre-loss pixels');
            const delayed = await page.evaluate(() => {
              const scene = window.__pcolTestGame._gView._scene;
              const entries = window.__shadowCacheAudit;
              for (const entry of entries) {
                entry.renders = 0;
                entry.map.refreshRate = 0;
                entry.map.resetRefreshCounter();
                entry.ready = entry.shadow.isReady;
                entry.delayedCaster = false;
                let defer = true;
                // Delay one caster's readiness on this test instance only. The
                // actual generator must retry its incomplete cached render.
                entry.shadow.isReady = function (...args) {
                  if (defer && entry.rendering) {
                    defer = false;
                    entry.delayedCaster = true;
                    return false;
                  }
                  return entry.ready.apply(this, args);
                };
              }
              try {
                scene.render();
                scene.render();
                scene.render();
                return entries.map((entry) => ({
                  renders: entry.renders,
                  delayedCaster: entry.delayedCaster,
                }));
              } finally {
                for (const entry of entries) {
                  entry.shadow.isReady = entry.ready;
                }
              }
            });
            assert.ok(
              delayed.some((entry) => entry.delayedCaster),
              'No visible caster exercised retry',
            );
            assert.ok(delayed.every((entry) => entry.renders === (entry.delayedCaster ? 2 : 1)));
            const retriedPixels = await captureCanvas(page);
            assert.ok(
              restoredPixels.equals(retriedPixels),
              'Readiness retry retained an incomplete shadow',
            );
            assert.deepEqual(errors, []);
            const result = {
              browser: candidate.name,
              target: target.name,
              design,
              cached,
              pixelEquality: true,
              resize: resized,
              contextRestore: restored,
              contextRestoreCachedEqualsRedrawn: true,
              contextRestorePixelDifference: { changedChannels, maxDifference },
              fullScenePreRestoreEqual,
              delayedReadinessRetry: delayed,
              passed: true,
            };
            report.targets.push(result);
            console.log(
              `${candidate.name} ${target.name} ${design}: static shadows, pixels, resize, context restoration passed`,
            );
          } finally {
            await context.close();
          }
        }
      }
    } finally {
      await browser.close();
    }
  }
  report.passed = true;
} finally {
  await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await fixture.close();
}
