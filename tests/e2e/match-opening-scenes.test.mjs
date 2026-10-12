import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ROOT } from '../../config/project.config.mjs';
import {
  browserCandidates,
  launchTestBrowser,
  createRuntimeFixture,
  inspectRuntimeRoute,
  waitForHome,
} from '../helpers/runtime-fixture.mjs';
import { waitForCamera } from './browser-observations.mjs';

/** Capture actual source Single Play openings; never load the design prototype or mutate src. */
async function captureMatchOpening() {
  const output = path.join(ROOT, 'artifacts/testing/rooms-panel-design');
  await mkdir(output, { recursive: true });
  const report = {
    date: new Date().toISOString(),
    method:
      'Actual source runtime, Single Play > AI-1, initial ball-in-hand phase after camera settles. Screenshot-only CSS hides DOM overlays, preserving the rendered scene and gameplay. No prototype page loaded.',
    viewport: { width: 1440, height: 900 },
    scenes: [],
    passed: false,
  };
  const fixture = await createRuntimeFixture();
  let browser;
  try {
    const candidate = browserCandidates()[0];
    browser = await launchTestBrowser(candidate);
    const target = fixture.targets.find((item) => item.name === 'source');
    for (const suffix of ['original', '001', '002', '003']) {
      const context = await browser.newContext({ viewport: report.viewport, deviceScaleFactor: 1 });
      try {
        const page = await context.newPage();
        page.setDefaultTimeout(45000);
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        await page.route('**/*', async (route) => {
          if (
            !route
              .request()
              .url()
              .startsWith(target.origin + '/')
          ) {
            errors.push('Unexpected external request');
            await route.abort();
          } else if (!(await inspectRuntimeRoute(route, target))) {
            await route.continue();
          }
        });
        const design = 'interior-design-' + suffix;
        await page.goto(target.origin + '/?interior=' + design);
        await waitForHome(page, design);
        const lobbyCamera = await page.evaluate(() =>
          window.__pcolTestGame._gView.camera.position.asArray(),
        );
        await page
          .locator('.interior-home-menu .side-button')
          .filter({ hasText: 'SINGLE PLAY' })
          .click();
        await page.waitForFunction(() => {
          const box = window.__pcolTestGame._uiLayer._registeredBox.hmDifBox;
          return box.isActive && !box.needsUpdate && !box.blocked;
        });
        await page.locator('.difficulty-box [data-sid="ai1"] button').click();
        await page.waitForFunction(() => {
          const game = window.__pcolTestGame;
          return (
            game._currentController.name === 'game' &&
            game._currentController.state === 3 &&
            game._currentController._simulator._world.environmentReady &&
            !game._uiLayer.isBlocked &&
            game._gView._scene.isReady()
          );
        });
        await waitForCamera(page);
        const scene = await page.evaluate(() => {
          const game = window.__pcolTestGame;
          const controller = game._currentController;
          return {
            design: game._gView._scene.metadata.interiorDesign.id,
            phase: controller._activeSubControl.name,
            playerIndex: controller._model.getContext('playerIndex'),
            camera: {
              position: game._gView.camera.position.asArray(),
              target: game._gView.camera.lockedTarget.asArray(),
              fov: game._gView.camera.fov,
            },
            players: controller._model.players.map((player) => ({
              name: player.displayName,
              score: player.pts,
            })),
          };
        });
        assert.equal(scene.design, design);
        assert.equal(scene.phase, 'inHand');
        assert.equal(scene.playerIndex, 0);
        assert.notDeepEqual(
          scene.camera.position,
          lobbyCamera,
          'Opening must use the match camera, not the lobby camera',
        );
        assert.equal(scene.players.length, 2);
        assert.ok(scene.players.every((player) => player.score === 0));
        const file = design + '-opening-scene.jpg';
        await page.locator('#game-view').screenshot({
          path: path.join(output, file),
          type: 'jpeg',
          quality: 92,
          style: 'body *:not(#game-container):not(#game-view) { visibility: hidden !important; }',
        });
        assert.deepEqual(errors, []);
        report.scenes.push({
          ...scene,
          lobbyCamera,
          file: 'artifacts/testing/rooms-panel-design/' + file,
          sha256: createHash('sha256')
            .update(await readFile(path.join(output, file)))
            .digest('hex'),
          browser: candidate.name,
          errors,
          passed: true,
        });
        console.log('Captured ' + design + ' Single Play opening');
      } finally {
        await context.close();
      }
    }
    report.passed = true;
  } finally {
    if (browser) {
      await browser.close();
    }
    await fixture.close();
    await writeFile(
      path.join(ROOT, 'reports/validation/match-opening-scenes.json'),
      JSON.stringify(report, null, 2) + '\n',
    );
  }
}

await captureMatchOpening();
