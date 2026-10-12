import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import { DESIGN_IDS, artifactDirectory } from '../../tooling/lib/artifact-paths.mjs';
import {
  browserCandidates,
  launchTestBrowser,
  createRuntimeFixture,
  inspectRuntimeRoute,
  waitForHome as home,
  openVenueDrawer as open,
} from '../helpers/runtime-fixture.mjs';
const output = artifactDirectory('testing', 'interior-selection');
await mkdir(output, { recursive: true });
await mkdir(path.join(ROOT, 'reports/validation'), { recursive: true });
const report = { date: new Date().toISOString(), browsers: [], passed: false };
const fixture = await createRuntimeFixture();
const targets = fixture.targets;
async function select(page, id) {
  await open(page);
  const previous = page.url();
  const option = page.locator('[data-design-id="' + id + '"]');
  if (id === 'interior-design-001') {
    await option.evaluate((button) => {
      button.click();
      button.click();
      button.click();
    });
  } else {
    await option.click();
  }
  await page.waitForURL((url) => url.searchParams.get('interior') === id);
  await home(page, id);
  assert.equal(await page.title(), 'OH MY SNOOKER');
  assert.notEqual(page.url(), previous);
}

try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    const result = { name: candidate.name, version: browser.version(), targets: [] };
    try {
      for (const target of targets) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const errors = [];
        let fault = null;
        page.on('pageerror', (error) => {
          if (!fault) {
            errors.push(error.message);
          }
        });
        await page.route('**/*', async (route) => {
          const url = new URL(route.request().url());
          if (url.origin !== target.origin) {
            errors.push('External request: ' + url.href);
            return route.abort();
          }
          if (fault === 'preview' && url.pathname.endsWith('-preview.jpg')) {
            return route.fulfill({ status: 404, body: '' });
          }
          if (
            fault === 'bundle' &&
            (url.pathname.endsWith('/compose-game.js') ||
              url.pathname.endsWith('/snooker-game.js') ||
              /interior-design-00[12]-art\.png$/.test(url.pathname))
          ) {
            return route.fulfill({ status: 503, body: '' });
          }
          if (await inspectRuntimeRoute(route, target)) {
            return;
          }
          return route.continue();
        });
        const variant = { name: target.name, switches: [], passed: false };
        try {
          await page.goto(target.origin + '/');
          await home(page, DESIGN_IDS[0]);
          assert.equal(await page.title(), 'OH MY SNOOKER');
          const initialUrl = page.url();
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-home.png'),
          });
          for (let iteration = 0; iteration < 3; iteration++) {
            await open(page);
            assert.equal(await page.locator('[aria-pressed="true"]').count(), 1);
            await page.keyboard.press('Tab');
            assert.ok(
              await page
                .locator('.interior-venue-drawer')
                .evaluate((element) => element.contains(document.activeElement)),
            );
            await page.keyboard.press('Escape');
            await page.locator('.interior-venue-drawer').waitFor({ state: 'hidden' });
            await page.waitForFunction(() =>
              document.activeElement?.classList.contains('interior-menu-item'),
            );
          }
          await open(page);
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-drawer.png'),
          });
          assert.ok(
            await page
              .locator('.interior-design-preview img')
              .evaluateAll((images) =>
                images.every((image) => image.complete && image.naturalWidth > 0),
              ),
          );
          await page.locator('[aria-pressed="true"]').click();
          await page.locator('.interior-venue-drawer').waitFor({ state: 'hidden' });
          assert.equal(page.url(), initialUrl);
          await page.goto(target.origin + '/?interior=' + DESIGN_IDS[0] + '&diagnostics=1#room');
          await home(page, DESIGN_IDS[0]);
          // Euler circuit covers every directed pair once, without redundant room loads.
          const circuit = [0, 1, 0, 2, 0, 3, 1, 2, 1, 3, 2, 3, 0];
          for (let index = 1; index < circuit.length; index++) {
            const from = DESIGN_IDS[circuit[index - 1]];
            const to = DESIGN_IDS[circuit[index]];
            await select(page, to);
            assert.equal(new URL(page.url()).searchParams.get('diagnostics'), '1');
            assert.equal(new URL(page.url()).hash, '#room');
            variant.switches.push({ from, to });
          }
          await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
          await page.waitForFunction(
            () =>
              window.__pcolTestGame._currentController.name === 'game' &&
              window.__pcolTestGame._currentController.state === 3,
          );
          await page.evaluate(() => window.__pcolTestGame.changeController('home'));
          await home(page, new URL(page.url()).searchParams.get('interior'));
          await open(page);
          await page.locator('.interior-venue-drawer .interior-drawer-footer button').click();
          await page.locator('.interior-venue-drawer').waitFor({ state: 'hidden' });
          await page.setViewportSize({ width: 360, height: 640 });
          await open(page);
          const bounds = await page.locator('.interior-venue-drawer').boundingBox();
          assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= 361);
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-narrow.png'),
          });
          await page.keyboard.press('Escape');
          await page.locator('.interior-venue-drawer').waitFor({ state: 'hidden' });
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await page.goto(target.origin + '/?interior=invalid');
          await home(page, DESIGN_IDS[0]);
          fault = 'preview';
          await open(page);
          await page.waitForFunction(() => document.querySelectorAll('.is-fallback').length === 4);
          await page.keyboard.press('Escape');
          await page.locator('.interior-venue-drawer').waitFor({ state: 'hidden' });
          fault = null;
          // Start a new scene: previously visited rooms are intentionally cached.
          await page.goto(target.origin + '/?interior=interior-design-original');
          await home(page, DESIGN_IDS[0]);
          await open(page);
          fault = 'bundle';
          await page.locator('[data-design-id="interior-design-001"]').click();
          await page.locator('.interior-transition[data-state="error"]').waitFor();
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-recovery.png'),
          });
          fault = null;
          await page.getByRole('button', { name: 'RETRY', exact: true }).click();
          await home(page, 'interior-design-001');
          await open(page);
          fault = 'bundle';
          await page.locator('[data-design-id="interior-design-002"]').click();
          await page.locator('.interior-transition[data-state="error"]').waitFor();
          fault = null;
          await page.getByRole('button', { name: 'Return to previous venue', exact: true }).click();
          await home(page, 'interior-design-001');
          assert.deepEqual(errors, []);
          variant.passed = true;
          result.targets.push(variant);
          console.log(
            candidate.name +
              ' ' +
              target.name +
              ': twelve directed room switches, drawer, keyboard, narrow layout and recovery passed.',
          );
        } catch (error) {
          variant.error = error.stack;
          variant.pageErrors = errors;
          result.targets.push(variant);
          report.browsers.push(result);
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-failure.png'),
          });
          throw error;
        } finally {
          await context.close();
        }
      }
      report.browsers.push(result);
    } finally {
      await browser.close();
    }
  }
  assert.equal(fixture.sourceErrors, '');
  report.passed = true;
} finally {
  await writeFile(
    path.join(ROOT, 'reports/validation/interior-selection.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await fixture.close();
}
