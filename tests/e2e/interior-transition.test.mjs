import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import {
  browserCandidates,
  launchTestBrowser,
  createRuntimeFixture,
  inspectRuntimeRoute,
  waitForHome as home,
  openVenueDrawer as open,
} from '../helpers/runtime-fixture.mjs';
const fixture = await createRuntimeFixture();
const targets = fixture.targets;
const output = path.join(ROOT, 'artifacts/testing/interior-selection');
await mkdir(output, { recursive: true });
const report = {
  date: new Date().toISOString(),
  scope: 'saira-font-unification-and-recovery',
  targets: [],
  passed: false,
};
async function textMetrics(page) {
  return page.locator('.interior-transition-card').evaluate((card) =>
    ['h2', '.interior-transition-message'].map((selector) => {
      const element = card.querySelector(selector);
      const range = document.createRange();
      range.selectNodeContents(element);
      const bounds = range.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        text: element.textContent,
        fontSize: style.fontSize,
        fontFamily: style.fontFamily,
        fontWeight: style.fontWeight,
        width: bounds.width,
        height: bounds.height,
      };
    }),
  );
}

async function fontFallback(browser, target, failedFont) {
  const page = await browser.newPage({ viewport: { width: 320, height: 400 } });
  let fault = true;
  try {
    const href = target.origin + '/?interior=interior-design-001';
    await page.addInitScript((href) => {
      if (!window.sessionStorage.getItem('__fallbackSeeded')) {
        window.sessionStorage.setItem('__fallbackSeeded', '1');
        window.sessionStorage.setItem(
          'oh-my-snooker:interior-transition',
          JSON.stringify({
            id: 'interior-design-001',
            name: 'Modern Club',
            href,
            previousHref: window.location.origin + '/?interior=interior-design-original',
            startedAt: Date.now(),
          }),
        );
      }
    }, href);
    await page.route('**/*', async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (
        pathname.includes('/assets/fonts/') &&
        (failedFont === 'semibold'
          ? pathname.includes('semibold')
          : pathname.includes('bold') && !pathname.includes('semibold'))
      ) {
        return route.abort();
      }
      if (
        fault &&
        (pathname.endsWith('/compose-game.js') || pathname.endsWith('/scripts/snooker-game.js'))
      ) {
        return route.fulfill({ status: 503, body: '' });
      }
      if (!(await inspectRuntimeRoute(route, target))) {
        await route.continue();
      }
    });
    await page.goto(href, { waitUntil: 'domcontentloaded' });
    await page
      .locator('.interior-transition[data-font-state="fallback"][data-state="error"]')
      .waitFor();
    await page.waitForFunction(() => document.activeElement.textContent === 'RETRY');
    const before = await textMetrics(page);
    assert.ok(before.every((metric) => metric.fontFamily === 'sans-serif'));
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(await textMetrics(page), before);
    const fits = await page
      .locator('.interior-transition-card')
      .evaluate(
        (card) =>
          card.scrollWidth <= card.clientWidth &&
          [...card.querySelectorAll('button')].every(
            (button) => button.scrollWidth <= button.clientWidth,
          ),
      );
    assert.equal(fits, true);
    fault = false;
    await page.getByRole('button', { name: 'RETRY', exact: true }).click();
    await home(page, 'interior-design-001');
    return {
      failedFont,
      stableFallback: true,
      narrowRecoveryFits: true,
      focusAndRetryPassed: true,
    };
  } finally {
    await page.close();
  }
}

