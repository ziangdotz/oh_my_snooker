import { readStylesheet } from '../helpers/stylesheet-fixture.mjs';
import {
  inspectRuntimeEntry,
  runtimeEntryPath,
  inspectSourceEntry,
} from '../../tooling/testing/runtime-inspection.mjs';
import { LAYOUT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, mkdtemp, cp, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from '../../tooling/server/static-server.mjs';
import { ROOT } from '../../tooling/lib/integrity.mjs';
import { artifactDirectory, designDirectory } from '../../tooling/lib/artifact-paths.mjs';
import { recordedBallAt } from '../helpers/replay-oracle.mjs';
import { captureFailure, observeFrames, waitForCamera } from './browser-observations.mjs';
import { snookerRules } from './snooker-rules.mjs';
import { gameRecovery, gameState } from './game-recovery.mjs';
import { removeBuildPath } from '../../tooling/build/build-transaction.mjs';
import { waitForActiveBasicGuide } from '../helpers/game-ui-actions.mjs';

const sourceMode = process.env.PCOL_SOURCE_RUNTIME === '1';
let sourceFixture;
if (sourceMode) {
  await mkdir(path.join(ROOT, '.cache'), { recursive: true });
  sourceFixture = await mkdtemp(path.join(ROOT, '.cache/source-runtime-test-'));
  await cp(path.join(ROOT, 'src'), path.join(sourceFixture, 'src'), { recursive: true });
}

const interiorDesignId = process.env.PCOL_INTERIOR_DESIGN || '';
assert.ok(
  [
    '',
    'interior-design-original',
    'interior-design-001',
    'interior-design-002',
    'interior-design-003',
  ].includes(interiorDesignId),
  'Unknown interior test version',
);
const interiorQuery = interiorDesignId ? `?interior=${interiorDesignId}` : '';
const output = sourceMode
  ? artifactDirectory('testing', 'source-runtime', 'regression')
  : interiorDesignId
    ? designDirectory('testing', interiorDesignId, 'regression')
    : artifactDirectory('testing', 'regression');
await mkdir(output, { recursive: true });
const server = createServer(sourceMode ? { runtime: path.join(sourceFixture, 'src') } : {});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = {
  date: new Date().toISOString().slice(0, 10),
  viewport: { width: 1440, height: 900 },
  networkPolicy: 'Abort every request outside the local server',
  interiorDesign: interiorDesignId || 'original',
  sourceOnly: sourceMode,
  browsers: [],
  limitations: [
    'Headless software WebGL does not verify real GPU performance or pixel equivalence.',
    'Ball Replay verifies recorded visibility and position; rotations are not recorded.',
  ],
};
const candidates = process.env.PCOL_BROWSER_PATH
  ? [{ name: 'custom', executablePath: process.env.PCOL_BROWSER_PATH }]
  : process.platform === 'win32'
    ? [
        { name: 'chrome', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
        {
          name: 'edge',
          executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        },
      ]
    : [{ name: 'chromium' }];
let openPages = [];

async function pageFor(browser, routeName, instrument = true, options = {}) {
  const context = await browser.newContext({ viewport: report.viewport, ...options });
  const page = await context.newPage();
  const observations = {
    external: [],
    failedResponses: [],
    pageErrors: [],
    requestFailures: [],
    requests: [],
  };
  page.on('pageerror', (e) => observations.pageErrors.push(e.message));
  page.on('requestfailed', (r) =>
    observations.requestFailures.push({ url: r.url(), error: r.failure()?.errorText }),
  );
  page.on('response', (r) => {
    if (r.status() >= 400) {
      observations.failedResponses.push({ url: r.url(), status: r.status() });
    }
  });
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    observations.requests.push(url);
    if (!url.startsWith(origin + '/')) {
      observations.external.push(url);
      return route.abort('blockedbyclient');
    }
    if (sourceMode && routeName !== 'baseline' && route.request().resourceType() === 'document') {
      // Match src/start.mjs: compiled-output CSP does not apply to source loading.
      const response = await route.fetch();
      const headers = response.headers();
      delete headers['content-security-policy'];
      return route.fulfill({ response, headers });
    }
    if (
      sourceMode &&
      routeName !== 'baseline' &&
      instrument &&
      ['/runtime/source-entry.js', '/application/launch-game.js'].includes(new URL(url).pathname)
    ) {
      const pathname = new URL(url).pathname;
      const source = await readFile(path.join(sourceFixture, 'src', pathname.slice(1)), 'utf8');
      return route.fulfill({
        body: inspectSourceEntry(source, { application: pathname.endsWith('launch-game.js') }),
        contentType: 'text/javascript',
      });
    }
    if (
      instrument &&
      (!sourceMode || routeName === 'baseline') &&
      new URL(url).pathname.endsWith('/' + runtimeEntryPath(routeName))
    ) {
      const root = routeName === 'baseline' ? LAYOUT.baseline : BUILD_OUTPUTS.development;
      const source = await readFile(path.join(ROOT, root, runtimeEntryPath(routeName)), 'utf8');
      return route.fulfill({
        body: inspectRuntimeEntry(source, { baseline: routeName === 'baseline' }),
        contentType: 'text/javascript',
      });
    }
    await route.continue();
  });
  const entry = { page, context, observations, routeName };
  openPages.push(entry);
  return entry;
}
function assertClean(observations) {
  assert.deepEqual(observations.external, [], 'External network dependency');
  assert.deepEqual(observations.failedResponses, [], 'Missing local asset');
  assert.deepEqual(observations.pageErrors, [], 'Uncaught runtime error');
  assert.deepEqual(observations.requestFailures, [], 'Failed local request');
}
async function home(page, routeName) {
  await page.bringToFront();
  await page.goto(origin + (routeName === 'baseline' ? '/baseline/' : '/' + interiorQuery));
  await page.locator('.side-button').filter({ hasText: 'SINGLE PLAY' }).waitFor();
  await page.waitForFunction(() => window.__pcolTestGame?._gView?._scene?.isReady());
  await page.mouse.move(1400, 850);
  await waitForCamera(page);
  return page.evaluate(() => {
    const g = window.__pcolTestGame,
      scene = g._gView._scene,
      camera = scene.activeCamera;
    return {
      babylonVersion: window.__pcolTestRequire('adapters/rendering/babylon-engine').Engine.Version,
      gameVersion: g.constructor.VERSION,
      webGLVersion: g._engine.webGLVersion,
      antialias: g._engine._gl.getContextAttributes().antialias,
      scaling: g._engine.getHardwareScalingLevel(),
      renderWidth: g._engine.getRenderWidth(),
      renderHeight: g._engine.getRenderHeight(),
      fov: camera.fov,
      minZ: camera.minZ,
      maxZ: camera.maxZ,
      position: camera.position.asArray(),
      target: camera.lockedTarget.asArray(),
      meshes: scene.meshes.map((m) => m.name),
      materials: scene.materials.map((m) => m.name),
      textureCount: scene.textures.length,
      lights: scene.lights.map((l) => l.name),
    };
  });
}
async function enterGame(page, practice = false) {
  await page.bringToFront();
  if (practice) {
    await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
  } else {
    await page.locator('.side-button').filter({ hasText: 'SINGLE PLAY' }).click();
    await page.locator('[data-sid="ai1"]').click();
  }
  await page.locator('.score-container .head').first().waitFor();
  await page.waitForFunction(
    () => window.__pcolTestGame._currentController._simulator?._world?.environmentReady,
  );
  await waitForCamera(page);
  assert.equal(
    await page.evaluate(
      () => window.__pcolTestGame._currentController._simulator._world.balls.length,
    ),
    22,
  );
}
async function physicsFixtures(page) {
  return page.evaluate(() => {
    const g = window.__pcolTestGame,
      world = g._currentController._simulator._world;
    const Vec3 = window.__pcolTestRequire('domain/math/vector-three'),
      World = window.__pcolTestRequire('domain/physics/world');
    g._engine.stopRenderLoop();
    const serial = World.makeSerialData();
    world.serialize(serial);
    const originalTouch = world.touchPresolveHandler,
      originalOutOfBounds = world.outOfBoundsHandler;
    const cases = [
      {
        name: 'break-center',
        start: [-1.18, 0.90625, -0.1],
        velocity: [3, 0, 0.14],
        arm: [0, 0, 0],
      },
      {
        name: 'cushion-side-spin',
        start: [-0.8, 0.90625, 0.4],
        velocity: [0.5, 0, 2],
        arm: [0.012, 0, 0],
      },
      { name: 'draw', start: [-0.8, 0.90625, 0], velocity: [2.5, 0, 0], arm: [0, -0.012, 0] },
      { name: 'follow', start: [-0.8, 0.90625, 0], velocity: [2.5, 0, 0], arm: [0, 0.012, 0] },
      { name: 'middle-pocket', start: [0, 0.90625, 0.65], velocity: [0, 0, 1.5], arm: [0, 0, 0] },
    ];
    const results = [];
    for (const fixture of cases) {
      world.deserialize(serial);
      world.accumulator = 0;
      g._currentController._simulator._result = window
        .__pcolTestRequire('domain/game/game-records')
        .makeSimulatorResult();
      const contacts = { ball: 0, cushion: 0 },
        removed = [];
      world.onTouchPresolve((contact) => {
        if (contact.isSS) {
          contacts.ball++;
        } else if (!contact.bj.ground) {
          contacts.cushion++;
        }
        const contactedBall = contact.bi;
        originalTouch(contact);
        // The original pocket callback can recycle the contact immediately.
        if (!contactedBall.active) {
          removed.push(contactedBall.number);
        }
      });
      world.onOutOfBounds((ball) => {
        removed.push(ball.number);
        originalOutOfBounds(ball);
      });
      const cue = world.balls[0];
      cue.reset(...fixture.start);
      world.reset();
      cue.applyImpulseAtPoint(
        new Vec3(...fixture.velocity.map((v) => v * cue.mass)),
        new Vec3(...fixture.arm),
        0,
      );
      const frames = [];
      for (let step = 0; step < 480; step++) {
        world.step(world.stepSize);
        if (step % 20 === 0 || step === 479) {
          frames.push(
            world.balls.map((ball) => ({
              active: ball.active,
              position: [ball.position.x, ball.position.y, ball.position.z],
              velocity: [ball.v.x, ball.v.y, ball.v.z],
              spin: [ball.w.x, ball.w.y, ball.w.z],
              orientation: [
                ball.orientation.x,
                ball.orientation.y,
                ball.orientation.z,
                ball.orientation.w,
              ],
            })),
          );
        }
      }
      results.push({ name: fixture.name, contacts, removed, frames });
    }
    return { stepSize: world.stepSize, fixtures: results };
  });
}
async function replaySample(page) {
  return page.evaluate(() => {
    const controller = window.__pcolTestGame._currentController;
    const clip = controller._movieClip;
    return {
      head: clip.playHead,
      duration: clip.duration,
      state: clip.state,
      progress: clip.progress,
      displayedProgress: parseFloat(document.querySelector('.progress-len').style.width) / 100,
      balls: Array.from({ length: 22 }, (_, index) => {
        const actor = clip.getTrack(`b${index}`).actor;
        return { visible: actor.isVisible, position: actor.position.asArray() };
      }),
    };
  });
}

