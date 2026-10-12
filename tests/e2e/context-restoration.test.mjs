import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout, clearTimeout } from 'node:timers';
import { ROOT } from '../../config/project.config.mjs';
import {
  browserCandidates,
  createRuntimeFixture,
  inspectRuntimeRoute,
  launchTestBrowser,
  waitForHome,
} from '../helpers/runtime-fixture.mjs';
import { confirmGameAction, waitForActiveBasicGuide } from '../helpers/game-ui-actions.mjs';
import { gameState } from './game-recovery.mjs';

const output = path.join(ROOT, 'artifacts/testing/context-restoration');
await mkdir(output, { recursive: true });
const fixture = await createRuntimeFixture();
const smoke = process.argv.includes('--smoke');
const reportFile = path.join(
  ROOT,
  'reports/validation',
  smoke ? 'context-restoration-smoke.json' : 'context-restoration.json',
);
await mkdir(path.dirname(reportFile), { recursive: true });
const report = {
  date: new Date().toISOString(),
  scope: smoke ? 'smoke' : 'full',
  scenarios: [],
  passed: false,
  limitations: [
    'Headless WebGL verifies recovery and exact pixels on this browser renderer; it does not measure hardware performance.',
  ],
};

async function capture(page) {
  const result = await page.evaluate(() => {
    const game = window.__pcolTestGame,
      scene = game._gView._scene,
      engine = game._engine;
    scene.render();
    const gl = engine._gl;
    const pixels = new Uint8Array(engine.getRenderWidth() * engine.getRenderHeight() * 4);
    gl.readPixels(
      0,
      0,
      engine.getRenderWidth(),
      engine.getRenderHeight(),
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      pixels,
    );
    let binary = '';
    for (let offset = 0; offset < pixels.length; offset += 16384) {
      binary += String.fromCharCode(...pixels.subarray(offset, offset + 16384));
    }
    return {
      raw: window.btoa(binary),
      png: engine.getRenderingCanvas().toDataURL('image/png').split(',')[1],
    };
  });
  const bytes = Buffer.from(result.raw, 'base64');
  assert.ok(
    bytes.some((value) => value !== 0),
    'Empty framebuffer',
  );
  return { bytes, png: Buffer.from(result.png, 'base64') };
}

