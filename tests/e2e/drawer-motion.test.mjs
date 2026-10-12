import assert from 'node:assert/strict';
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import {
  browserCandidates,
  launchTestBrowser,
  createRuntimeFixture,
  inspectRuntimeRoute,
  waitForHome,
} from '../helpers/runtime-fixture.mjs';

const report = { date: new Date().toISOString(), targets: [], passed: false };
const fixture = await createRuntimeFixture();
try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of fixture.targets) {
        for (const scenario of [
          { viewport: { width: 1014, height: 704 }, reduced: false },
          { viewport: { width: 320, height: 400 }, reduced: false },
          { viewport: { width: 320, height: 400 }, reduced: true },
        ]) {
          const page = await browser.newPage({ viewport: scenario.viewport });
          const result = {
            browser: candidate.name,
            target: target.name,
            ...scenario,
            drawers: [],
            errors: [],
            passed: false,
          };
          report.targets.push(result);
          try {
            page.on('pageerror', (error) => result.errors.push(error.message));
            await page.emulateMedia({
              reducedMotion: scenario.reduced ? 'reduce' : 'no-preference',
            });
            await page.route('**/*', async (route) => {
              if (!(await inspectRuntimeRoute(route, target))) {
                await route.continue();
              }
            });
            await page.goto(target.origin + '/?interior=interior-design-002');
            await waitForHome(page, 'interior-design-002');
            for (const [boxId, item, selector, property] of [
              ['moreThingsBox', '.interior-more-menu-item', '.interior-more-things', '_moreDialog'],
              ['interiorBox', '.interior-menu-item', '.interior-venue-drawer', '_interiorDialog'],
              ['aboutBox', '.interior-about-menu-item', '.interior-about-drawer', '_aboutDialog'],
            ]) {
              await page.evaluate(
                ({ boxId, selector }) => {
                  const element = document.querySelector(selector);
                  const dialog = window.__pcolTestGame._uiLayer._registeredBox[boxId];
                  window.__drawerMotion = { phase: 'opening', samples: [] };
                  window.__drawerMotionObserver = new window.MutationObserver(() => {
                    const style = window.getComputedStyle(element);
                    const visible = style.display !== 'none';
                    window.__drawerMotion.samples.push({
                      phase: window.__drawerMotion.phase,
                      visible,
                      progress: dialog._tween.uneaseRenderedRatio,
                      duration: dialog._tween.duration,
                      timeScale: dialog._tween.timeScale,
                      opacity: Number(style.opacity),
                      x:
                        style.transform === 'none'
                          ? 0
                          : new window.DOMMatrixReadOnly(style.transform).m41,
                      width: element.offsetWidth,
                      containerScrollLeft: document.querySelector('#game-container').scrollLeft,
                      documentScrollLeft: document.documentElement.scrollLeft,
                    });
                  });
                  window.__drawerMotionObserver.observe(element, {
                    attributes: true,
                    attributeFilter: ['style'],
                  });
                },
                { boxId, selector },
              );
              await page.locator(item).click();
              await page.waitForFunction((property) => {
                const dialog = window.__pcolTestGame._currentController[property];
                return dialog?.isActive && !dialog.needsUpdate && !dialog.blocked;
              }, property);
              if (boxId === 'interiorBox') {
                assert.equal(
                  await page.locator(selector).evaluate((element) => {
                    const list = element
                      .querySelector('.interior-design-list')
                      .getBoundingClientRect();
                    const selected = element
                      .querySelector('[aria-pressed="true"]')
                      .getBoundingClientRect();
                    return selected.top >= list.top - 1 && selected.bottom <= list.bottom + 1;
                  }),
                  true,
                  'Selected venue remains visible without scrolling the game',
                );
              }
              await page.evaluate(() => {
                window.__drawerMotion.phase = 'closing';
              });
              await page.locator(selector + ' .interior-drawer-footer button').click();
              await waitForHome(page, 'interior-design-002');
              const samples = await page.evaluate(() => {
                window.__drawerMotionObserver.disconnect();
                return window.__drawerMotion.samples;
              });
              assert.ok(samples.some((sample) => sample.visible && sample.phase === 'opening'));
              assert.ok(
                samples.some(
                  (sample) => sample.phase === 'closing' && (scenario.reduced || sample.visible),
                ),
              );
              for (const sample of samples) {
                assert.equal(
                  sample.containerScrollLeft,
                  0,
                  boxId + ': focus shifted game container',
                );
                assert.equal(sample.documentScrollLeft, 0);
                assert.equal(sample.duration, scenario.reduced ? 0.016 : 0.32);
                assert.equal(sample.timeScale, sample.phase === 'opening' ? 1 : 1.25);
                if (sample.visible) {
                  const eased = 1 - (1 - sample.progress) ** 2;
                  assert.ok(
                    Math.abs(sample.opacity - eased) < 0.00001,
                    boxId + ': fade differs from reference',
                  );
                  assert.ok(
                    Math.abs(sample.x - sample.width * (1 - eased)) < 0.01,
                    boxId + ': slide differs from reference',
                  );
                }
              }
              result.drawers.push({ boxId, samples });
            }
            assert.deepEqual(result.errors, []);
            result.passed = true;
          } finally {
            await page.close();
          }
        }
        console.log(
          candidate.name +
            ' ' +
            target.name +
            ': all three drawer trajectories, focus scroll, narrow layout and reduced motion passed',
        );
      }
    } finally {
      await browser.close();
    }
  }
  report.passed = true;
} finally {
  await fixture.close();
  await writeFile(
    path.join(ROOT, 'reports/validation/drawer-motion.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