function assertReplayMatches(recordings, sample) {
  assert.equal(sample.balls.length, 22);
  assert.ok(
    Math.abs(sample.displayedProgress - sample.progress) <= 0.000051,
    'Displayed Replay progress should match the playback head',
  );
  for (const [index, track] of recordings.entries()) {
    const expected = recordedBallAt(track, sample.head);
    const actual = sample.balls[index];
    assert.equal(actual.visible, expected.visible, `Replay ball ${index} visibility`);
    if (expected.visible) {
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(
          Math.abs(actual.position[axis] - expected.position[axis]) <= 1e-7,
          `Replay ball ${index}, axis ${axis}, at ${sample.head}: ${actual.position[axis]} != ${expected.position[axis]}`,
        );
      }
    }
  }
}

async function checkReplay(page, browserName) {
  const recordings = await page.evaluate(() => {
    const clip = window.__pcolTestGame._currentController._movieClip;
    return Array.from({ length: 22 }, (_, index) => {
      const track = clip.getTrack(`b${index}`);
      return {
        stride: track.stride,
        totalFrames: track.totalFrames,
        data: Array.from(track.data.slice(0, track.totalFrames * track.stride)),
      };
    });
  });
  assert.ok(
    recordings.every((track) => track.totalFrames > 0),
    'All balls must be recorded',
  );
  assert.ok(
    recordings.some((track) => track.totalFrames > 2),
    'Record a moving ball',
  );
  const control = page.locator('.replay-control');
  await control.locator('.pause-button').click();
  await page.waitForFunction(() => {
    const clip = window.__pcolTestGame._currentController._movieClip;
    return clip.state === 0 && !clip.needsUpdate;
  });
  const paused = await replaySample(page);
  assertReplayMatches(recordings, paused);
  await observeFrames(page);
  assert.deepEqual(
    await replaySample(page),
    paused,
    'Paused Replay must remain fixed across engine update frames',
  );
  await control.locator('.play-button').click();
  await page.waitForFunction((head) => {
    const clip = window.__pcolTestGame._currentController._movieClip;
    return clip.state === 1 && clip.playHead > head + 0.05;
  }, paused.head);
  await control.locator('.pause-button').click();
  await page.waitForFunction(() => {
    const clip = window.__pcolTestGame._currentController._movieClip;
    return clip.state === 0 && !clip.needsUpdate;
  });
  const resumed = await replaySample(page);
  assert.ok(resumed.head > paused.head, 'Play button resumes from paused time');
  assertReplayMatches(recordings, resumed);
  const samples = [paused, resumed];
  // Exercise the actual progress-bar pointer handler, including backward seeking.
  const bar = control.locator('.progress-bar');
  for (const fraction of [0.2, 0.65, 0.1, 1]) {
    const box = await bar.boundingBox();
    assert.ok(box?.width > 0);
    await page.mouse.move(
      box.x + Math.min(box.width * fraction, box.width - 1),
      box.y + box.height / 2,
    );
    await page.mouse.down();
    if (fraction === 1) {
      // Capture on the bar before dragging beyond its endpoint.
      await page.mouse.move(box.x + box.width + 1, box.y + box.height / 2);
    }
    await page.mouse.up();
    await page.waitForFunction(() => {
      const clip = window.__pcolTestGame._currentController._movieClip;
      return clip.state === 0 && !clip.needsUpdate;
    });
    const sample = await replaySample(page);
    // Chromium rounds pointer coordinates to CSS pixels.
    assert.ok(
      Math.abs(sample.progress - fraction) <= 2 / box.width,
      'Pointer seek reaches selected progress',
    );
    assertReplayMatches(recordings, sample);
    samples.push(sample);
  }
  assert.equal(
    samples.at(-1).head,
    samples.at(-1).duration,
    'Seeking to the endpoint clamps to duration',
  );
  const keyboardSeek = (await control.locator('[role="slider"]').count()) > 0;
  if (keyboardSeek) {
    await bar.focus();
    for (const [key, fraction] of [
      ['Home', 0],
      ['ArrowRight', 0.02],
      ['ArrowLeft', 0],
      ['End', 1],
    ]) {
      await page.keyboard.press(key);
      await page.waitForFunction(() => {
        const clip = window.__pcolTestGame._currentController._movieClip;
        return clip.state === 0 && !clip.needsUpdate;
      });
      const sample = await replaySample(page);
      assert.ok(Math.abs(sample.progress - fraction) < 1e-6, 'Keyboard seek reaches its target');
      assertReplayMatches(recordings, sample);
      assert.equal(await bar.getAttribute('aria-valuenow'), String(Math.round(fraction * 100)));
      samples.push(sample);
    }
    await page.keyboard.press('Space');
    await page.waitForFunction(() => {
      const clip = window.__pcolTestGame._currentController._movieClip;
      return clip.state === 1 && clip.playHead > 0 && clip.progress < 0.2;
    });
    await page.keyboard.press('Space');
    await page.waitForFunction(() => {
      const clip = window.__pcolTestGame._currentController._movieClip;
      return clip.state === 0 && !clip.needsUpdate;
    });
    assertReplayMatches(recordings, await replaySample(page));
    const camera = await page.evaluate(() => {
      const replay = window.__pcolTestGame._currentController._subControl.replay;
      return { index: replay._activeCamCtlIndex, count: replay._nActiveCamCtls };
    });
    await page.keyboard.press('c');
    assert.equal(
      await page.evaluate(
        () => window.__pcolTestGame._currentController._subControl.replay._activeCamCtlIndex,
      ),
      camera.index + 1 >= camera.count ? -1 : camera.index + 1,
    );
    await page.keyboard.down('s');
    await page.waitForFunction(
      () => window.__pcolTestGame._currentController._movieClip.timeScale === 0.25,
    );
    assert.equal(await control.getAttribute('data-slomo'), 'true');
    assert.equal(await control.locator('.game-ui-slow-label').isVisible(), true);
    await page.keyboard.up('s');
    assert.equal(
      await page.evaluate(() => window.__pcolTestGame._currentController._movieClip.timeScale),
      1,
    );
    assert.equal(await control.getAttribute('data-slomo'), 'false');
    await page.keyboard.press('End');
    await page.waitForFunction(
      () => !window.__pcolTestGame._currentController._movieClip.needsUpdate,
    );
  }
  assert.ok(
    samples.some((sample) =>
      sample.balls.some(
        (ball, index) =>
          ball.visible &&
          paused.balls[index].visible &&
          ball.position.some(
            (value, axis) => Math.abs(value - paused.balls[index].position[axis]) > 1e-5,
          ),
      ),
    ),
    'Sampled Replay must exercise ball movement',
  );
  await page.locator('#game-view').focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const clip = window.__pcolTestGame._currentController._movieClip;
    return clip.state === 1 && clip.playHead > 0 && clip.progress < 0.2;
  });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const clip = window.__pcolTestGame._currentController._movieClip;
    return clip.state === 0 && !clip.needsUpdate;
  });
  const restarted = await replaySample(page);
  assertReplayMatches(recordings, restarted);
  samples.push(restarted);
  await page.screenshot({ path: path.join(output, `${browserName}-replay.png`) });
  await writeFile(
    path.join(output, `${browserName}-replay.json`),
    JSON.stringify(
      {
        positionTolerance: 1e-7,
        recordings,
        samples,
        pauseStableUpdateFrames: 8,
        resumeVerified: true,
        seekVerified: true,
        restartVerified: true,
        keyboardSeekVerified: keyboardSeek,
      },
      null,
      2,
    ) + '\n',
  );
  return {
    duration: paused.duration,
    sampledTimes: samples.map(({ head }) => head),
    ballsComparedPerSample: 22,
    pauseStableUpdateFrames: 8,
    resumeVerified: true,
    seekVerified: true,
    restartVerified: true,
    keyboardSeekVerified: keyboardSeek,
  };
}

