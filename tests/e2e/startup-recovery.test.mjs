import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import {
  browserCandidates,
  launchTestBrowser,
  createRuntimeFixture,
  inspectRuntimeRoute,
  waitForHome,
  openVenueDrawer,
} from '../helpers/runtime-fixture.mjs';

const output = path.join(ROOT, 'artifacts/testing/startup-recovery');
await mkdir(output, { recursive: true });
const reportFile = path.join(ROOT, 'reports/validation/startup-loading-recovery.json');
let before;
try {
  before = JSON.parse(await readFile(reportFile, 'utf8')).before;
} catch (error) {
  if (error.code !== 'ENOENT') {
    throw error;
  }
}
const report = { date: new Date().toISOString(), before, targets: [], passed: false };
const fixture = await createRuntimeFixture();
try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of fixture.targets) {
        const result = { browser: candidate.name, target: target.name, passed: false };
        report.targets.push(result);
        const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
        const page = await context.newPage();
        let release;
        const blocked = new Promise((resolve) => {
          release = resolve;
        });
        let delayed = true;
        let fault = null;
        await page.route('**/*', async (route) => {
          const pathname = new URL(route.request().url()).pathname;
          if (
            delayed &&
            (pathname.endsWith('/runtime/source-entry.js') ||
              pathname.endsWith('/scripts/runtime-bootstrap.js'))
          ) {
            await blocked;
          }
          if (fault === 'model' && pathname.endsWith('/interior-design-original-room.babylon')) {
            return route.fulfill({ status: 503, body: 'Temporary model failure' });
          }
          if (fault === 'collision' && pathname.endsWith('/tiger-club-collision.json')) {
            return route.fulfill({ status: 200, body: '{broken', contentType: 'application/json' });
          }
          if (
            fault === 'launch' &&
            (pathname.endsWith('/application/launch-game.js') ||
              pathname.endsWith('/scripts/runtime-bootstrap.js'))
          ) {
            const response = await route.fetch();
            let body = await response.text();
            assert.ok(body.includes('application.launch({'));
            body = body.replace(
              'application.launch({',
              'throw new Error("Injected startup failure");\n application.launch({',
            );
            return route.fulfill({ response, body, contentType: 'text/javascript' });
          }
          if (!(await inspectRuntimeRoute(route, target))) {
            await route.continue();
          }
        });
        try {
          await page.goto(target.origin + '/', { waitUntil: 'commit' });
          await page.locator('.interior-loading-status').waitFor({ state: 'visible' });
          assert.equal(await page.locator('.interior-transition').count(), 1);
          assert.equal(
            await page.locator('.interior-loading-status').textContent(),
            'LOADING VENUE...',
          );
          result.delayedBootstrap = { readableLoadingBeforeJavaScript: true };
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-early-loading.png'),
          });
          delayed = false;
          release();
          await waitForHome(page, 'interior-design-original');
          fault = 'launch';
          await page.reload();
          await page.locator('.interior-transition[data-state="error"]').waitFor();
          assert.equal(
            await page.getByRole('button', { name: 'RETRY', exact: true }).isEnabled(),
            true,
          );
          assert.equal(
            await page.locator('#interior-transition-title').textContent(),
            'LAUNCH ERROR...',
          );
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-launch-recovery.png'),
          });
          fault = null;
          await page.getByRole('button', { name: 'RETRY', exact: true }).click();
          await waitForHome(page, 'interior-design-original');
          result.coldStartupExceptionAndRetry = true;
          fault = 'model';
          await page.goto(target.origin + '/?interior=interior-design-003');
          await page
            .locator('.interior-transition[data-state="error"]')
            .waitFor({ timeout: 50000 });
          fault = null;
          await page.getByRole('button', { name: 'Return to previous venue', exact: true }).click();
          await waitForHome(page, 'interior-design-original');
          result.coldModelFailureAndBack = true;
          await openVenueDrawer(page);
          await page.locator('[data-design-id="interior-design-003"]').click();
          await waitForHome(page, 'interior-design-003');
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-ready.png'),
          });
          result.roomSelectionAfterRecovery = true;
          const resourceErrors = [];
          const onResourceError = (error) => resourceErrors.push(error.message);
          page.on('pageerror', onResourceError);
          fault = 'collision';
          await page.evaluate(() => {
            window
              .__pcolTestRequire('infrastructure/assets/collision-mesh-loader')
              .reload('tiger-club-collision.json');
          });
          await page.waitForFunction(() => {
            const loader = window.__pcolTestRequire('infrastructure/assets/collision-mesh-loader');
            return (
              loader.getCache('tiger-club-collision.json', true)?.isError &&
              loader._currentTaskCount === 0
            );
          });
          fault = null;
          await page.evaluate(() => {
            window
              .__pcolTestRequire('infrastructure/assets/collision-mesh-loader')
              .reload('tiger-club-collision.json');
          });
          await page.waitForFunction(() => {
            const loader = window.__pcolTestRequire('infrastructure/assets/collision-mesh-loader');
            const body = loader.getCache('tiger-club-collision.json', true);
            return (
              body &&
              !body.isError &&
              body.groups.length > 0 &&
              body.groups.every((group) => !group.pendingImg) &&
              loader._currentTaskCount === 0
            );
          });
          page.off('pageerror', onResourceError);
          assert.deepEqual(
            resourceErrors,
            [],
            'Collision failure must be returned through the cache',
          );
          result.collisionParseFailureAndRetry = true;
          result.passed = true;
          console.log(
            candidate.name +
              ' ' +
              target.name +
              ': immediate loading, startup/model recovery, collision parse/retry and room selection passed.',
          );
        } catch (error) {
          result.error = error.stack;
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-failure.png'),
          });
          throw error;
        } finally {
          release();
          await context.close();
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
