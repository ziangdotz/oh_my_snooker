import {
  snapshotManifests,
  compareManifestSnapshots,
} from '../../tooling/testing/manifest-snapshots.mjs';
import { buildPaths, withBuildLock } from '../../tooling/build/build-transaction.mjs';
import {
  inspectRuntimeEntry,
  runtimeEntryPath,
} from '../../tooling/testing/runtime-inspection.mjs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, LAYOUT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import { sha256, verifySnapshot } from '../../tooling/lib/integrity.mjs';
import { verifyBuild } from '../../tooling/build/verify-build.mjs';
import { createServer } from '../../tooling/server/static-server.mjs';
import { captureFailure, waitForCamera } from './browser-observations.mjs';
import { continuousPlay } from './continuous-play.mjs';

const options = { cycles: 3, shots: 6 };
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i] === '--cycles' ? 'cycles' : args[i] === '--shots' ? 'shots' : null;
  if (
    !key ||
    !/^\d+$/.test(args[i + 1] ?? '') ||
    Number(args[i + 1]) < 1 ||
    Number(args[i + 1]) > 20
  ) {
    throw new Error(
      'Usage: node tests/e2e/continuous-play.test.mjs [--cycles 1..20] [--shots 1..20]',
    );
  }
  options[key] = Number(args[i + 1]);
}
async function runSuite() {
  await verifySnapshot(LAYOUT.baseline, LAYOUT.baselineManifest);
  await verifyBuild('development');
  await verifyBuild('production');
  const manifestHashes = async () =>
    Object.fromEntries(
      await Promise.all(
        [
          LAYOUT.baselineManifest,
          `${BUILD_OUTPUTS.development}/build-manifest.json`,
          `${BUILD_OUTPUTS.production}/build-manifest.json`,
        ].map(async (file) => [file, sha256(await readFile(path.join(ROOT, file)))]),
      ),
    );
  const output = path.join(ROOT, 'artifacts/testing/continuous-play');
  await mkdir(output, { recursive: true });
  const report = {
    started: new Date().toISOString(),
    options,
    viewport: { width: 1440, height: 900 },
    networkPolicy: 'Only local server requests are allowed',
    instrumentation:
      'Test-only index loader inspection handles and passive model notifications. Real UI input and original autonomous AI, clocks, RNG, physics and rendering.',
    beforeManifestHashes: await manifestHashes(),
    beforeManifestSnapshots: await snapshotManifests(),
    buildIsolation: 'Hold development and production build locks for the complete suite',
    browsers: [],
    limitations: [
      'A bounded continuous session does not certify full matches or hours of unattended play.',
      'AI is stochastic: compare completion and restoration contracts, not exact scores or trajectories between runs.',
      'CDP heap and retained DOM counters are passive, without forced GC; report changes rather than asserting a leak from uncollected objects.',
      'Headless software WebGL does not measure real GPU performance. No frame-time optimization or engine changes are included.',
    ],
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
  const saveReport = () =>
    writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
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
        executablePath: candidate.executablePath,
        headless: true,
        args: [
          '--enable-unsafe-swiftshader',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
        ],
      });
      const entry = { name: candidate.name, version: browser.version(), routes: [] };
      report.browsers.push(entry);
      try {
        for (const routeName of ['baseline', 'runtime']) {
          const context = await browser.newContext({ viewport: report.viewport });
          const page = await context.newPage();
          const trace = {
            browser: candidate.name,
            route: routeName,
            started: new Date().toISOString(),
            observations: {
              external: [],
              failedResponses: [],
              pageErrors: [],
              requestFailures: [],
              crashes: [],
            },
          };
          entry.routes.push(trace);
          const observations = trace.observations;
          const save = () =>
            writeFile(
              path.join(output, `${candidate.name}-${routeName}.json`),
              JSON.stringify(trace, null, 2) + '\n',
            );
          page.on('pageerror', (e) => observations.pageErrors.push(e.message));
          page.on('crash', () => observations.crashes.push('Page crashed'));
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
            if (!url.startsWith(origin + '/')) {
              observations.external.push(url);
              return route.abort('blockedbyclient');
            }
            if (new URL(url).pathname.endsWith('/' + runtimeEntryPath(routeName))) {
              const root = routeName === 'baseline' ? LAYOUT.baseline : BUILD_OUTPUTS.development;
              const source = await readFile(
                path.join(ROOT, root, runtimeEntryPath(routeName)),
                'utf8',
              );
              return route.fulfill({
                body: inspectRuntimeEntry(source, { baseline: routeName === 'baseline' }),
                contentType: 'text/javascript',
              });
            }
            await route.continue();
          });
          const session = await context.newCDPSession(page);
          await session.send('Performance.enable');
          try {
            await page.goto(origin + (routeName === 'baseline' ? '/baseline/' : '/'));
            await page.locator('.side-button').filter({ hasText: 'SINGLE PLAY' }).waitFor();
            await page.mouse.move(1400, 850);
            await waitForCamera(page);
            await continuousPlay(page, session, trace, options, save);
            for (const [key, values] of Object.entries(observations)) {
              assert.deepEqual(values, [], key);
            }
            trace.passed = true;
          } catch (error) {
            trace.passed = false;
            trace.error = error.stack;
            trace.diagnostics = await captureFailure(
              [{ page, context, observations, routeName }],
              output,
              `${candidate.name}-${routeName}`,
              error,
              trace.phase || 'continuous play / startup',
            );
            throw error;
          } finally {
            trace.finished = new Date().toISOString();
            trace.elapsedSeconds = (Date.parse(trace.finished) - Date.parse(trace.started)) / 1000;
            if (trace.samples?.length) {
              const first = trace.samples[0],
                last = trace.samples.at(-1);
              trace.passiveResourceChange = Object.fromEntries(
                ['heapUsedBytes', 'retainedDOMNodes', 'documents', 'jsEventListeners'].map(
                  (key) => [
                    key,
                    {
                      first: first[key],
                      last: last[key],
                      delta: last[key] - first[key],
                      min: Math.min(...trace.samples.map((s) => s[key])),
                      max: Math.max(...trace.samples.map((s) => s[key])),
                    },
                  ],
                ),
              );
            }
            await save();
            await saveReport();
            await session.detach();
            await context.close();
          }
        }
        assert.deepEqual(
          entry.routes[1].practice.stableResources,
          entry.routes[0].practice.stableResources,
          'Runtime scene resources match baseline',
        );
        for (let i = 0; i < 3; i++) {
          assert.deepEqual(
            entry.routes[1].ai[i].stableResources,
            entry.routes[0].ai[i].stableResources,
            'AI resources match baseline',
          );
        }
        entry.passed = true;
      } finally {
        await browser.close();
      }
    }
    assert.ok(report.browsers.length > 0, 'No available browser');
    await verifySnapshot(LAYOUT.baseline, LAYOUT.baselineManifest);
    await verifyBuild('development');
    await verifyBuild('production');
    report.afterManifestHashes = await manifestHashes();
    report.afterManifestSnapshots = await snapshotManifests();
    report.manifestDifferences = compareManifestSnapshots(
      report.beforeManifestSnapshots,
      report.afterManifestSnapshots,
    );
    assert.deepEqual(
      report.afterManifestHashes,
      report.beforeManifestHashes,
      'All frozen/build manifests unchanged',
    );
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.error = error.stack;
    throw error;
  } finally {
    report.finished = new Date().toISOString();
    await saveReport();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
await withBuildLock(buildPaths('development'), () =>
  withBuildLock(buildPaths('production'), runSuite),
);