async function playShot(page, browserName) {
  const point = await page.evaluate(() => {
    const g = window.__pcolTestGame,
      B = window.__pcolTestRequire('adapters/rendering/babylon-engine'),
      view = g._gView;
    const p = B.Vector3.Project(
      new B.Vector3(-1.18, 0.02625, 0.12).add(view._playArea.position),
      B.Matrix.Identity(),
      view._scene.getTransformMatrix(),
      view._scene.activeCamera.viewport.toGlobal(
        g._engine.getRenderWidth(),
        g._engine.getRenderHeight(),
      ),
    );
    return { x: p.x, y: p.y };
  });
  await page.mouse.move(point.x, point.y);
  await page.waitForFunction(() => {
    const control = window.__pcolTestGame._currentController._activeSubControl;
    return control._isValidSpot && !control._needsUpdate;
  });
  // click(x,y) emits another move before pressing, invalidating the candidate.
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(
    () => window.__pcolTestGame._currentController._model._gContext.inHand === 1,
  );
  const guide = page.locator('.controls-guide-box').filter({ hasText: 'BASIC CONTROLS' });
  await waitForActiveBasicGuide(page);
  if (await guide.isVisible()) {
    await guide.getByRole('button', { name: 'CLOSE', exact: true }).click();
    await guide.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  }
  await page.locator('#game-view').focus();
  await page.keyboard.press('w');
  await page.waitForFunction(
    () =>
      window.__pcolTestGame._currentController._activeSubControl ===
      window.__pcolTestGame._currentController._subControl.gaming,
  );
  await page.waitForFunction(() =>
    window.__pcolTestGame._currentController._playerCtls[0].stickCtl.isReadyToStroke(),
  );
  await waitForActiveBasicGuide(page);
  if (await guide.isVisible()) {
    await guide.getByRole('button', { name: 'CLOSE', exact: true }).click();
    await guide.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  }
  await page.locator('#game-view').focus();
  const beforePower = await page.evaluate(
    () => window.__pcolTestGame._currentController._playerCtls[0].strokePower,
  );
  await page.mouse.wheel(0, -500);
  await page.waitForFunction(
    (power) => window.__pcolTestGame._currentController._playerCtls[0].strokePower !== power,
    beforePower,
  );
  const afterPower = await page.evaluate(
    () => window.__pcolTestGame._currentController._playerCtls[0].strokePower,
  );
  assert.notEqual(beforePower, afterPower, 'Wheel should control power');
  await page.keyboard.press('Space');
  await page.waitForFunction(() =>
    window.__pcolTestGame._currentController._simulator._world.balls.some(
      (b) => b.v.lengthSq() > 0.01,
    ),
  );
  await page.screenshot({ path: path.join(output, `${browserName}-shot.png`) });
  await page.waitForFunction(
    () => window.__pcolTestGame._currentController._movieClip.duration > 0,
    undefined,
    { timeout: 30000 },
  );
  // Close a delayed first-use guide if it appeared during simulation.
  if (await guide.isVisible()) {
    await guide.getByRole('button', { name: 'CLOSE', exact: true }).click();
    await guide.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  }
  await page.locator('.replay-icon').click();
  await page.locator('.replay-control').waitFor();
  const duration = await page.evaluate(
    () => window.__pcolTestGame._currentController._movieClip.duration,
  );
  assert.ok(duration > 0);
  const replay = await checkReplay(page, browserName);
  return { beforePower, afterPower, replayDuration: duration, replay };
}

