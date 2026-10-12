import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ROOT, BUILD_OUTPUTS, LAYOUT } from '../../config/project.config.mjs';
import { sha256, verifySnapshot } from '../../tooling/lib/integrity.mjs';
import { createServer } from '../../tooling/server/static-server.mjs';
import { designDirectory } from '../../tooling/lib/artifact-paths.mjs';
import {
  inspectRuntimeEntry,
  runtimeEntryPath,
} from '../../tooling/testing/runtime-inspection.mjs';

const output = designDirectory('testing', 'interior-design-original', 'scene');
await mkdir(output, { recursive: true });
const model = JSON.parse(
  await readFile(
    path.join(ROOT, 'src/assets/models/interior-design-original-room.babylon'),
    'utf8',
  ),
);
const modelNames = model.meshes.map((mesh) => mesh.name);
const baselineManifest = JSON.parse(
  await readFile(path.join(ROOT, LAYOUT.baselineManifest), 'utf8'),
);
const runtimeManifest = JSON.parse(
  await readFile(path.join(ROOT, BUILD_OUTPUTS.production, 'build-manifest.json'), 'utf8'),
);
const assetHashes = new Map([
  ...baselineManifest.files.map((file) => ['/baseline/' + file.path, file.sha256]),
  ...runtimeManifest.files.map((file) => ['/' + file.path, file.sha256]),
]);
await mkdir(path.join(ROOT, 'reports/validation'), { recursive: true });
await verifySnapshot(LAYOUT.baseline, LAYOUT.baselineManifest);
const baselineManifestSHA256 = sha256(await readFile(path.join(ROOT, LAYOUT.baselineManifest)));
const report = {
  date: new Date().toISOString(),
  design: 'interior-design-original',
  browsers: [],
  passed: false,
};
const server = createServer({ runtime: path.join(ROOT, BUILD_OUTPUTS.production) });
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

function canonical(value, base, key = '') {
  if (Array.isArray(value)) {
    return value.map((item) => canonical(item, base));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((name) => name !== 'uniqueId')
        .map((name) => [name, canonical(value[name], base, name)]),
    );
  }
  if (typeof value === 'string' && key === 'shaderPath') {
    return { planebatch: 'plane-batch', powerview: 'power-view' }[value] || value;
  }
  if (typeof value === 'string' && value.includes('.babylon/')) {
    const boundary = value.indexOf('.babylon/') + '.babylon'.length;
    const asset = assetHashes.get(new URL(value.slice(0, boundary), base).pathname);
    assert.ok(asset, 'Unmapped model asset: ' + value);
    return 'sha256:' + asset + value.slice(boundary);
  }
  if (typeof value === 'string' && ['name', 'url'].includes(key)) {
    const resolved = new URL(value, base).pathname;
    const asset =
      assetHashes.get(resolved) ||
      (key === 'name'
        ? [...assetHashes].find(
            ([assetPath]) => path.posix.basename(assetPath) === path.posix.basename(resolved),
          )?.[1]
        : null);
    if (asset) {
      return 'sha256:' + asset;
    }
  }
  return value;
}