try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of targets) {
        const page = await browser.newPage({ viewport: { width: 1014, height: 704 } });
        const initialHref = target.origin + '/?interior=interior-design-001';
        const result = { browser: candidate.name, target: target.name, passed: false };
        report.targets.push(result);
        let releaseFonts;
        const fonts = new Promise((resolve) => {
          releaseFonts = resolve;
        });
        let releaseSemiBold;
        const semiBold = new Promise((resolve) => {
          releaseSemiBold = resolve;
        });
        let releaseGame;
        const game = new Promise((resolve) => {
          releaseGame = resolve;
        });
        let fault = true;
        const errors = [];
        page.on('pageerror', (error) => {
          if (!fault) {
            errors.push(error.message);
          }
        });
        await page.addInitScript((href) => {
          if (
            window.location.href === href &&
            !window.sessionStorage.getItem('__transitionFontSeeded')
          ) {
            window.sessionStorage.setItem('__transitionFontSeeded', '1');
            window.sessionStorage.setItem(
              'oh-my-snooker:interior-transition',
              JSON.stringify({
                id: 'interior-design-001',
                name: 'Modern Club',
                href,
                previousHref: window.location.origin + '/?interior=interior-design-original',
                startedAt: Date.now(),
              }),
            );
          }
        }, initialHref);
        await page.route('**/*', async (route) => {
          const pathname = new URL(route.request().url()).pathname;
          if (pathname.includes('/assets/fonts/')) {
            await (pathname.includes('semibold') ? semiBold : fonts);
          }
          if (fault && pathname.endsWith('/interior-design-002-art.png')) {
            return route.fulfill({ status: 503, body: '' });
          }
          if (
            pathname.endsWith('/compose-game.js') ||
            pathname.endsWith('/scripts/snooker-game.js')
          ) {
            await game;
            if (fault) {
              return route.fulfill({ status: 503, body: '' });
            }
          }
          if (await inspectRuntimeRoute(route, target)) {
            return;
          }
          return route.continue();
        });
        try {
          await page.goto(initialHref, { waitUntil: 'domcontentloaded' });
          await page.locator('.interior-transition[data-state="loading"]').waitFor();
          await page.waitForFunction(() => document.fonts.status === 'loading');
          assert.equal(
            await page
              .locator('#interior-transition-title')
              .evaluate((element) => window.getComputedStyle(element).visibility),
            'hidden',
          );
          releaseSemiBold();
          await page.waitForFunction(() =>
            [...document.fonts].some(
              (face) => face.family.includes('SemiBold') && face.status === 'loaded',
            ),
          );
          assert.equal(
            await page.locator('.interior-transition').getAttribute('data-font-state'),
            'pending',
          );
          assert.equal(await page.locator('#interior-transition-title').isVisible(), false);
          releaseFonts();
          await page.locator('.interior-transition[data-font-state="ready"]').waitFor();
          result.beforeFonts = await textMetrics(page);
          assert.equal(result.beforeFonts[0].text, 'Modern Club');
          assert.equal(result.beforeFonts[0].fontSize, '40px');
          assert.equal(result.beforeFonts[0].fontWeight, '700');
          assert.match(result.beforeFonts[0].fontFamily, /Saira ExtraCondensed Bold/);
          assert.equal(result.beforeFonts[1].fontSize, '16px');
          assert.equal(result.beforeFonts[1].fontWeight, '600');
          assert.match(result.beforeFonts[1].fontFamily, /Saira ExtraCondensed SemiBold/);
          result.waitedForBothFonts = true;
          await page.evaluate(() => document.fonts.ready);
          result.fontFaces = await page.evaluate(() =>
            [...document.fonts]
              .map((face) => ({
                family: face.family.replaceAll('"', ''),
                weight: face.weight,
                status: face.status,
              }))
              .sort((a, b) => a.family.localeCompare(b.family)),
          );
          assert.deepEqual(result.fontFaces, [
            { family: 'Saira ExtraCondensed Bold', weight: '700', status: 'loaded' },
            { family: 'Saira ExtraCondensed SemiBold', weight: '600', status: 'loaded' },
          ]);
          result.afterFonts = await textMetrics(page);
          assert.deepEqual(result.afterFonts, result.beforeFonts);
          assert.equal(await page.locator('.interior-transition-actions').isVisible(), false);
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-saira-loading.png'),
          });
          releaseGame();
          await page.locator('.interior-transition[data-state="error"]').waitFor();
          assert.equal(
            await page.locator('#interior-transition-title').textContent(),
            'LAUNCH ERROR...',
          );
          assert.equal(
            /\p{Script=Han}/u.test(await page.locator('.interior-transition').textContent()),
            false,
          );
          await page.setViewportSize({ width: 360, height: 640 });
          result.narrow = await page.locator('.interior-transition-card').evaluate((card) => {
            const title = card.querySelector('h2');
            return {
              fontSize: window.getComputedStyle(title).fontSize,
              fits: card.scrollWidth <= card.clientWidth,
              buttonsFit: [...card.querySelectorAll('button')].every(
                (button) => button.scrollWidth <= button.clientWidth,
              ),
            };
          });
          assert.equal(result.narrow.fontSize, '32px');
          assert.equal(result.narrow.fits, true);
          assert.equal(result.narrow.buttonsFit, true);
          await page.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-saira-recovery.png'),
          });
          await page.setViewportSize({ width: 1014, height: 704 });
          fault = false;
          await page.getByRole('button', { name: 'RETRY', exact: true }).click();
          await home(page, 'interior-design-001');
          result.homeFonts = await page.locator('.interior-home-menu').evaluate((menu) => {
            return [...menu.querySelectorAll('h1, .inner')].map((element) => ({
              family: window.getComputedStyle(element).fontFamily,
              weight: window.getComputedStyle(element).fontWeight,
            }));
          });
          assert.ok(
            result.homeFonts.every(
              (font) => font.family.includes('Saira ExtraCondensed Bold') && font.weight === '700',
            ),
          );
          await open(page);
          fault = true;
          await page.locator('[data-design-id="interior-design-002"]').click();
          await page.locator('.interior-transition[data-state="error"]').waitFor();
          fault = false;
          await page.getByRole('button', { name: 'Return to previous venue', exact: true }).click();
          await home(page, 'interior-design-001');
          assert.deepEqual(errors, []);
          result.retryAndBack = true;
          result.fontFallbacks = [];
          for (const failedFont of ['semibold', 'bold']) {
            result.fontFallbacks.push(await fontFallback(browser, target, failedFont));
          }
          result.errors = errors;
          result.passed = true;
          console.log(
            candidate.name +
              ' ' +
              target.name +
              ': stable font metrics, English recovery, retry and back passed',
          );
        } catch (error) {
          result.error = error.stack;
          result.errors = errors;
          throw error;
        } finally {
          releaseSemiBold();
          releaseFonts();
          releaseGame();
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  report.passed = true;
} finally {
  await writeFile(
    path.join(ROOT, 'reports/validation/interior-font-unification.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await fixture.close();
}