async function recover(page, manualRender = true) {
  let timer;
  try {
    await Promise.race([
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Context restoration timed out')), 30000);
      }),
      page.evaluate(async (manualRender) => {
        const game = window.__pcolTestGame,
          engine = game._engine,
          scene = game._gView._scene;
        const textures = scene.textures.map((texture) => [texture, texture.getInternalTexture()]);
        const frozen = scene.materials.map((material) => [material, material.isFrozen]);
        const counts = [
          scene.meshes.length,
          scene.materials.length,
          scene.textures.length,
          engine._uniformBuffers.length,
          engine.onContextLostObservable._observers.length,
          engine.onContextRestoredObservable._observers.length,
        ];
        const extension = engine._gl.getExtension('WEBGL_lose_context');
        if (!extension) {
          throw new Error('WEBGL_lose_context unavailable');
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
            if (!manualRender) {
              window.__recoveryAutoFrames = 0;
            }
            resolve();
          });
        });
        extension.loseContext();
        await lost;
        // Chromium requires the asynchronous loss event before permitting restore.
        await new Promise((resolve) => setTimeout(resolve, 100));
        extension.restoreContext();
        await restored;
        while (scene.textures.some((texture) => !texture.isReady())) {
          await new Promise((resolve) => window.requestAnimationFrame(resolve));
        }
        await Promise.all(
          Object.values(engine._compiledEffects).map(
            (effect) => new Promise((resolve) => effect.executeWhenCompiled(resolve)),
          ),
        );
        await new Promise((resolve) => scene.executeWhenReady(resolve));
        if (manualRender) {
          scene.render();
          scene.render();
        }
        for (const [texture, internal] of textures) {
          if (!scene.textures.includes(texture)) {
            // Shadow generators recreate their render-target wrappers.
            if (!texture.isRenderTarget) {
              throw new Error('A source texture was replaced');
            }
            continue;
          }
          if (texture.getInternalTexture() !== internal) {
            throw new Error('Source texture identity changed: ' + texture.name);
          }
        }
        for (const [material, wasFrozen] of frozen) {
          if (material.isFrozen !== wasFrozen) {
            throw new Error('Material freezing changed: ' + material.name);
          }
        }
        for (const texture of scene.textures) {
          const internal = texture.getInternalTexture();
          if (internal && !engine._gl.isTexture(internal._webGLTexture)) {
            throw new Error('Invalid GPU texture: ' + texture.name);
          }
        }
        for (const effect of Object.values(engine._compiledEffects)) {
          if (!engine._gl.isProgram(effect._program)) {
            throw new Error('Invalid shader program: ' + effect.name);
          }
        }
        const recoveredCounts = [
          scene.meshes.length,
          scene.materials.length,
          scene.textures.length,
          engine._uniformBuffers.length,
          engine.onContextLostObservable._observers.length,
          engine.onContextRestoredObservable._observers.length,
        ];
        if (JSON.stringify(counts) !== JSON.stringify(recoveredCounts)) {
          throw new Error('Scene resources or engine observers grew during recovery');
        }
      }, manualRender),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function stop(page) {
  await page.evaluate(() => {
    const game = window.__pcolTestGame;
    window.__recoveryRenderLoops = [...game._engine._activeRenderLoops];
    game._engine.stopRenderLoop();
  });
}
async function resume(page) {
  await page.evaluate(() => {
    const game = window.__pcolTestGame;
    game._gTimer.reset();
    for (const loop of window.__recoveryRenderLoops) {
      game._engine.runRenderLoop(loop);
    }
    delete window.__recoveryRenderLoops;
    game._gView.requireRender();
  });
}
async function readyGame(page) {
  await page.waitForFunction(() => {
    const game = window.__pcolTestGame;
    return (
      game._currentController.name === 'game' &&
      game._currentController.state === 3 &&
      !game._uiLayer.isBlocked
    );
  });
}
async function closeGuide(page) {
  await waitForActiveBasicGuide(page);
  const guide = page.locator('.controls-guide-box').filter({ hasText: 'BASIC CONTROLS' });
  if (await guide.isVisible()) {
    await guide.getByRole('button', { name: 'CLOSE', exact: true }).click();
    await guide.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  }
}

