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
} from '../helpers/runtime-fixture.mjs';

const output = path.join(ROOT, 'artifacts/testing/retired-ui-cleanup');
await mkdir(output, { recursive: true });
const report = { date: new Date().toISOString(), targets: [], passed: false };
const retiredRoutes = [
  ...['intro-background.jpg', 'loading-spinner.svg', 'babylon-logo.png', 'game-shade.png'].map(
    (file) => '/assets/images/' + file,
  ),
  ...['chrome', 'edge', 'firefox', 'safari'].map(
    (name) => '/assets/icons/browsers/' + name + '.png',
  ),
  ...[
    '320x460',
    '640x920',
    '640x1096',
    '750x1294',
    '1182x2208',
    '1242x2148',
    '748x1024',
    '768x1004',
    '1496x2048',
    '1536x2008',
  ].map((size) => '/assets/icons/apple-touch-startup-image-' + size + '.png'),
];
const fixture = await createRuntimeFixture();
try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of fixture.targets) {
        const context = await browser.newContext({ viewport: { width: 1200, height: 800 } });
        const page = await context.newPage();
        const result = { browser: candidate.name, target: target.name, errors: [], passed: false };
        report.targets.push(result);
        try {
          page.on('pageerror', (error) => result.errors.push(error.message));
          await page.route('**/*', async (route) => {
            if (!(await inspectRuntimeRoute(route, target))) {
              await route.continue();
            }
          });
          await page.goto(target.origin + '/?interior=interior-design-003');
          await waitForHome(page, 'interior-design-003');
          assert.equal(
            await page.locator('#intro, #game-loading, .about-box, .endless-r').count(),
            0,
          );
          assert.equal(await page.locator('.interior-transition').count(), 1);
          assert.equal(await page.locator('.game-ui-loading').isVisible(), false);
          assert.deepEqual(
            await page.evaluate(() => {
              const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
              return ids.filter((id, index) => ids.indexOf(id) !== index);
            }),
            [],
          );
          for (const route of retiredRoutes) {
            assert.equal((await page.request.get(target.origin + route)).status(), 404, route);
          }
          await page.evaluate(() => window.__pcolTestGame.showLoading());
          await page.locator('.game-ui-loading').waitFor({ state: 'visible' });
          const appearance = await page.locator('.game-ui-loading').evaluate((element) => {
            const style = window.getComputedStyle(element);
            const title = element.querySelector('h2');
            const track = element.querySelector('.interior-transition-track');
            return {
              title: title.textContent,
              titleVisible: window.getComputedStyle(title).visibility,
              gold: style.getPropertyValue('--interior-gold').trim(),
              role: element.getAttribute('role'),
              busy: element.getAttribute('aria-busy'),
              animation: window.getComputedStyle(track, '::after').animationName,
            };
          });
          assert.deepEqual(appearance, {
            title: 'Preparing the table',
            titleVisible: 'visible',
            gold: '#c9b587',
            role: 'status',
            busy: 'true',
            animation: 'interior-venue-loading',
          });
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-loading.png'),
          });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          assert.equal(
            await page
              .locator('.game-ui-loading .interior-transition-track')
              .evaluate((element) => window.getComputedStyle(element, '::after').animationName),
            'none',
          );
          await page.evaluate(() => window.__pcolTestGame.hideLoading());
          assert.equal(await page.locator('.game-ui-loading').isVisible(), false);
          // Verify that the internal wait layer cannot mask venue handoff or error recovery.
          await page.evaluate(() => {
            const transition = document.getElementById('interior-transition');
            transition.hidden = false;
            window.__pcolTestGame.showLoading();
          });
          assert.equal(await page.locator('.game-ui-loading').isVisible(), false);
          await page.evaluate(() => {
            window.__pcolTestGame.hideLoading();
            document.getElementById('interior-transition').hidden = true;
          });
          await page.locator('.side-button').filter({ hasText: 'ABOUT' }).click();
          await page.locator('.interior-about-drawer').waitFor({ state: 'visible' });
          assert.equal(await page.locator('.about-box').count(), 0);
          assert.equal(await page.getByRole('heading', { name: 'ABOUT', exact: true }).count(), 1);
          assert.deepEqual(result.errors, []);
          result.passed = true;
          console.log(
            candidate.name +
              ' ' +
              target.name +
              ': retired UI absent, current loading/recovery and About passed.',
          );
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  // Catalog/bootstrap failures use the same recovery card, with no second legacy page.
  const browser = await launchTestBrowser(browserCandidates()[0]);
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.route('**/runtime/runtime-catalog.json', (route) =>
      route.fulfill({ status: 503, body: 'Unavailable' }),
    );
    await page.goto(fixture.targets[0].origin);
    await page.locator('#interior-transition[data-state="error"]').waitFor();
    assert.equal(
      await page.getByRole('heading', { name: 'Game unavailable', exact: true }).isVisible(),
      true,
    );
    assert.equal(await page.getByRole('button', { name: 'RETRY', exact: true }).isEnabled(), true);
    assert.equal(await page.locator('#intro, #game-loading').count(), 0);
    report.sourceBootstrapRecovery = true;
  } finally {
    await context.close();
    await browser.close();
  }
  report.removedAssets = retiredRoutes.map((route) => 'src' + route);
  report.baseCSS = {
    beforeBytes: 16199,
    afterBytes: (await readFile(path.join(ROOT, 'src/presentation/styles/game-base.css'))).length,
  };
  report.passed = true;
} finally {
  await writeFile(
    path.join(ROOT, 'reports/validation/retired-ui-cleanup.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await fixture.close();
}