try {
  for (const [browserName, executablePath] of [
    ['chrome', 'C:/Program Files/Google/Chrome/Application/chrome.exe'],
    ['edge', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'],
  ]) {
    const browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ['--enable-unsafe-swiftshader'],
    });
    const result = {
      name: browserName,
      version: browser.version(),
      variants: [],
      pixelComparisons: [],
    };
    const views = [
      ['overview', [-4.5, 1.8, 5], [0.15, 1.3, 0]],
      ['wall', [0.1, 1.65, 0.2], [0.1, 1.6, -3.96]],
      ['ceiling', [3.5, 1.3, 3], [0, 2.7, -0.8]],
      ['left-lounge', [-1.8, 1.5, 2.8], [-5.6, 1.2, 5.5]],
      ['right-lounge', [2.5, 1.5, 2.8], [6, 1.1, 5.6]],
    ];
    const baselinePixels = new Map();
    let baselineProfile;
    try {
      for (const variant of ['baseline', 'default', 'named']) {
        const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('requestfailed', (request) => errors.push(request.url()));
        page.on('response', (response) => {
          if (response.status() >= 400) {
            errors.push(response.status() + ': ' + response.url());
          }
        });
        await page.route('**/*', async (route) => {
          const url = route.request().url();
          if (!url.startsWith(origin + '/')) {
            errors.push('External request: ' + url);
            return route.abort();
          }
          const routeName = variant === 'baseline' ? 'baseline' : 'runtime';
          if (new URL(url).pathname.endsWith('/' + runtimeEntryPath(routeName))) {
            const root = variant === 'baseline' ? LAYOUT.baseline : BUILD_OUTPUTS.production;
            const source = await readFile(
              path.join(ROOT, root, runtimeEntryPath(routeName)),
              'utf8',
            );
            return route.fulfill({
              body: inspectRuntimeEntry(source, { baseline: variant === 'baseline' }),
              contentType: 'text/javascript',
            });
          }
          return route.continue();
        });
        await page.goto(
          origin +
            (variant === 'baseline'
              ? '/baseline/'
              : variant === 'named'
                ? '/?interior=interior-design-original'
                : '/'),
        );
        await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).waitFor();
        await page.waitForFunction(() => window.__pcolTestGame?._gView?._scene?.isReady());
        await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
        await page.locator('.score-container .head').first().waitFor();
        await page.waitForFunction(
          () =>
            window.__pcolTestGame._currentController._state === 3 &&
            window.__pcolTestGame._currentController._simulator._world.environmentReady &&
            window.__pcolTestGame._gView._scene.isReady(),
        );
        const profile = canonical(
          await page.evaluate((modelNames) => {
            const game = window.__pcolTestGame;
            const scene = game._gView._scene;
            game._engine.stopRenderLoop();
            return {
              clearColor: scene.clearColor.asArray(),
              ambientColor: scene.ambientColor.asArray(),
              meshNames: scene.meshes.map((mesh) => mesh.name),
              meshes: modelNames.map((name) => {
                const mesh = scene.getMeshByName(name);
                return {
                  name,
                  position: mesh.position.asArray(),
                  rotation: mesh.rotation.asArray(),
                  scaling: mesh.scaling.asArray(),
                  enabled: mesh.isEnabled(),
                  visible: mesh.isVisible,
                  pickable: mesh.isPickable,
                  collisions: mesh.checkCollisions,
                  shadows: mesh.receiveShadows,
                  material: mesh.material.name,
                  vertices: Object.fromEntries(
                    mesh
                      .getVerticesDataKinds()
                      .map((kind) => [kind, Array.from(mesh.getVerticesData(kind))]),
                  ),
                  indices: Array.from(mesh.getIndices()),
                };
              }),
              materials: scene.materials.map((material) => material.serialize()),
              textures: scene.textures.map((texture) => ({
                serialized: texture.serialize(),
                url: texture.url,
                dataIndex: texture.dataIndex,
                size: texture.getSize(),
                ready: texture.isReady(),
                samplingMode: texture.samplingMode,
              })),
              lights: scene.lights.map((light) => ({
                serialized: light.serialize(),
                included: light.includedOnlyMeshes.map((mesh) => mesh.name),
                excluded: light.excludedMeshes.map((mesh) => mesh.name),
              })),
              camera: {
                fov: scene.activeCamera.fov,
                minZ: scene.activeCamera.minZ,
                maxZ: scene.activeCamera.maxZ,
              },
            };
          }, modelNames),
          origin + (variant === 'baseline' ? '/baseline/' : '/'),
        );
        if (variant === 'baseline') {
          baselineProfile = profile;
          await writeFile(
            path.join(output, browserName + '-baseline-profile.json'),
            JSON.stringify(profile, null, 2) + '\n',
          );
        } else {
          await writeFile(
            path.join(output, browserName + '-' + variant + '-profile.json'),
            JSON.stringify(profile, null, 2) + '\n',
          );
          assert.equal(
            sha256(JSON.stringify(profile)),
            sha256(JSON.stringify(baselineProfile)),
            'Original scene geometry, material, texture or light changed: ' + variant,
          );
          assert.equal(await page.title(), 'OH MY SNOOKER');
          assert.equal(
            await page.evaluate(
              () => window.__pcolTestGame._gView._scene.metadata.interiorDesign.id,
            ),
            'interior-design-original',
          );
        }
        await page.addStyleTag({
          content:
            '#game-container > :not(#game-view):not(#game-shade) { visibility: hidden !important; }',
        });
        for (const [view, position, target] of views) {
          const encoded = await page.evaluate(
            ({ position, target, modelNames }) => {
              const game = window.__pcolTestGame;
              const scene = game._gView._scene;
              const camera = scene.activeCamera;
              camera.position.set(...position);
              camera.lockedTarget.set(...target);
              // Compare only imported room/table meshes, excluding animated gameplay overlays and balls.
              for (const mesh of scene.meshes) {
                if (!modelNames.includes(mesh.name)) {
                  mesh.setEnabled(false);
                }
              }
              scene.render();
              scene.render();
              const gl = game._engine._gl;
              const pixels = new Uint8Array(
                game._engine.getRenderWidth() * game._engine.getRenderHeight() * 4,
              );
              gl.readPixels(
                0,
                0,
                game._engine.getRenderWidth(),
                game._engine.getRenderHeight(),
                gl.RGBA,
                gl.UNSIGNED_BYTE,
                pixels,
              );
              let binary = '';
              for (let offset = 0; offset < pixels.length; offset += 16384) {
                binary += String.fromCharCode(...pixels.subarray(offset, offset + 16384));
              }
              return window.btoa(binary);
            },
            { position, target, modelNames },
          );
          const pixels = Buffer.from(encoded, 'base64');
          const hash = sha256(pixels);
          assert.ok(
            pixels.some((byte) => byte !== 0),
            'Empty framebuffer',
          );
          if (variant === 'baseline') {
            baselinePixels.set(view, pixels);
          } else {
            let changedChannels = 0;
            let maxDifference = 0;
            const baseline = baselinePixels.get(view);
            for (let index = 0; index < pixels.length; index++) {
              const difference = Math.abs(pixels[index] - baseline[index]);
              if (difference > 0) {
                changedChannels++;
                maxDifference = Math.max(maxDifference, difference);
              }
            }
            result.pixelComparisons.push({
              variant,
              view,
              sha256: hash,
              baselineSHA256: sha256(baseline),
              changedChannels,
              maxDifference,
            });
            assert.equal(changedChannels, 0, 'Room pixels differ: ' + variant + '/' + view);
          }
          await page.screenshot({
            path: path.join(output, browserName + '-' + variant + '-' + view + '.png'),
          });
        }
        assert.deepEqual(errors, []);
        result.variants.push({
          variant,
          geometryAndMaterialSHA256: sha256(JSON.stringify(profile)),
          errors,
        });
        await context.close();
      }
      result.passed = true;
      console.log(
        browserName +
          ': default/named geometry, material, texture, lights and five-view pixels match frozen PCOL.',
      );
    } finally {
      report.browsers.push(result);
      await browser.close();
    }
  }
  await verifySnapshot(LAYOUT.baseline, LAYOUT.baselineManifest);
  assert.equal(
    sha256(await readFile(path.join(ROOT, LAYOUT.baselineManifest))),
    baselineManifestSHA256,
    'Frozen baseline manifest changed during scene comparison',
  );
  report.baselineManifestSHA256 = baselineManifestSHA256;
  report.passed = true;
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await writeFile(
    path.join(ROOT, 'reports/validation/interior-design-original.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await new Promise((resolve) => server.close(resolve));
}