let tested = 0;
try {
  for (const candidate of candidates) {
    if (candidate.executablePath) {
      try {
        await access(candidate.executablePath);
      } catch {
        report.limitations.push(`${candidate.name} not installed`);
        continue;
      }
    }
    const browser = await chromium.launch({
      ...candidate,
      name: undefined,
      headless: true,
      args: [
        '--enable-unsafe-swiftshader',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    });
    const result = { name: candidate.name, version: browser.version() };
    openPages = [];
    let phase = 'home/render profile';
    console.log(`Testing ${result.name} ${result.version}`);
    try {
      const baseline = await pageFor(browser, 'baseline'),
        runtime = await pageFor(browser, 'runtime');
      const baselineProfile = await home(baseline.page, 'baseline');
      const runtimeProfile = await home(runtime.page, 'runtime');
      if (interiorDesignId && interiorDesignId !== 'interior-design-original') {
        // Only room meshes, materials, textures and lights are intentionally replaced.
        // All engine, camera and subsequent physics/rules/replay assertions remain identical.
        const preservedProfile = (profile) =>
          Object.fromEntries(
            Object.entries(profile).filter(
              ([key]) => !['meshes', 'materials', 'textureCount', 'lights'].includes(key),
            ),
          );
        assert.deepEqual(preservedProfile(runtimeProfile), preservedProfile(baselineProfile));
        assert.equal(
          await runtime.page.evaluate(
            () => window.__pcolTestGame._gView._scene.metadata.interiorDesign.id,
          ),
          interiorDesignId,
        );
      } else {
        assert.deepEqual(runtimeProfile, baselineProfile, 'Rendering/camera profile changed');
        assert.equal(
          await runtime.page.evaluate(
            () => window.__pcolTestGame._gView._scene.metadata.interiorDesign.id,
          ),
          'interior-design-original',
        );
      }
      await runtime.page.screenshot({ path: path.join(output, `${candidate.name}-home.png`) });
      // Presentation is intentionally replaced; physics and scene fixtures remain paired below.
      const runtimeCSS = await readStylesheet(
        sourceMode
          ? path.join(sourceFixture, 'src/presentation/styles/game.css')
          : path.join(ROOT, `${BUILD_OUTPUTS.development}/styles/game.css`),
      );
      assert.doesNotMatch(runtimeCSS, /#game-loading|\.intro-container|\.about-box|\.endless-r/);
      const menuAppearance = await runtime.page
        .locator('.interior-home-menu')
        .evaluate((element) => {
          const style = window.getComputedStyle(element);
          return {
            position: style.position,
            text: style.getPropertyValue('--interior-text').trim(),
          };
        });
      assert.deepEqual(menuAppearance, { position: 'absolute', text: '#f1f0e9' });
      phase = 'entry/physics fixtures';
      await enterGame(baseline.page);
      await enterGame(runtime.page);
      const gameFonts = await runtime.page.evaluate(() => {
        return [...document.querySelectorAll('.score-container .head, .shortcuts-bar a, button')]
          .filter((element) => !element.closest('.interior-drawer, .interior-transition'))
          .map((element) => ({
            family: window.getComputedStyle(element).fontFamily,
            weight: window.getComputedStyle(element).fontWeight,
            compactControl: element.matches(
              '.game-ui-dismiss, .game-ui-icon-button, .game-ui-replay .sprite-button-std',
            ),
          }));
      });
      assert.ok(gameFonts.length > 0);
      assert.ok(
        gameFonts.every(
          (font) =>
            font.family.includes(
              font.compactControl ? 'Saira ExtraCondensed SemiBold' : 'Saira ExtraCondensed Bold',
            ) && font.weight === (font.compactControl ? '600' : '700'),
        ),
      );
      phase = 'snooker scoring/fouls/turns';
      const baselineRules = await snookerRules(
        baseline.page,
        path.join(output, `${candidate.name}-baseline-rules.json`),
      );
      const runtimeRules = await snookerRules(
        runtime.page,
        path.join(output, `${candidate.name}-rules.json`),
      );
      assert.deepEqual(runtimeRules, baselineRules, 'Snooker rule states diverged');
      result.rules = runtimeRules.fixtures.map(({ name, rounds, replacement }) => ({
        name,
        rounds: rounds.length,
        cueReplacementVerified: Boolean(replacement),
      }));
      phase = 'physics fixtures';
      const baselinePhysics = await physicsFixtures(baseline.page);
      const runtimePhysics = await physicsFixtures(runtime.page);
      assert.deepEqual(runtimePhysics, baselinePhysics, 'Physics fixture frames diverged');
      assert.ok(
        runtimePhysics.fixtures.some((f) => f.contacts.ball > 0),
        'Fixtures should exercise ball collision',
      );
      assert.ok(
        runtimePhysics.fixtures.some((f) => f.contacts.cushion > 0),
        'Fixtures should exercise cushion collision',
      );
      assert.ok(
        runtimePhysics.fixtures.some((f) => f.removed.length > 0),
        'Fixtures should exercise a pocket/fall',
      );
      assertClean(baseline.observations);
      assertClean(runtime.observations);
      await writeFile(
        path.join(output, `${candidate.name}-physics.json`),
        JSON.stringify(runtimePhysics) + '\n',
      );
      await baseline.context.close();
      await runtime.context.close();
      phase = 'cue placement/shot/replay';
      const gameplay = await pageFor(browser, 'runtime');
      await home(gameplay.page, 'runtime');
      await enterGame(gameplay.page, true);
      const runtimeInitial = await gameState(gameplay.page);
      result.gameplay = { mode: 'practice', ...(await playShot(gameplay.page, candidate.name)) };
      phase = 'runtime replay exit/continued play/restart';
      const runtimeRecovery = await gameRecovery(gameplay.page, runtimeInitial);
      await writeFile(
        path.join(output, `${candidate.name}-runtime-recovery.json`),
        JSON.stringify(runtimeRecovery.trace, null, 2) + '\n',
      );
      assertClean(gameplay.observations);
      result.renderProfile = runtimeProfile;
      result.physics = runtimePhysics.fixtures.map(({ name, contacts, removed, frames }) => ({
        name,
        contacts,
        removed,
        sampledFrames: frames.length,
      }));
      result.externalRequests = gameplay.observations.external.length;
      result.failedResponses = gameplay.observations.failedResponses.length;
      result.pageErrors = gameplay.observations.pageErrors.length;
      await gameplay.context.close();
      phase = 'baseline replay exit/continued play/restart';
      const recoveryBaseline = await pageFor(browser, 'baseline');
      await home(recoveryBaseline.page, 'baseline');
      await enterGame(recoveryBaseline.page, true);
      const baselineInitial = await gameState(recoveryBaseline.page);
      await playShot(recoveryBaseline.page, `${candidate.name}-baseline`);
      const baselineRecovery = await gameRecovery(recoveryBaseline.page, baselineInitial);
      assert.deepEqual(
        runtimeRecovery.summary,
        baselineRecovery.summary,
        'Recovery outcomes diverged',
      );
      assert.deepEqual(
        runtimeRecovery.trace.restarted.balls,
        baselineRecovery.trace.restarted.balls,
        'Restarted layouts diverged',
      );
      await writeFile(
        path.join(output, `${candidate.name}-baseline-recovery.json`),
        JSON.stringify(baselineRecovery.trace, null, 2) + '\n',
      );
      assertClean(recoveryBaseline.observations);
      result.recovery = runtimeRecovery.summary;
      await recoveryBaseline.context.close();
      // Uninstrumented production startup: verifies the actual bytes shipped to users.
      phase = 'uninstrumented startup/about';
      const normal = await pageFor(browser, 'runtime', false);
      await normal.page.goto(origin + '/pcol/' + interiorQuery);
      await normal.page.locator('.side-button').filter({ hasText: 'SINGLE PLAY' }).waitFor();
      await normal.page.locator('.side-button').filter({ hasText: 'ABOUT' }).click();
      await normal.page.locator('span.name').waitFor();
      assert.equal(await normal.page.locator('span.name').innerText(), 'ZIANG ZHANG');
      assert.equal(
        await normal.page.locator('a.name').count(),
        0,
        'Author credit should not be a link',
      );
      assert.equal(await normal.page.getByText('SEE HERE.', { exact: true }).count(), 0);
      result.aboutAuthorLinksRemoved = true;
      assertClean(normal.observations);
      await normal.context.close();
      phase = 'mobile fallback';
      const fallback = await pageFor(browser, 'runtime', false, {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      });
      await fallback.page.goto(origin + '/' + interiorQuery);
      await fallback.page.getByText('UNSUPPORTED DEVICE...', { exact: true }).waitFor();
      assert.equal(await fallback.page.locator('#intro, #game-loading, .browsers').count(), 0);
      assert.equal(
        await fallback.page.locator('#interior-transition[data-state="error"]').isVisible(),
        true,
      );
      assert.equal(
        await fallback.page.getByRole('button', { name: 'RETRY', exact: true }).isEnabled(),
        true,
      );
      assertClean(fallback.observations);
      result.fallbackAuthorLinksRemoved = true;
      await fallback.context.close();
      result.passed = true;
      report.browsers.push(result);
      tested++;
      console.log(
        `${candidate.name}: offline startup, render profile, physics, snooker rules, replay, continued play/restart, and mobile fallback passed`,
      );
    } catch (error) {
      result.passed = false;
      result.phase = phase;
      result.error = error.stack;
      try {
        result.diagnostics = await captureFailure(openPages, output, candidate.name, error, phase);
      } catch (failure) {
        result.diagnosticsError = failure.message;
      }
      report.browsers.push(result);
      throw error;
    } finally {
      await browser.close();
    }
  }
  assert.ok(tested > 0, 'No browser was tested; install Chromium or set PCOL_BROWSER_PATH');
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error.stack;
  throw error;
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await new Promise((resolve) => server.close(resolve));
  if (sourceFixture) {
    await removeBuildPath(ROOT, sourceFixture);
  }
}