try {
  for (const candidate of smoke ? browserCandidates().slice(0, 1) : browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of smoke ? fixture.targets.slice(0, 1) : fixture.targets) {
        for (const suffix of smoke ? ['001'] : ['original', '001', '002', '003']) {
          const design = 'interior-design-' + suffix;
          const context = await browser.newContext({ viewport: { width: 1000, height: 620 } });
          const page = await context.newPage();
          page.setDefaultTimeout(30000);
          const result = {
            browser: candidate.name,
            target: target.name,
            design,
            errors: [],
            recoveries: 0,
            passed: false,
          };
          report.scenarios.push(result);
          const prefix = [candidate.name, target.name, suffix].join('-');
          let delayTexture = false;
          let delayedTextureRequests = 0;
          page.on('pageerror', (error) => result.errors.push(error.message));
          try {
            await page.route('**/*', async (route) => {
              if (
                !route
                  .request()
                  .url()
                  .startsWith(target.origin + '/')
              ) {
                result.errors.push('External request: ' + route.request().url());
                await route.abort();
              } else if (!(await inspectRuntimeRoute(route, target))) {
                if (
                  delayTexture &&
                  route.request().url().includes('/assets/textures/table/frame-diffuse')
                ) {
                  delayedTextureRequests++;
                  await new Promise((resolve) => setTimeout(resolve, 150));
                }
                await route.continue();
              }
            });
            await page.goto(target.origin + '/?interior=' + design);
            await waitForHome(page, design);
            await page.waitForFunction(
              () => document.getElementById('game-view').style.opacity === '1',
            );
            await stop(page);
            await page.evaluate(() => {
              const scene = window.__pcolTestGame._gView._scene;
              window.__recoveryCamera = {
                position: scene.activeCamera.position.clone(),
                target: scene.activeCamera.lockedTarget.clone(),
              };
              scene.activeCamera.position.set(-4.5, 1.8, 5);
              scene.activeCamera.lockedTarget.set(0.15, 1.3, 0);
              scene.render();
              scene.render();
            });
            // Keep every game/room mesh enabled; no black-material exclusions.
            const baseline = await capture(page);
            assert.ok(
              baseline.bytes.equals((await capture(page)).bytes),
              'Initial frame is unstable',
            );
            await writeFile(path.join(output, prefix + '-before.png'), baseline.png);
            for (let cycle = 0; cycle < 2; cycle++) {
              await recover(page);
              const restored = await capture(page);
              const difference = { changedChannels: 0, maxDifference: 0 };
              for (let index = 0; index < baseline.bytes.length; index++) {
                const delta = Math.abs(baseline.bytes[index] - restored.bytes[index]);
                difference.changedChannels += delta > 0;
                difference.maxDifference = Math.max(difference.maxDifference, delta);
              }
              result.pixelDifference = difference;
              if (difference.changedChannels) {
                await writeFile(path.join(output, prefix + '-before.rgba'), baseline.bytes);
                await writeFile(path.join(output, prefix + '-restored.rgba'), restored.bytes);
              }
              await writeFile(
                path.join(output, prefix + '-restored-' + (cycle + 1) + '.png'),
                restored.png,
              );
              assert.ok(
                baseline.bytes.equals(restored.bytes),
                'Complete frame differs after recovery ' + (cycle + 1),
              );
              result.recoveries++;
            }
            result.fullScenePixelsEqual = true;
            await page.evaluate(() => {
              const camera = window.__pcolTestGame._gView._scene.activeCamera;
              camera.position.copyFrom(window.__recoveryCamera.position);
              camera.lockedTarget.copyFrom(window.__recoveryCamera.target);
              delete window.__recoveryCamera;
            });
            await resume(page);
            await page
              .locator('.interior-home-menu .side-button')
              .filter({ hasText: 'PRACTICE' })
              .click();
            await readyGame(page);
            await closeGuide(page);
            const initialState = await gameState(page);
            await stop(page);
            const gameBefore = await capture(page);
            const state = await page.evaluate(() =>
              JSON.stringify(window.__pcolTestGame._currentController._model._gContext),
            );
            await recover(page);
            assert.ok(
              gameBefore.bytes.equals((await capture(page)).bytes),
              'Practice frame differs after recovery',
            );
            assert.equal(
              await page.evaluate(() =>
                JSON.stringify(window.__pcolTestGame._currentController._model._gContext),
              ),
              state,
            );
            result.recoveries++;
            await resume(page);
            const point = await page.evaluate(() => {
              const game = window.__pcolTestGame,
                scene = game._gView._scene,
                B = window.__pcolTestRequire('adapters/rendering/babylon-engine');
              const p = B.Vector3.Project(
                new B.Vector3(-1.18, 0.02625, 0.12).add(game._gView.playArea.position),
                B.Matrix.Identity(),
                scene.getTransformMatrix(),
                scene.activeCamera.viewport.toGlobal(
                  game._engine.getRenderWidth(),
                  game._engine.getRenderHeight(),
                ),
              );
              return { x: p.x, y: p.y };
            });
            await page.mouse.move(point.x, point.y);
            await page.waitForFunction(() => {
              const control = window.__pcolTestGame._currentController._activeSubControl;
              return control._isValidSpot && !control._needsUpdate;
            });
            await page.mouse.down();
            await page.mouse.up();
            await page.waitForFunction(
              () => window.__pcolTestGame._currentController._model._gContext.inHand === 1,
            );
            await closeGuide(page);
            await page.locator('#game-view').focus();
            await page.keyboard.press('w');
            await page.waitForFunction(() =>
              window.__pcolTestGame._currentController._playerCtls[0].stickCtl.isReadyToStroke(),
            );
            await closeGuide(page);
            await page.locator('#game-view').focus();
            await page.keyboard.press('Space');
            await page.waitForFunction(() =>
              window.__pcolTestGame._currentController._simulator._world.balls.some(
                (ball) => ball.v.lengthSq() > 0.01,
              ),
            );
            await page.waitForFunction(
              () => window.__pcolTestGame._currentController._movieClip.duration > 0,
            );
            await closeGuide(page);
            await page.locator('.replay-icon').click();
            await page.locator('.replay-control').waitFor();
            result.replayDuration = await page.evaluate(
              () => window.__pcolTestGame._currentController._movieClip.duration,
            );
            await page.locator('.replay-control .close-button').click();
            await page.locator('.replay-control').waitFor({ state: 'hidden' });
            await page.getByRole('button', { name: 'Pause game', exact: true }).click();
            await page
              .getByRole('dialog', { name: 'PAUSED', exact: true })
              .getByRole('button', { name: 'RESTART', exact: true })
              .click();
            await confirmGameAction(page, 'restart');
            await readyGame(page);
            await page.waitForFunction(() => {
              const controller = window.__pcolTestGame._currentController;
              return (
                controller._model.getContext('nRounds') === 0 &&
                controller._activeSubControl === controller._subControl.inHand &&
                !controller._paused
              );
            });
            const restarted = await gameState(page);
            for (const key of ['context', 'players', 'balls', 'ui']) {
              assert.deepEqual(
                restarted[key],
                initialState[key],
                'Restart after restoration: ' + key,
              );
            }
            result.restartAfterRecovery = true;
            await page.getByRole('button', { name: 'Pause game', exact: true }).click();
            await page
              .getByRole('dialog', { name: 'PAUSED', exact: true })
              .getByRole('button', { name: 'QUIT', exact: true })
              .click();
            await confirmGameAction(page, 'quit');
            await waitForHome(page, design);
            await page.waitForFunction(() => window.__pcolTestGame._gView._nRenderRequired === 0);
            await page.evaluate(() => {
              const scene = window.__pcolTestGame._gView._scene;
              const frameTexture = scene.textures.find((texture) =>
                texture.url?.includes('/assets/textures/table/frame-diffuse'),
              );
              if (!frameTexture) {
                throw new Error('Frame texture unavailable for delayed recovery');
              }
              // A fresh URL bypasses decoded-image reuse in the browser. Only
              // this test instance changes transport; image bytes stay intact.
              const internal = frameTexture.getInternalTexture();
              window.__recoveryTexture = { internal, url: internal.url };
              internal._buffer = null;
              internal.url += '?context-restoration-probe=idle';
              window.__recoveryAutoFrames = -1;
              window.__recoveryAutoObserver = scene.onAfterRenderObservable.add(() => {
                if (
                  window.__recoveryAutoFrames >= 0 &&
                  scene.textures.every((texture) => texture.isReady())
                ) {
                  window.__recoveryAutoFrames++;
                }
              });
            });
            delayTexture = true;
            await recover(page, false);
            await page.waitForFunction(() => window.__recoveryAutoFrames >= 2);
            assert.ok(delayedTextureRequests > 0, 'Delayed texture reload was not exercised');
            result.delayedTextureRequests = delayedTextureRequests;
            await page.evaluate(() => {
              const scene = window.__pcolTestGame._gView._scene;
              scene.onAfterRenderObservable.remove(window.__recoveryAutoObserver);
              delete window.__recoveryAutoObserver;
              window.__recoveryTexture.internal.url = window.__recoveryTexture.url;
              delete window.__recoveryTexture;
            });
            result.automaticIdleRedraw = true;
            result.recoveries++;
            assert.deepEqual(result.errors, []);
            result.gameplayAfterRecovery = true;
            result.passed = true;
            console.log(
              `${prefix}: repeated full pixels, textures, shaders, practice, stroke, replay, menu passed`,
            );
          } catch (error) {
            result.failure = error.message;
            await page
              .screenshot({ path: path.join(output, prefix + '-failure.png') })
              .catch(() => {});
            throw error;
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
  await writeFile(reportFile, JSON.stringify(report, null, 2) + '\n');
  await fixture.close();
}
