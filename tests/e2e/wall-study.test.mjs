import { confirmGameAction } from '../helpers/game-ui-actions.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { artifactDirectory } from '../../tooling/lib/artifact-paths.mjs';
import { chromium } from 'playwright';
import { ROOT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import { createServer } from '../../tooling/server/static-server.mjs';
import { inspectRuntimeEntry } from '../../tooling/testing/runtime-inspection.mjs';
import {
  snapshotManifests,
  compareManifestSnapshots,
} from '../../tooling/testing/manifest-snapshots.mjs';

const output = artifactDirectory('testing', 'modern-wall-study');
await mkdir(output, { recursive: true });
const before = await snapshotManifests();
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({
  executablePath:
    process.env.PCOL_BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader'],
});
const report = { date: new Date().toISOString(), variants: [], passed: false };
const browserName = process.env.PCOL_BROWSER_PATH?.includes('Edge') ? 'edge' : 'chrome';
report.browser = { name: browserName, version: browser.version() };

try {
  for (const variant of ['original', 'modern']) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) => errors.push(request.url()));
    page.on('response', (response) => {
      if (response.status() >= 400) {
        errors.push(`${response.status()}: ${response.url()}`);
      }
    });
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (!url.startsWith(origin + '/')) {
        errors.push(`External request: ${url}`);
        return route.abort();
      }
      if (new URL(url).pathname.endsWith('/scripts/runtime-bootstrap.js')) {
        const source = await readFile(
          path.join(ROOT, BUILD_OUTPUTS.development, 'scripts/runtime-bootstrap.js'),
          'utf8',
        );
        return route.fulfill({ body: inspectRuntimeEntry(source), contentType: 'text/javascript' });
      }
      await route.continue();
    });
    await page.goto(origin + (variant === 'modern' ? '/?wall-study=modern' : '/'));
    await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).waitFor();
    await page.waitForFunction(() => window.__pcolTestGame?._gView?._scene?.isReady());
    await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
    await page.locator('.score-container .head').first().waitFor();
    await page.waitForFunction(() => {
      const game = window.__pcolTestGame;
      return (
        game._currentController._simulator?._world?.environmentReady &&
        game._currentController._state === 3 &&
        game._gView._scene.isReady()
      );
    });
    const profile = await page.evaluate(() => {
      const game = window.__pcolTestGame;
      const scene = game._gView._scene;
      const world = game._currentController._simulator._world;
      const added = scene.meshes.filter((mesh) => mesh.name.startsWith('modern-wall-study-'));
      return {
        studyMeshes: added.map((mesh) => ({
          name: mesh.name,
          pickable: mesh.isPickable,
          collision: mesh.checkCollisions,
        })),
        meshCount: scene.meshes.length,
        materialCount: scene.materials.length,
        textureCount: scene.textures.length,
        fov: scene.activeCamera.fov,
        minZ: scene.activeCamera.minZ,
        ballRadius: game._currentController._simulator.ballRadius,
        stepSize: world.stepSize,
        balls: world.balls.map((ball) => ({
          position: [ball.position.x, ball.position.y, ball.position.z],
          mass: ball.mass,
          active: ball.active,
        })),
        context: { ...game._currentController._model._gContext },
      };
    });
    if (variant === 'modern') {
      assert.equal(profile.studyMeshes.length, 25);
      assert.ok(profile.studyMeshes.every((mesh) => !mesh.pickable && !mesh.collision));
    } else {
      assert.deepEqual(profile.studyMeshes, []);
    }
    // A real restart must keep the gallery singular and leave the opening balls intact.
    await page.locator('.ingame-controls [data-action="pause"]').click();
    await page.locator('.pause-box [data-sid="restart"]').click();
    await confirmGameAction(page, 'restart');
    await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
    const afterRestart = await page.evaluate(() => {
      const game = window.__pcolTestGame;
      const scene = game._gView._scene;
      return {
        meshes: scene.meshes.length,
        materials: scene.materials.length,
        textures: scene.textures.length,
        context: { ...game._currentController._model._gContext },
        balls: game._currentController._simulator._world.balls.map((ball) => ({
          position: [ball.position.x, ball.position.y, ball.position.z],
          mass: ball.mass,
          active: ball.active,
        })),
      };
    });
    assert.deepEqual(afterRestart, {
      meshes: profile.meshCount,
      materials: profile.materialCount,
      textures: profile.textureCount,
      context: profile.context,
      balls: profile.balls,
    });
    profile.restartVerified = true;
    await page.addStyleTag({
      content:
        '#game-container > :not(#game-view):not(#game-shade) { visibility: hidden !important; }',
    });
    for (const [view, position, target] of [
      ['table', [3.8, 1.12, 3.7], [-0.45, 1.0, -1.6]],
      ['wall', [0.1, 1.65, 0.2], [0.1, 1.6, -3.96]],
    ]) {
      await page.evaluate(
        ({ position, target }) => {
          const game = window.__pcolTestGame;
          game._engine.stopRenderLoop();
          const camera = game._gView._scene.activeCamera;
          camera.position.set(...position);
          camera.lockedTarget.set(...target);
          game._gView._scene.render();
        },
        { position, target },
      );
      await page.screenshot({
        path: path.join(output, `${variant}-${view}.png`),
      });
    }
    assert.deepEqual(errors, []);
    report.variants.push({ name: variant, ...profile, errors });
    await context.close();
  }
  const original = report.variants[0];
  const modern = report.variants[1];
  for (const key of ['fov', 'minZ', 'ballRadius', 'stepSize', 'balls', 'context']) {
    assert.deepEqual(modern[key], original[key], `Gameplay changed: ${key}`);
  }
  assert.deepEqual(compareManifestSnapshots(before, await snapshotManifests()), []);
  report.passed = true;
  console.log(
    'Wall study: original opt-out, non-interactive scenery, unchanged gameplay state and screenshots passed.',
  );
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(
    path.join(output, `${browserName}-report.json`),
    JSON.stringify(report, null, 2) + '\n',
  );
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
