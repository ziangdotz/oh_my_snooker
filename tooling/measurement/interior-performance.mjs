/* global window, document, performance */
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { clearTimeout } from 'node:timers';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ROOT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import { inspectSourceEntry, inspectRuntimeEntry } from '../testing/runtime-inspection.mjs';
import { createServer } from '../server/static-server.mjs';
import { verifyBuild } from '../build/verify-build.mjs';
import { sha256 } from '../lib/integrity.mjs';

function statistics(values) {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const percentile = (ratio) => sorted[Math.ceil(sorted.length * ratio) - 1];
  return {
    samples: values.length,
    median: percentile(0.5),
    p95: percentile(0.95),
    p99: percentile(0.99),
    max: sorted.at(-1),
    mean: values.reduce((sum, value) => sum + value, 0) / values.length,
  };
}

async function sample(browser, origin, design, mode, options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: options.dpr,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) => errors.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()}: ${response.url()}`);
    }
  });
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) {
      errors.push('External request: ' + url.href);
      return route.abort();
    }
    if (['/runtime/source-entry.js', '/application/launch-game.js'].includes(url.pathname)) {
      const source = await readFile(path.join(ROOT, 'src', url.pathname.slice(1)), 'utf8');
      return route.fulfill({
        contentType: 'text/javascript',
        body: inspectSourceEntry(source, { application: url.pathname.includes('launch-game') }),
      });
    }
    if (url.pathname === '/scripts/runtime-bootstrap.js') {
      const source = await readFile(
        path.join(ROOT, BUILD_OUTPUTS.development, url.pathname.slice(1)),
        'utf8',
      );
      return route.fulfill({ contentType: 'text/javascript', body: inspectRuntimeEntry(source) });
    }
    await route.continue();
  });
  try {
    await page.goto(origin + '/?interior=' + design);
    await page.waitForFunction(
      () =>
        document.querySelector('.interior-transition')?.dataset.state === 'error' ||
        (window.__pcolTestGame?._currentController?.state === 3 &&
          window.__pcolTestGame._currentController._homeMainMenu?.isActive),
    );
    if ((await page.locator('.interior-transition').getAttribute('data-state')) === 'error') {
      throw new Error('Venue startup failed before measurement');
    }
    await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).waitFor();
    await page.waitForFunction(() => window.__pcolTestGame?._gView?._scene?.isReady());
    await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
    await page.waitForFunction(() => {
      const game = window.__pcolTestGame;
      return (
        game._currentController._state === 3 &&
        game._currentController._simulator?._world?.environmentReady &&
        game._gView._scene.isReady() &&
        !game._uiLayer.isBlocked &&
        document.getElementById('game-view').style.opacity === '1'
      );
    });
    // Leave ball-in-hand through the real input path so its timed placement tip cannot
    // redirect the camera during the movement sample.
    await page.locator('#game-view').focus();
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => window.__pcolTestGame._currentController._activeSubControl?.name === 'gaming',
    );
    const environment = await page.evaluate((mode) => {
      const game = window.__pcolTestGame;
      const scene = game._gView._scene;
      const engine = game._engine;
      const gl = engine._gl;
      const debug = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null;
      const shadows = scene.lights.map((light) => light.getShadowGenerator()).filter(Boolean);
      if (mode === 'redrawn') {
        for (const shadow of shadows) {
          shadow.getShadowMap().refreshRate = 1;
        }
      } else if (mode !== 'current') {
        for (const shadow of shadows) {
          shadow.getShadowMap().refreshRate = 0;
        }
      }
      if (mode === 'cached-no-relief') {
        for (const material of scene.materials) {
          if (material.metadata?.interiorSurface) {
            material.metadata.interiorSurface[0] = 0;
          }
        }
      }
      if (mode === 'cached-four-lights') {
        for (const light of scene.lights) {
          if (/(?:window-light-|wall-lamp-light-)/.test(light.name)) {
            light.setEnabled(false);
          }
        }
        // The game freezes material readiness after entering a controller. Recompile
        // this diagnostic variant before collecting samples, never in source files.
        for (const material of scene.materials) {
          if (material.metadata?.interiorSurface) {
            material.unfreeze();
          }
        }
      }
      return {
        renderer,
        vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
        webglVersion: engine.webGLVersion,
        antialias: gl.getContextAttributes().antialias,
        samples: gl.getParameter(gl.SAMPLES),
        hardwareScaling: engine.getHardwareScalingLevel(),
        drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
        devicePixelRatio: window.devicePixelRatio,
        timerQueryAvailable: Boolean(engine.getCaps().timerQuery),
        roomMeshes: scene.metadata?.interiorDesign?.meshCount || 0,
        triangles: scene.meshes.reduce((sum, mesh) => sum + mesh.getTotalIndices() / 3, 0),
        shadowSizes: shadows.map((shadow) => shadow.getShadowMap().getRenderSize()),
        shadowRefreshRates: shadows.map((shadow) => shadow.getShadowMap().refreshRate),
      };
    }, mode);
    assert.ok(environment.renderer, 'GPU renderer identity unavailable');
    assert.doesNotMatch(environment.renderer, /swiftshader|llvmpipe|software|warp|basic render/i);
    await page.keyboard.down('KeyD');
    const trace = await page.evaluate(async (seconds) => {
      const game = window.__pcolTestGame;
      const scene = game._gView._scene;
      const engine = game._engine;
      const B = window.__pcolTestRequire('adapters/rendering/babylon-engine');
      const gpu = new B.EngineInstrumentation(engine);
      gpu.captureGPUFrameTime = true;
      const frames = [];
      const gpuMs = [];
      const shadowRenders = scene.lights
        .map((light) => light.getShadowGenerator())
        .filter(Boolean)
        .map((shadow) => ({ map: shadow.getShadowMap(), count: 0, observer: null }));
      const start = performance.now();
      const warmupMs = 1500;
      const end = start + warmupMs + seconds * 1000;
      let lastRender = null;
      let renderStarted = 0;
      let drawCallsStarted = 0;
      let gpuCount = gpu.gpuFrameTimeCounter._totalValueCount;
      const positionBefore = scene.activeCamera.position.asArray();
      for (const entry of shadowRenders) {
        entry.observer = entry.map.onBeforeRenderObservable.add(() => {
          if (performance.now() >= start + warmupMs) {
            entry.count++;
          }
        });
      }
      const before = scene.onBeforeRenderObservable.add(() => {
        renderStarted = performance.now();
        drawCallsStarted = engine._drawCalls.current;
      });
      const after = scene.onAfterRenderObservable.add(() => {
        const now = performance.now();
        if (now >= start + warmupMs) {
          if (lastRender !== null) {
            frames.push({
              intervalMs: renderStarted - lastRender,
              submissionMs: now - renderStarted,
              drawCalls: engine._drawCalls.current - drawCallsStarted,
              activeMeshes: scene.getActiveMeshes().length,
            });
          }
          lastRender = renderStarted;
        }
      });
      await new Promise((resolve) => {
        const observer = engine.onEndFrameObservable.add(() => {
          const counter = gpu.gpuFrameTimeCounter;
          if (performance.now() >= start + warmupMs && counter._totalValueCount !== gpuCount) {
            gpuCount = counter._totalValueCount;
            if (counter.current > 0) {
              gpuMs.push(counter.current / 1000000);
            }
          }
          if (performance.now() >= end) {
            engine.onEndFrameObservable.remove(observer);
            resolve();
          }
        });
      });
      scene.onBeforeRenderObservable.remove(before);
      scene.onAfterRenderObservable.remove(after);
      for (const entry of shadowRenders) {
        entry.map.onBeforeRenderObservable.remove(entry.observer);
      }
      gpu.dispose();
      return {
        frames,
        gpuMs,
        shadowRenders: shadowRenders.map(({ map, count }) => ({ name: map.name, count })),
        positionBefore,
        positionAfter: scene.activeCamera.position.asArray(),
      };
    }, options.seconds);
    await page.keyboard.up('KeyD');
    assert.deepEqual(errors, []);
    assert.ok(trace.frames.length >= 20, 'Too few rendered movement samples');
    assert.notDeepEqual(trace.positionBefore, trace.positionAfter, 'Camera did not move');
    return {
      design,
      mode,
      environment,
      intervalsMs: statistics(trace.frames.map((frame) => frame.intervalMs)),
      submissionMs: statistics(trace.frames.map((frame) => frame.submissionMs)),
      drawCalls: statistics(trace.frames.map((frame) => frame.drawCalls)),
      gpuFrameMs: statistics(trace.gpuMs),
      intervalsOver25Ms: trace.frames.filter((frame) => frame.intervalMs > 25).length,
      intervalsOver50Ms: trace.frames.filter((frame) => frame.intervalMs > 50).length,
      ...trace,
      errors,
    };
  } catch (error) {
    error.stack += '\nPage errors: ' + JSON.stringify(errors);
    error.stack +=
      '\nStartup state: ' +
      JSON.stringify(
        await page
          .evaluate(() => ({
            text: document.body.innerText,
            state: window.__pcolTestGame?._gView?.state,
            ready: window.__pcolTestGame?._gView?._scene?.isReady(),
            controllerState: window.__pcolTestGame?._currentController?.state,
            pendingAssets: window.__pcolTestGame?._gView?._stickManager?.pendingCount,
            sceneReadyObservers:
              window.__pcolTestGame?._gView?._scene?.onReadyObservable._observers.length,
            sceneReadyTimer: window.__pcolTestGame?._gView?._scene?._executeWhenReadyTimeoutId,
            timer: window.__pcolTestGame?._gTimer && {
              frames: window.__pcolTestGame._gTimer.frames,
              duration: window.__pcolTestGame._gTimer.duration,
              dt: window.__pcolTestGame._gTimer.dt,
            },
            enterTween: window.__pcolTestGame?._currentController?._enterAnimation && {
              needsUpdate: window.__pcolTestGame._currentController._enterAnimation.needsUpdate,
              renderedTime: window.__pcolTestGame._currentController._enterAnimation.renderedTime,
              duration: window.__pcolTestGame._currentController._enterAnimation.duration,
            },
            visibility: document.visibilityState,
            renderLoops: window.__pcolTestGame?._engine?._activeRenderLoops.length,
            unreadyMaterials: window.__pcolTestGame?._gView?._scene?.materials
              .filter((material) => material.getEffect() && !material.getEffect().isReady())
              .map((material) => ({
                name: material.name,
                error: material.getEffect().getCompilationError(),
              })),
          }))
          .catch(() => null),
      );
    throw error;
  } finally {
    await context.close();
  }
}

/** Hardware-only, sequential real-keyboard comparison; no global clock/API replacement. */
export async function measureInteriorPerformance(options) {
  const directory = path.join(ROOT, 'reports/measurement');
  await mkdir(directory, { recursive: true });
  const filename = path.join(directory, 'interior-performance-' + options.label + '.json');
  const executablePath =
    process.env.PCOL_BROWSER_PATH ||
    (options.browser === 'edge'
      ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
      : 'C:/Program Files/Google/Chrome/Application/chrome.exe');
  const built = options.target === 'development';
  if (built) {
    await verifyBuild('development');
  }
  const server = built
    ? createServer()
    : spawn(process.execPath, ['src/start.mjs', '--port', '0'], {
        cwd: ROOT,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
  let browser;
  const report = {
    date: new Date().toISOString(),
    options: { ...options, viewport: { width: 1440, height: 900 } },
    method:
      'Actual D-key orbit; 1.5s warmup, sequential hardware runs. Redrawn restores the previous every-frame shadow policy in the warmed page; current uses maintained settings. All ablations are page-only diagnostics.',
    lightingSHA256: sha256(
      await readFile(path.join(ROOT, 'src/presentation/scenes/interior-lighting.js')),
    ),
    samples: [],
    passed: false,
    limitations: [
      'Submission time measures CPU/driver submission, not pure GPU duration.',
      'GPU durations are optional asynchronous timer-query samples, separate from frame intervals.',
      'Real keyboard orbit preserves original per-frame camera behavior; trajectories are not identical across frame rates.',
      'Light/relief ablations change diagnostic appearance and are not proposed production settings.',
      'Results describe this machine, browser, viewport and DPR, not all hardware.',
    ],
  };
  try {
    const origin = built
      ? await new Promise((resolve, reject) => {
          server.once('error', reject);
          server.listen(0, '127.0.0.1', () => resolve('http://127.0.0.1:' + server.address().port));
        })
      : await new Promise((resolve, reject) => {
          let output = '';
          let errors = '';
          const timer = setTimeout(
            () => reject(new Error('Source startup timed out: ' + errors)),
            10000,
          );
          function finish(error, origin) {
            clearTimeout(timer);
            if (error) {
              reject(error);
            } else {
              resolve(origin);
            }
          }
          server.stderr.on('data', (bytes) => {
            errors = (errors + bytes).slice(-16384);
          });
          server.stdout.on('data', (bytes) => {
            output += bytes;
            const match = output.match(/http:\/\/127\.0\.0\.1:[0-9]+/);
            if (match) {
              finish(null, match[0]);
            }
          });
          server.once('error', (error) => finish(error));
          server.once('exit', (code) =>
            finish(new Error('Source server exited: ' + code + ' ' + errors)),
          );
        });
    browser = await chromium.launch({ executablePath, headless: true });
    report.browserVersion = browser.version();
    for (const design of options.design
      ? [options.design]
      : [
          'interior-design-original',
          'interior-design-001',
          'interior-design-002',
          'interior-design-003',
        ]) {
      for (let run = 0; run < options.runs; run++) {
        // Alternate order to limit warm-cache/thermal bias.
        const modes = run % 2 === 0 ? ['redrawn', 'current'] : ['current', 'redrawn'];
        for (const mode of modes) {
          const result = await sample(browser, origin, design, mode, report.options);
          report.samples.push({ run: run + 1, ...result });
          console.log(
            `${design} ${mode} ${run + 1}: median ${result.intervalsMs.median.toFixed(2)}ms, p95 ${result.intervalsMs.p95.toFixed(2)}ms, draws ${result.drawCalls.median}`,
          );
          await writeFile(filename, JSON.stringify(report, null, 2) + '\n');
        }
      }
      if (design !== 'interior-design-original') {
        for (const mode of ['cached-no-relief', 'cached-four-lights']) {
          const result = await sample(browser, origin, design, mode, report.options);
          report.samples.push({ run: 1, ...result });
          console.log(
            `${design} ${mode}: p95 ${result.intervalsMs.p95.toFixed(2)}ms, draws ${result.drawCalls.median}`,
          );
        }
      }
    }
    report.passed = true;
  } catch (error) {
    report.error = error.stack;
    throw error;
  } finally {
    await writeFile(filename, JSON.stringify(report, null, 2) + '\n');
    await browser?.close();
    if (built) {
      await new Promise((resolve) => server.close(resolve));
    } else if (server.exitCode === null && server.signalCode === null) {
      const stopped = once(server, 'exit');
      server.kill();
      await stopped;
    }
    console.log('Saved ' + path.relative(ROOT, filename));
  }
}
