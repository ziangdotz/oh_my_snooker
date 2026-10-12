import { clearTimeout } from 'node:timers';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { ROOT } from '../../config/project.config.mjs';
import { inspectSourceEntry } from '../../tooling/testing/runtime-inspection.mjs';
import { waitForCamera } from './browser-observations.mjs';

const probeDpr = 2;
const reportPath = path.join(ROOT, 'reports/measurement/gameplay-motion-after.json');
const output = path.join(ROOT, 'artifacts/testing/gameplay-motion');
await mkdir(output, { recursive: true });
const report = {
  date: new Date().toISOString(),
  method: `Optimized source game, actual mouse/keyboard, Chrome/Edge hardware WebGL, 1440x900 DPR${probeDpr}, GPU timer queries disabled. Real aim direction changes and Alt-drag spin tip changes supplement walking and shooting. No clock, RAF or WebGL replacement. Input latency is event-to-observed-render, not display latency.`,
  scenarios: [],
  limitations: [
    'Short Practice sessions; not a full match or long-term endurance test.',
    'Only this GPU and browser renderer, 60Hz schedule; no claim about subjective display ghosting.',
    'GPU instrumentation and automation introduce some overhead. Transition render gaps can include intentional on-demand idle frames.',
  ],
};
const server = spawn(process.execPath, ['src/start.mjs', '--port', '0'], {
  cwd: ROOT,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
const origin = await new Promise((resolve, reject) => {
  let out = '';
  const timer = setTimeout(() => reject(new Error('Server timeout')), 10000);
  server.stdout.on('data', (bytes) => {
    out += bytes;
    const m = out.match(/http:\/\/127\.0\.0\.1:[0-9]+/);
    if (m) {
      clearTimeout(timer);
      resolve(m[0]);
    }
  });
  server.once('error', reject);
});
async function save() {
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
}
async function closeGuide(page) {
  const guide = page.locator('.controls-guide-box:visible');
  if (await guide.count()) {
    await guide.getByRole('button', { name: 'CLOSE', exact: true }).click();
    await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  }
}
async function traceStart(page, name) {
  await page.evaluate((name) => window.__smoothnessStart(name), name);
}
async function traceEnd(page) {
  return page.evaluate(() => window.__smoothnessEnd());
}
async function place(page) {
  if (
    await page.evaluate(
      () => window.__pcolTestGame._currentController._activeSubControl.name !== 'inHand',
    )
  ) {
    return;
  }
  await waitForCamera(page);
  for (const z of [0.12, -0.12, 0, 0.2, -0.2]) {
    const point = await page.evaluate((z) => {
      const g = window.__pcolTestGame;
      const B = window.__pcolTestRequire('adapters/rendering/babylon-engine');
      const v = g._gView;
      const canvas = document.getElementById('game-view');
      const rect = canvas.getBoundingClientRect();
      const p = B.Vector3.Project(
        new B.Vector3(-1.18, 0.02625, z).add(v._playArea.position),
        B.Matrix.Identity(),
        v._scene.getTransformMatrix(),
        v._scene.activeCamera.viewport.toGlobal(
          g._engine.getRenderWidth(),
          g._engine.getRenderHeight(),
        ),
      );
      return {
        x: rect.x + (p.x * rect.width) / g._engine.getRenderWidth(),
        y: rect.y + (p.y * rect.height) / g._engine.getRenderHeight(),
      };
    }, z);
    await page.mouse.move(point.x, point.y);
    await page.waitForFunction(
      () => !window.__pcolTestGame._currentController._activeSubControl._needsUpdate,
    );
    if (
      await page.evaluate(
        () => window.__pcolTestGame._currentController._activeSubControl._isValidSpot,
      )
    ) {
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForFunction(
        () => window.__pcolTestGame._currentController._activeSubControl.name === 'gaming',
      );
      return;
    }
  }
  throw new Error('No legal D-zone placement');
}
async function runScenario(browserName, design, round) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: probeDpr,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  const scenario = {
    browser: browserName,
    version: browser.version(),
    design,
    round,
    phases: [],
    errors: [],
  };
  report.scenarios.push(scenario);
  page.on('pageerror', (e) => scenario.errors.push(e.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      scenario.errors.push('External request ' + url.href);
      return route.abort();
    }
    if (['/runtime/source-entry.js', '/application/launch-game.js'].includes(url.pathname)) {
      const source = await readFile(path.join(ROOT, 'src', url.pathname.slice(1)), 'utf8');
      return route.fulfill({
        contentType: 'text/javascript',
        body: inspectSourceEntry(source, { application: url.pathname.includes('launch-game') }),
      });
    }
    await route.continue();
  });
  try {
    await page.goto(origin + '/?interior=' + design);
    await page.waitForFunction(
      () =>
        window.__pcolTestGame?._currentController?.state === 3 &&
        window.__pcolTestGame._currentController._homeMainMenu?.isActive &&
        window.__pcolTestGame._gView._scene.isReady(),
    );
    await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
    await page.waitForFunction(() => {
      const g = window.__pcolTestGame;
      return (
        g._currentController.state === 3 &&
        g._currentController._simulator?._world?.environmentReady &&
        !g._uiLayer.isBlocked &&
        g._gView._scene.isReady()
      );
    });
    await place(page);
    assert.equal(
      await page.evaluate(() => window.__pcolTestGame._uiLayer.isBlocked),
      true,
      'Guide must open before the first movement',
    );
    await page.locator('.controls-guide-box:visible').waitFor({ timeout: 10000 });
    await closeGuide(page);
    await page.locator('#game-view').focus();
    scenario.environment = await page.evaluate(() => {
      const g = window.__pcolTestGame,
        s = g._gView._scene,
        e = g._engine,
        gl = e._gl,
        debug = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null,
        webGLVersion: e.webGLVersion,
        samples: gl.getParameter(gl.SAMPLES),
        drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        hardwareScaling: e.getHardwareScalingLevel(),
        triangles: s.meshes.reduce((sum, m) => sum + m.getTotalIndices() / 3, 0),
        lights: s.lights.map((l) => ({ name: l.name, enabled: l.isEnabled() })),
        roomMeshes: s.metadata?.interiorDesign?.meshCount || 0,
      };
    });
    assert.deepEqual(scenario.environment.drawingBuffer, [2160, 1350]);
    assert.equal(scenario.environment.hardwareScaling, 2 / 3);
    assert.ok(scenario.environment.renderer);
    assert.doesNotMatch(scenario.environment.renderer, /swiftshader|software|warp|llvmpipe/i);
    await page.evaluate(() => {
      const g = window.__pcolTestGame,
        s = g._gView._scene,
        e = g._engine,
        B = window.__pcolTestRequire('adapters/rendering/babylon-engine');
      const gpu = new B.EngineInstrumentation(e);
      gpu.captureGPUFrameTime = false;
      let trace = null,
        renderStart = 0,
        lastGpuCount = gpu.gpuFrameTimeCounter._totalValueCount;
      const pose = () => [
        ...s.activeCamera.position.asArray(),
        ...s.activeCamera.lockedTarget.asArray(),
      ];
      const before = s.onBeforeRenderObservable.add(() => {
        renderStart = window.performance.now();
      });
      const after = s.onAfterRenderObservable.add(() => {
        if (!trace) {
          return;
        }
        const now = window.performance.now(),
          p = pose(),
          sim = g._currentController._simulator;
        const moving = sim._world.balls.some((b) => b.v.lengthSq() > 0.01);
        if (moving && trace.firstBallMotionMs === null) {
          trace.firstBallMotionMs = now - trace.start;
        }
        if (
          trace.firstPoseChangeMs === null &&
          p.some((x, i) => Math.abs(x - trace.initialPose[i]) > 1e-6)
        ) {
          trace.firstPoseChangeMs = now - trace.start;
        }
        const horizon = g._currentController._playerCtls[0]._horizonCtl;
        trace.frames.push({
          timeMs: renderStart - trace.start,
          intervalMs: trace.last === null ? null : renderStart - trace.last,
          submissionMs: now - renderStart,
          pose: p,
          orbitAngle: horizon._tracks[horizon._activeTrackIndex].angle,
          ballMoving: moving,
          dt: g._gTimer.dt,
          drawCalls: e._drawCalls.current,
        });
        trace.last = renderStart;
      });
      const end = e.onEndFrameObservable.add(() => {
        const c = gpu.gpuFrameTimeCounter;
        if (trace && c._totalValueCount !== lastGpuCount && c.current > 0) {
          trace.gpuMs.push(c.current / 1e6);
        }
        lastGpuCount = c._totalValueCount;
      });
      const input = (event) => {
        if (trace) {
          trace.inputs.push({
            type: event.type,
            key: event.code || null,
            timeMs: window.performance.now() - trace.start,
          });
        }
      };
      document.addEventListener('keydown', input, true);
      document.addEventListener('keyup', input, true);
      document.addEventListener('pointermove', input, true);
      document.addEventListener('wheel', input, true);
      let obs;
      try {
        obs = new window.PerformanceObserver((list) => {
          if (trace) {
            trace.longTasks.push(
              ...list
                .getEntries()
                .map((x) => ({ start: x.startTime - trace.start, duration: x.duration })),
            );
          }
        });
        obs.observe({ type: 'longtask', buffered: false });
      } catch {
        /* Long-task observation is optional on this browser. */
      }
      window.__smoothnessStart = (name) => {
        trace = {
          name,
          start: window.performance.now(),
          last: null,
          initialPose: pose(),
          frames: [],
          gpuMs: [],
          inputs: [],
          longTasks: [],
          firstPoseChangeMs: null,
          firstBallMotionMs: null,
        };
      };
      window.__smoothnessEnd = () => {
        const result = trace;
        trace = null;
        result.elapsedMs = window.performance.now() - result.start;
        delete result.last;
        delete result.start;
        return result;
      };
      window.__smoothnessDispose = () => {
        s.onBeforeRenderObservable.remove(before);
        s.onAfterRenderObservable.remove(after);
        e.onEndFrameObservable.remove(end);
        gpu.dispose();
        obs?.disconnect();
      };
    });
    // Warm the real movement path before steady-state measurement.
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyD');
    await waitForCamera(page);
    await closeGuide(page);
    await page.locator('#game-view').focus();
    for (const key of ['KeyD', 'KeyA']) {
      await traceStart(page, key === 'KeyD' ? 'orbit-clockwise' : 'orbit-counterclockwise');
      await page.keyboard.down(key);
      await page.waitForTimeout(4000);
      await page.keyboard.up(key);
      const movement = await traceEnd(page);
      assert.ok(movement.frames.length > 100, 'Orbit must actually render and move');
      assert.ok(movement.firstPoseChangeMs !== null, 'Orbit must change camera');
      scenario.phases.push(movement);
      await traceStart(page, 'orbit-release-' + key);
      await waitForCamera(page);
      scenario.phases.push(await traceEnd(page));
    }
    if (round === 1) {
      await page.screenshot({ path: path.join(output, `${browserName}-${design}-standing.png`) });
    }
    await traceStart(page, 'standing-mouse-look');
    await page.mouse.move(720, 420);
    await page.mouse.down();
    for (let i = 0; i < 36; i++) {
      await page.mouse.move(
        720 + 120 * Math.sin((i * Math.PI) / 18),
        420 + 40 * Math.sin((i * Math.PI) / 9),
      );
      await page.waitForTimeout(25);
    }
    await page.mouse.up();
    await waitForCamera(page);
    scenario.phases.push(await traceEnd(page));
    await traceStart(page, 'crouch-and-rise');
    await page.keyboard.down('KeyX');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyX');
    await waitForCamera(page);
    scenario.phases.push(await traceEnd(page));
    await closeGuide(page);
    await page.locator('#game-view').focus();
    await traceStart(page, 'enter-aim');
    await page.keyboard.press('KeyW');
    await page.waitForFunction(() =>
      window.__pcolTestGame._currentController._playerCtls[0].isReadyToStroke(),
    );
    await waitForCamera(page);
    scenario.phases.push(await traceEnd(page));
    await closeGuide(page);
    await page.locator('#game-view').focus();
    await traceStart(page, 'aim-mouse-look');
    await page.mouse.move(720, 420);
    await page.mouse.down();
    for (let i = 0; i < 24; i++) {
      await page.mouse.move(
        720 + 25 * Math.sin((i * Math.PI) / 12),
        420 + 12 * Math.sin((i * Math.PI) / 6),
      );
      await page.waitForTimeout(25);
    }
    await page.mouse.move(720, 420);
    await page.mouse.up();
    await waitForCamera(page);
    scenario.phases.push(await traceEnd(page));
    await traceStart(page, 'aim-direction-prediction');
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyA');
    await page.waitForTimeout(1500);
    await page.keyboard.up('KeyA');
    await waitForCamera(page);
    scenario.phases.push(await traceEnd(page));
    await traceStart(page, 'spin-tip-prediction');
    await page.mouse.move(720, 420);
    await page.keyboard.down('Alt');
    await page.mouse.down();
    for (let i = 0; i < 24; i++) {
      await page.mouse.move(
        720 + 4 * Math.sin((i * Math.PI) / 12),
        420 + 3 * Math.sin((i * Math.PI) / 6),
      );
      await page.waitForTimeout(25);
    }
    await page.mouse.move(720, 420);
    await page.mouse.up();
    await page.keyboard.up('Alt');
    await waitForCamera(page);
    scenario.phases.push(await traceEnd(page));
    const power = await page.evaluate(
      () => window.__pcolTestGame._currentController._playerCtls[0].strokePower,
    );
    await page.mouse.wheel(0, Math.round((0.5 - power) / 0.0005));
    await page.waitForFunction(
      () =>
        Math.abs(window.__pcolTestGame._currentController._playerCtls[0].strokePower - 0.5) < 1e-6,
    );
    await page.waitForFunction(() =>
      window.__pcolTestGame._currentController._playerCtls[0].isReadyToStroke(),
    );
    const rounds = await page.evaluate(() =>
      window.__pcolTestGame._currentController._model.getContext('nRounds'),
    );
    await page.locator('#game-view').focus();
    await traceStart(page, 'strike-and-roll');
    await page.keyboard.press('Space');
    await page.waitForFunction(
      (rounds) => window.__pcolTestGame._currentController._model.getContext('nRounds') > rounds,
      rounds,
      { timeout: 45000 },
    );
    scenario.phases.push(await traceEnd(page));
    scenario.shot = await page.evaluate(() => {
      const c = window.__pcolTestGame._currentController;
      return {
        rounds: c._model.getContext('nRounds'),
        shootingCount: c._model.players[0].shootingCount,
        replayDuration: c._movieClip.duration,
        activeControl: c._activeSubControl.name,
      };
    });
    await closeGuide(page);
    await place(page);
    await closeGuide(page);
    await page.screenshot({ path: path.join(output, `${browserName}-${design}-${round}.png`) });
    await page.evaluate(() => window.__smoothnessDispose());
    assert.equal(scenario.shot.shootingCount, 1);
    assert.deepEqual(scenario.errors, []);
    scenario.passed = true;
    console.log(
      `${browserName} ${design} round ${round}: ${scenario.phases.map((p) => p.name + ' ' + p.frames.length + 'f').join(', ')}`,
    );
  } catch (error) {
    scenario.error = error.stack;
    scenario.passed = false;
    scenario.state = await page
      .evaluate(() => ({
        body: document.body.innerText,
        controller: window.__pcolTestGame?._currentController?.state,
        sub: window.__pcolTestGame?._currentController?._activeSubControl?.name,
      }))
      .catch(() => null);
    await page
      .screenshot({ path: path.join(output, `${browserName}-${design}-${round}-failure.png`) })
      .catch(() => {});
    console.log(`${browserName} ${design}: FAILED ${error.message}`);
  } finally {
    await save();
    await context.close();
  }
}
try {
  for (const name of ['chrome', 'edge']) {
    const executablePath =
      name === 'chrome'
        ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
        : 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    browser = await chromium.launch({ executablePath, headless: true });
    for (let round = 1; round <= 1; round++) {
      const designs = [
        'interior-design-original',
        'interior-design-001',
        'interior-design-002',
        'interior-design-003',
      ];
      if (round === 2) {
        designs.reverse();
      }
      for (const design of designs) {
        await runScenario(name, design, round);
      }
    }
    await browser.close();
    browser = null;
  }
  report.passed = report.scenarios.length === 8 && report.scenarios.every((s) => s.passed);
  if (!report.passed) {
    process.exitCode = 1;
  }
} finally {
  await save();
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, 'exit');
    server.kill();
    await stopped;
  }
  console.log('Saved ' + reportPath);
}
