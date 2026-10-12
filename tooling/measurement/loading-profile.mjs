import { inspectRuntimeEntry } from '../testing/runtime-inspection.mjs';
/* global window, document */
import assert from 'node:assert/strict';
import path from 'node:path';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ROOT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import { verifyBuild } from '../build/verify-build.mjs';
import { sha256 } from '../lib/integrity.mjs';
import { createServer } from '../server/static-server.mjs';

function summary(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return {
    min: ordered[0],
    median:
      ordered.length % 2 === 1 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2,
    max: ordered.at(-1),
    samples: values.length,
  };
}

async function sample(browser, origin, entrypoint) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const errors = [],
    failures = [],
    external = [],
    responses = [],
    requests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('requestfailed', (request) =>
    failures.push({ url: request.url(), error: request.failure()?.errorText }),
  );
  page.on('request', (request) => requests.push(request.url()));
  page.on('response', (response) =>
    responses.push({
      path: new URL(response.url()).pathname,
      status: response.status(),
      bodyBytes: Number(response.headers()['content-length']) || 0,
    }),
  );
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (!url.startsWith(origin + '/')) {
      external.push(url);
      return route.abort('blockedbyclient');
    }
    if (new URL(url).pathname === '/scripts/runtime-bootstrap.js') {
      // Identical test-only inspection handle for both measurements; core chunks unchanged.
      return route.fulfill({ body: entrypoint, contentType: 'text/javascript' });
    }
    return route.continue();
  });
  try {
    await page.goto(origin + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const menu = [...document.querySelectorAll('.side-button')].find(
        (element) => element.textContent === 'SINGLE PLAY',
      );
      if (
        !menu?.getBoundingClientRect().height ||
        !window.__pcolLoadGame?._gView?._scene?.isReady()
      ) {
        return false;
      }
      window.__pcolLoadMenuMs = window.performance.now();
      return true;
    });
    await page.evaluate(() => {
      const practice = [...document.querySelectorAll('.side-button')].find(
        (element) => element.textContent === 'PRACTICE',
      );
      practice.addEventListener(
        'click',
        () => {
          window.__pcolLoadPracticeMs = window.performance.now();
        },
        { once: true, capture: true },
      );
    });
    await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
    await page.waitForFunction(() => {
      const game = window.__pcolLoadGame;
      const controller = game?._currentController;
      if (
        !controller?._simulator?._world?.environmentReady ||
        !game._gView._scene.isReady() ||
        controller._activeSubControl?.name !== 'inHand' ||
        document.querySelector('#game-view')?.style.opacity !== '1'
      ) {
        return false;
      }
      window.__pcolLoadSceneMs = window.performance.now();
      return true;
    });
    const timing = await page.evaluate(() => ({
      menuReadyMs: window.__pcolLoadMenuMs,
      sceneReadyMs: window.__pcolLoadSceneMs,
      practiceTransitionMs: window.__pcolLoadSceneMs - window.__pcolLoadPracticeMs,
      resources: window.performance.getEntriesByType('resource').map((entry) => ({
        path: new URL(entry.name).pathname,
        type: entry.initiatorType,
        startMs: entry.startTime,
        endMs: entry.responseEnd,
        durationMs: entry.duration,
        transferBytes: entry.transferSize,
        encodedBodyBytes: entry.encodedBodySize,
      })),
    }));
    assert.deepEqual(errors, [], 'Page error during measurement');
    assert.deepEqual(failures, [], 'Failed request during measurement');
    assert.deepEqual(external, [], 'External request during measurement');
    assert.ok(
      responses.every((response) => response.status === 200),
      'Non-200 resource response',
    );
    assert.ok(
      timing.menuReadyMs > 0 &&
        timing.sceneReadyMs >= timing.menuReadyMs &&
        timing.practiceTransitionMs > 0,
    );
    return {
      ...timing,
      requestCount: requests.length,
      encodedBodyBytes: timing.resources.reduce(
        (total, resource) => total + resource.encodedBodyBytes,
        0,
      ),
      responseBodyBytesFromHeaders: responses.reduce(
        (total, response) => total + response.bodyBytes,
        0,
      ),
      responses,
      pageErrors: errors,
      requestFailures: failures,
      externalRequests: external,
    };
  } finally {
    await context.close();
  }
}

export async function measureLoading({ label, runs }) {
  await verifyBuild('development');
  const directory = path.join(ROOT, 'reports/measurement');
  await mkdir(directory, { recursive: true });
  const entry = await readFile(
    path.join(ROOT, BUILD_OUTPUTS.development, 'scripts/runtime-bootstrap.js'),
    'utf8',
  );
  const inspectedEntry = inspectRuntimeEntry(entry, { gameHandle: '__pcolLoadGame' });
  const report = {
    schemaVersion: 1,
    label,
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    viewport: { width: 1440, height: 900 },
    runsPerBrowser: runs,
    serverSourceSHA256: sha256(await readFile(path.join(ROOT, 'tooling/server/static-server.mjs'))),
    buildManifestSHA256: sha256(
      await readFile(path.join(ROOT, BUILD_OUTPUTS.development, 'build-manifest.json')),
    ),
    method:
      'Fresh browser context each run; performance.now markers at observed menu+home scene ready and Practice input ready; original bytes except identical entrypoint inspection handle',
    limitations: [
      'Fresh browser contexts do not reset the OS filesystem cache or browser-process JIT.',
      'Headless software WebGL and small repeated samples describe this machine; no GPU/FPS or guaranteed speed claim.',
      'HTTP routing disables browser cache; server remains no-store; browser action/polling adds scheduling overhead.',
      'Resource timing byte totals exclude the document; response header totals include it and may omit the fulfilled entrypoint size.',
    ],
    browsers: [],
  };
  const candidates = process.env.PCOL_BROWSER_PATH
    ? [{ name: 'custom', executablePath: process.env.PCOL_BROWSER_PATH }]
    : process.platform === 'win32'
      ? [
          {
            name: 'chrome',
            executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
          },
          {
            name: 'edge',
            executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
          },
        ]
      : [{ name: 'chromium' }];
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
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
      const result = { name: candidate.name, version: browser.version(), samples: [] };
      report.browsers.push(result);
      try {
        for (let index = 0; index < runs; index++) {
          result.samples.push(await sample(browser, origin, inspectedEntry));
          console.log(`${label} ${candidate.name}: sample ${index + 1}/${runs}`);
        }
        result.summary = Object.fromEntries(
          [
            'menuReadyMs',
            'sceneReadyMs',
            'practiceTransitionMs',
            'requestCount',
            'encodedBodyBytes',
            'responseBodyBytesFromHeaders',
          ].map((key) => [key, summary(result.samples.map((item) => item[key]))]),
        );
      } finally {
        await browser.close();
      }
    }
    assert.ok(report.browsers.length > 0, 'No browser measured');
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.error = error.stack;
    throw error;
  } finally {
    report.finishedAt = new Date().toISOString();
    await writeFile(
      path.join(directory, `loading-${label}.json`),
      JSON.stringify(report, null, 2) + '\n',
    );
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(`Saved reports/measurement/loading-${label}.json`);
  return report;
}
