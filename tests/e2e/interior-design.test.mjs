import { confirmGameAction } from '../helpers/game-ui-actions.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ROOT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import { createServer } from '../../tooling/server/static-server.mjs';
import { designDirectory } from '../../tooling/lib/artifact-paths.mjs';
import { inspectRuntimeEntry } from '../../tooling/testing/runtime-inspection.mjs';
import {
  snapshotManifests,
  compareManifestSnapshots,
} from '../../tooling/testing/manifest-snapshots.mjs';

const designId = process.env.PCOL_INTERIOR_DESIGN || 'interior-design-001';
assert.ok(['interior-design-001', 'interior-design-002', 'interior-design-003'].includes(designId));
const output = designDirectory('testing', designId, 'scene');
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
  for (const variant of ['original', designId]) {
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
    await page.goto(origin + (variant === designId ? '/?interior=' + designId : '/'));
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
    const profile = await page.evaluate((designId) => {
      const game = window.__pcolTestGame;
      const scene = game._gView._scene;
      const world = game._currentController._simulator._world;
      const added = scene.meshes.filter((mesh) => mesh.name.startsWith(designId + '-'));
      const walls = (mesh) =>
        mesh.name === designId + '-structure-wall' || mesh.name === designId + '-structure-plaster';
      const B = scene.activeCamera.position.constructor;
      // Use the engine ray class already owned by the camera, without adding a diagnostic runtime API.
      const Ray = scene.activeCamera.getForwardRay().constructor;
      const windows = scene.metadata?.interiorDesign?.construction?.windows || [];
      const door = scene.metadata?.interiorDesign?.construction?.door;
      const openings = windows.map(
        ({ position }) =>
          !scene.pickWithRay(
            new Ray(new B(-5.7, position[1], position[2]), new B(-1, 0, 0), 0.8),
            walls,
          ).hit,
      );
      if (door) {
        openings.push(
          !scene.pickWithRay(new Ray(new B(door.position[0], 1.5, 7.5), new B(0, 0, 1), 0.8), walls)
            .hit,
        );
      }
      return {
        design: scene.metadata?.interiorDesign || null,
        roomMaterials: scene.materials
          .filter((material) => material.name.startsWith(designId + '-'))
          .map((material) => ({
            name: material.name,
            surface: material.metadata?.interiorSurface,
            kind: material.metadata?.surfaceKind,
            specularPower: material.specularPower,
            emissiveTexture: Boolean(material.emissiveTexture),
            floorContactMap:
              material.lightmapTexture?.name.endsWith('floor-contact-lightmap') || false,
            floorMapCoordinates: material.lightmapTexture?.coordinatesIndex,
            floorMapAsShadow: material.useLightmapAsShadowmap,
            used: scene.meshes.some((mesh) => mesh.isEnabled() && mesh.material === material),
            surfaceShader:
              (material.getEffect()?.isReady() &&
                scene
                  .getEngine()
                  .getFragmentShaderSource(material.getEffect().getProgram())
                  ?.includes('uniform vec4 interiorSurface;')) ||
              false,
          })),
        lights: scene.lights.map((light) => ({
          name: light.name,
          intensity: light.intensity,
          targets: light.includedOnlyMeshes.map((mesh) => mesh.name),
          diffuse: light.diffuse.asArray(),
          shadowCasters:
            light
              .getShadowGenerator()
              ?.getShadowMap()
              ?.renderList?.map((mesh) => mesh.name) || [],
        })),
        openings,
        hiddenOriginals: [
          'Room',
          'Ground',
          'RoofLights',
          'Pillars',
          'Corridor',
          'ItemEast',
          'ItemSouth1',
          'ItemSouth2',
          'ItemWest',
          'ItemNorth',
          'MainLight',
        ].map((name) => ({ name, enabled: scene.getMeshByName(name).isEnabled() })),
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
    }, designId);
    if (variant === designId) {
      assert.ok(profile.studyMeshes.length >= 15 && profile.studyMeshes.length <= 64);
      assert.equal(profile.design.id, designId);
      assert.equal(profile.design.name, '室内设计' + designId.slice(-3));
      assert.ok(profile.hiddenOriginals.every((mesh) => !mesh.enabled));
      assert.equal(
        profile.lights.filter((light) => light.name.startsWith(designId + '-')).length,
        8,
      );
      assert.ok(
        profile.lights
          .filter((light) => light.name.startsWith(designId + '-'))
          .every(
            (light) =>
              light.targets.length === profile.studyMeshes.length &&
              light.targets.every((name) => name.startsWith(designId + '-')),
          ),
      );
      assert.ok(profile.studyMeshes.every((mesh) => !mesh.pickable && !mesh.collision));
      assert.ok(
        profile.roomMaterials
          .filter((material) => material.used)
          .every((material) => material.surfaceShader),
        'A room surface shader failed or fell back',
      );
      assert.ok(profile.design.contactShading.shadedVertices > 1000);
      assert.ok(profile.design.contactShading.minimum >= 0.69);
      assert.ok(profile.design.contactShading.footprints >= 20);
      assert.equal(profile.design.contactShading.floorMapSize, 1024);
      assert.ok(profile.design.surfaces.some((surface) => surface.kind === 'fabric'));
      assert.ok(profile.design.surfaces.some((surface) => surface.kind === 'wood'));
      const fabric = profile.roomMaterials.find((material) => material.kind === 'fabric');
      const wood = profile.roomMaterials.find((material) => material.kind === 'wood');
      const metal = profile.roomMaterials.find((material) => material.kind === 'metal');
      assert.ok(
        fabric.specularPower < wood.specularPower && wood.specularPower < metal.specularPower,
      );
      assert.ok(
        profile.roomMaterials
          .filter((material) => /(?:artwork|art)$/.test(material.name))
          .every((material) => !material.emissiveTexture),
        'Art is self-illuminated instead of receiving picture light',
      );
      assert.ok(
        profile.roomMaterials.some(
          (material) =>
            material.floorContactMap &&
            material.floorMapCoordinates === 1 &&
            material.floorMapAsShadow,
        ),
        'Floor contact shading does not use its own world-space UVs',
      );
      assert.equal(profile.openings.length, 3);
      assert.ok(
        profile.openings.every(Boolean),
        'A window or door is still covered by the solid room wall',
      );
      assert.ok(
        profile.lights
          .filter((light) => light.name.startsWith(designId + '-'))
          .every(
            (light) => light.diffuse[0] > light.diffuse[1] && light.diffuse[1] > light.diffuse[2],
          ),
        'Room lighting is not warm',
      );
      const castingLights = profile.lights.filter(
        (light) => light.name.startsWith(designId + '-') && light.shadowCasters.length > 0,
      );
      assert.equal(castingLights.length, 2);
      for (const light of castingLights) {
        assert.ok(
          light.shadowCasters.some((name) =>
            /structure-(?:bronze|metal|wood|oak)-casters$/.test(name),
          ),
          'Furniture supports are absent from shadows',
        );
        assert.ok(
          light.shadowCasters.every((name) => !/structure-(?:wall|plaster|ceiling)$/.test(name)),
          'The room shell casts shadows over the whole interior',
        );
      }
      assert.equal(profile.design.construction.door.hinges, 3);
      assert.ok(profile.design.construction.contacts.length >= 20);
      if (designId === 'interior-design-003') {
        assert.equal(profile.design.construction.clearances.length, 3);
        assert.ok(
          profile.design.construction.clearances.every((item) => item.gap >= 0.1),
          'The blue side table intersects a sofa cushion',
        );
      }
      for (const joint of profile.design.construction.contacts) {
        const gap = joint.upper.min[1] - joint.lower.max[1];
        assert.ok(
          gap <= 0.004 && gap >= -0.08,
          'Floating or deeply intersecting joint: ' + joint.name + ' (' + gap + ')',
        );
        for (const axis of [0, 2]) {
          assert.ok(
            joint.upper.max[axis] > joint.lower.min[axis] &&
              joint.upper.min[axis] < joint.lower.max[axis],
            'Support misses its furniture: ' + joint.name,
          );
        }
      }
      // Furniture must leave both the cueing envelope and the rear entry approach clear.
      const entranceX = {
        'interior-design-001': 4.7,
        'interior-design-002': 1.83,
        'interior-design-003': 1.95,
      }[designId];
      for (const item of profile.design.features.filter((entry) => entry.type === 'furniture')) {
        const [x, , z] = item.position;
        const [width, , depth] = item.size;
        const overlap = (left, right, front, back) =>
          x + width / 2 > left &&
          x - width / 2 < right &&
          z + depth / 2 > front &&
          z - depth / 2 < back;
        assert.equal(
          overlap(-3.3, 3.3, -3.3, 3.3),
          false,
          'Furniture obstructs cueing: ' + item.name,
        );
        assert.equal(
          overlap(entranceX - 0.65, entranceX + 0.65, 5.35, 7.7),
          false,
          'Furniture obstructs entrance: ' + item.name,
        );
      }
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
      ['overview', [-4.5, 1.8, 5], [0.15, 1.3, 0]],
      ['lounge', [3.8, 1.5, 2.6], [0.2, 1.5, 7.6]],
      ['ceiling', [3.5, 1.3, 3], [0, 2.7, -0.8]],
      ['right-lounge', [0, 1.5, 3.3], [5.0, 1.0, 6.1]],
      ['left-lounge', [0, 1.5, 3.3], [-4.1, 1.0, 4.8]],
      ...(designId === 'interior-design-003'
        ? [['side-table', [1.9, 0.95, 5.9], [3.55, 0.43, 7.1]]]
        : []),
      [
        'window',
        [-3.45, 1.72, 4.4],
        [
          -6.0854,
          1.99,
          { 'interior-design-001': 2.65, 'interior-design-002': 2.55, 'interior-design-003': 2.3 }[
            designId
          ],
        ],
      ],
      [
        'entry',
        [
          { 'interior-design-001': 4.7, 'interior-design-002': 1.83, 'interior-design-003': 1.95 }[
            designId
          ] - 1.5,
          1.45,
          5.8,
        ],
        [
          { 'interior-design-001': 4.7, 'interior-design-002': 1.83, 'interior-design-003': 1.95 }[
            designId
          ],
          1.4,
          7.95,
        ],
      ],
      [
        'furniture',
        ...{
          'interior-design-001': [
            [-0.5, 0.56, 5.35],
            [-1.8, 0.3, 6.65],
          ],
          'interior-design-002': [
            [0.95, 0.65, 5.1],
            [-0.25, 0.46, 6.58],
          ],
          'interior-design-003': [
            [3.8, 0.55, 4.2],
            [6.0, 0.36, 5.05],
          ],
        }[designId],
      ],
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
    'Interior design: openings, warm isolated lighting, shadow maps, furniture joints/clearance, unchanged gameplay, real restart and authored viewpoints passed.',
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
