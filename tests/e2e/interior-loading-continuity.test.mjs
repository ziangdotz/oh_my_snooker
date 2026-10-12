import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import {
  browserCandidates,
  launchTestBrowser,
  createRuntimeFixture,
} from '../helpers/runtime-fixture.mjs';

const directory = path.join(ROOT, 'artifacts/testing/interior-loading-continuity');
await mkdir(directory, { recursive: true });
const report = {
  date: new Date().toISOString(),
  method:
    'Actual in-page venue clicks and native RAF observation; no game handles or response rewriting. Target artwork delivery is held while observing the loading surface. Fonts are reused; a cold font failure validates the retained fallback.',
  targets: [],
  passed: false,
};
const fixture = await createRuntimeFixture();
try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of fixture.targets) {
        for (const scenario of [
          { name: 'native-fonts', design: '001', viewport: { width: 1440, height: 900 } },
          {
            name: 'delayed-texture',
            design: '002',
            viewport: { width: 1440, height: 900 },
            delay: true,
          },
          {
            name: 'narrow-reduced',
            design: '003',
            viewport: { width: 320, height: 400 },
            reduced: true,
          },
          {
            name: 'narrow-fallback',
            design: '003',
            viewport: { width: 320, height: 400 },
            fallback: true,
          },
        ]) {
          const context = await browser.newContext({
            viewport: scenario.viewport,
            reducedMotion: scenario.reduced ? 'reduce' : 'no-preference',
          });
          const page = await context.newPage();
          const frames = [];
          const errors = [];
          page.on('pageerror', (error) => errors.push(error.message));
          await page.exposeBinding('__observeVenueLoading', (_, frame) => frames.push(frame));
          await page.addInitScript(() => {
            const audit = (window.__venueLoadingAudit = {
              animations: 0,
              frame: 0,
              card: null,
              track: null,
              replacements: 0,
              last: '',
            });
            window.addEventListener('animationstart', (event) => {
              if (event.target.classList.contains('interior-transition-track')) {
                audit.animations++;
              }
            });
            function observe() {
              audit.frame++;
              const element = document.getElementById('interior-transition');
              if (element) {
                const card = element.querySelector('.interior-transition-card');
                const track = element.querySelector('.interior-transition-track');
                if (!card || !track) {
                  window.requestAnimationFrame(observe);
                  return;
                }
                if (audit.card && (card !== audit.card || track !== audit.track)) {
                  audit.replacements++;
                }
                audit.card = card;
                audit.track = track;
                const rect = card.getBoundingClientRect();
                const cover = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                const visible = !element.hidden && style.display !== 'none';
                const animation = window.getComputedStyle(track, '::after');
                const barOffset =
                  animation.transform === 'none'
                    ? 0
                    : new window.DOMMatrixReadOnly(animation.transform).m41;
                const state = {
                  document: window.performance.timeOrigin,
                  hidden: !visible,
                  phase: element.dataset.displayPhase,
                  fontState: element.dataset.fontState,
                  state: element.dataset.state,
                  rectangle: [rect.x, rect.y, rect.width, rect.height],
                  covered:
                    !visible ||
                    (cover.x === 0 &&
                      cover.y === 0 &&
                      cover.width === window.innerWidth &&
                      cover.height === window.innerHeight &&
                      style.opacity === '1' &&
                      style.backgroundColor === 'rgb(12, 21, 18)' &&
                      document.elementFromPoint(1, 1) === element),
                  replacements: audit.replacements,
                  animations: audit.animations,
                  animationPlayState: animation.animationPlayState,
                  handoffBarCenter:
                    visible && element.dataset.displayPhase === 'handoff'
                      ? (parseFloat(animation.left) + barOffset + parseFloat(animation.width) / 2) /
                        track.getBoundingClientRect().width
                      : null,
                };
                const key = JSON.stringify(state);
                if (audit.last !== key) {
                  audit.last = key;
                  window.__observeVenueLoading({
                    ...state,
                    frame: audit.frame,
                    time: window.performance.now(),
                  });
                }
              }
              window.requestAnimationFrame(observe);
            }
            window.requestAnimationFrame(observe);
          });
          let switching = false;
          let repeatedFonts = 0;
          let releaseFonts;
          const fonts = new Promise((resolve) => {
            releaseFonts = resolve;
          });
          await page.route('**/*', async (route) => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname.includes('/assets/fonts/')) {
              if (switching) {
                repeatedFonts++;
              }
              if (scenario.fallback) {
                return route.abort();
              }
            }
            if (
              switching &&
              pathname.endsWith('/interior-design-' + scenario.design + '-art.png')
            ) {
              await fonts;
            }
            await route.continue();
          });
          try {
            await page.goto(target.origin + '/?interior=interior-design-original');
            await page.locator('.interior-transition').waitFor({ state: 'hidden' });
            await page.locator('.interior-menu-item').click();
            await page.waitForFunction(() => {
              const drawer = document.querySelector('.interior-venue-drawer');
              return drawer?.style.opacity === '1' && !drawer.inert;
            });
            const previousDocument = await page.evaluate(() => {
              window.__venueLoadingAudit.animations = 0;
              return window.performance.timeOrigin;
            });
            frames.length = 0;
            switching = true;
            await page
              .locator('[data-design-id="interior-design-' + scenario.design + '"]')
              .click();
            const prefix = candidate.name + '-' + target.name + '-' + scenario.name;
            if (scenario.delay) {
              await page.locator('.interior-transition[data-display-phase="content"]').waitFor();
              await page.evaluate(
                () =>
                  new Promise((resolve) => {
                    let frames = 0;
                    function observe() {
                      if (++frames === 6) {
                        resolve();
                      } else {
                        window.requestAnimationFrame(observe);
                      }
                    }
                    window.requestAnimationFrame(observe);
                  }),
              );
              // Capture the actual resource wait without releasing the target image.
              const capture = await context.newCDPSession(page);
              try {
                const screenshot = await capture.send('Page.captureScreenshot', { format: 'png' });
                await writeFile(
                  path.join(directory, prefix + '-waiting.png'),
                  Buffer.from(screenshot.data, 'base64'),
                );
              } finally {
                await capture.detach();
              }
            }
            await page.locator('.interior-transition[data-display-phase="content"]').waitFor();
            if (scenario.fallback) {
              assert.equal(
                await page.locator('.interior-transition').getAttribute('data-font-state'),
                'fallback',
              );
            }
            assert.equal(
              await page.locator('.interior-transition').evaluate((element) => {
                const heading = element
                  .querySelector('.interior-transition-heading')
                  .getBoundingClientRect();
                const title = element.querySelector('h2').getBoundingClientRect();
                const message = element.querySelector('.interior-transition-message');
                const slot = message.getBoundingClientRect();
                const range = document.createRange();
                range.selectNodeContents(message);
                const copy = range.getBoundingClientRect();
                return (
                  title.top >= heading.top - 1 &&
                  title.bottom <= heading.bottom + 1 &&
                  copy.top >= slot.top - 1 &&
                  copy.bottom <= slot.bottom + 1 &&
                  title.bottom < copy.top
                );
              }),
              true,
              'Loading text exceeded its reserved slots or overlapped',
            );
            await page.screenshot({ path: path.join(directory, prefix + '-content.png') });
            releaseFonts();
            await page.waitForURL('**/?interior=interior-design-' + scenario.design);
            await page.locator('.interior-transition').waitFor({ state: 'hidden' });
            await page
              .locator('.interior-home-menu .side-button')
              .first()
              .waitFor({ state: 'visible' });
            await page.evaluate(
              () => new Promise((resolve) => window.requestAnimationFrame(resolve)),
            );
            assert.ok(
              frames.every((frame) => frame.document === previousDocument),
              'Venue switch reloaded the document',
            );
            assert.equal(repeatedFonts, 0, 'Venue switch fetched fonts again');
            const next = frames;
            const loading = frames.filter((frame) => !frame.hidden);
            assert.ok(loading.length >= 1, 'Resource wait never presented its loading surface');
            assert.ok(
              loading.some((frame) => frame.phase === 'content'),
              'Fonts never settled to content',
            );
            const rectangle = loading[0].rectangle;
            for (const frame of loading) {
              assert.equal(
                frame.covered,
                true,
                'Visible loading frame exposed the underlying page',
              );
              assert.equal(frame.replacements, 0, 'Loading card or animation node was replaced');
              assert.ok(frame.animations <= 1, 'Loading animation restarted within one operation');
              assert.ok(
                frame.rectangle.every(
                  (coordinate, index) => Math.abs(coordinate - rectangle[index]) < 0.02,
                ),
                'Loading card shifted at handoff or font settlement',
              );
              if (frame.phase === 'handoff' && !scenario.reduced) {
                assert.equal(frame.animationPlayState, 'paused');
              }
              if (frame.phase === 'handoff') {
                assert.ok(
                  Math.abs(frame.handoffBarCenter - 0.5) < 0.02,
                  'The static handoff bar was not centered',
                );
              }
            }
            const firstLoading = next.findIndex((frame) => !frame.hidden);
            const completion = next.findIndex(
              (frame, index) => index > firstLoading && frame.hidden,
            );
            assert.ok(completion >= 0);
            assert.ok(
              next.slice(completion).every((frame) => frame.hidden),
              'Loading layer reappeared after completion',
            );
            assert.deepEqual(errors, []);
            report.targets.push({
              browser: candidate.name,
              target: target.name,
              scenario: scenario.name,
              design: 'interior-design-' + scenario.design,
              viewport: scenario.viewport,
              frames,
              covered: true,
              sameCardGeometry: true,
              nodesRetained: true,
              animationRestarted: false,
              documentRetained: true,
              repeatedFonts,
              passed: true,
            });
            console.log(
              `${candidate.name} ${target.name} ${scenario.name}: handoff, fixed layout, retained nodes and completion passed`,
            );
          } finally {
            releaseFonts();
            await context.close();
          }
        }
      }
    } finally {
      await browser.close();
    }
  }
  report.passed = true;
} finally {
  await writeFile(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await fixture.close();
}
