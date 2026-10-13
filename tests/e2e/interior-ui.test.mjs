import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import {
  browserCandidates,
  launchTestBrowser,
  createRuntimeFixture,
  inspectRuntimeRoute,
  waitForHome,
  openVenueDrawer,
} from '../helpers/runtime-fixture.mjs';

const output = path.join(ROOT, 'artifacts/testing/interior-selection');
await mkdir(output, { recursive: true });
const report = {
  date: new Date().toISOString(),
  scope: 'current-interior-ui-layout-and-menu-lifecycle',
  targets: [],
  passed: false,
};
const fixture = await createRuntimeFixture();
async function verifyAbout(page, viewport, prefix) {
  const item = page.locator('.interior-about-menu-item');
  await item.focus();
  await page.keyboard.press(viewport.width === 360 ? 'Space' : 'Enter');
  await page.waitForFunction(() => {
    const drawer = window.__pcolTestGame._currentController._aboutDialog;
    return drawer?.isActive && !drawer.needsUpdate && !drawer.blocked;
  });
  const panel = page.getByRole('dialog', { name: 'ABOUT', exact: true });
  assert.equal(await panel.locator('span.name').innerText(), 'ZIANG ZHANG');
  assert.equal(await panel.locator('a.name').count(), 0);
  assert.equal(await page.locator('.about-box').count(), 0);
  const link = panel.getByRole('link', { name: 'Visit Babylon.js (opens in a new tab)' });
  assert.equal(await link.getAttribute('href'), 'https://www.babylonjs.com/');
  assert.equal(await link.getAttribute('target'), '_blank');
  assert.equal(await link.getAttribute('rel'), 'noopener noreferrer');
  const metrics = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const content = element.querySelector('.interior-about-content');
    const footer = element.querySelector('footer').getBoundingClientRect();
    const title = element.querySelector('h2');
    const range = document.createRange();
    range.selectNodeContents(title);
    const textFits = [
      ...content.querySelectorAll('p, h3, li, strong, .interior-about-engine-copy'),
    ].every((node) => {
      const text = document.createRange();
      text.selectNodeContents(node);
      const textRect = text.getBoundingClientRect();
      const bounds = node.getBoundingClientRect();
      return textRect.left >= bounds.left - 1 && textRect.right <= bounds.right + 1;
    });
    return {
      fits:
        rect.x >= 0 &&
        rect.y >= 0 &&
        rect.right <= window.innerWidth + 1 &&
        rect.bottom <= window.innerHeight + 1,
      width: rect.width,
      textFits,
      horizontalOverflow: content.scrollWidth > content.clientWidth,
      scrollable: content.scrollHeight > content.clientHeight,
      footerFits: footer.bottom <= window.innerHeight,
      titleSize: window.getComputedStyle(title).fontSize,
      clearOfClose:
        range.getBoundingClientRect().right + 12 <=
        element.querySelector('.interior-close').getBoundingClientRect().left,
    };
  });
  assert.equal(metrics.fits, true);
  assert.equal(metrics.textFits, true);
  assert.equal(metrics.horizontalOverflow, false);
  assert.equal(metrics.footerFits, true);
  assert.equal(metrics.clearOfClose, true);
  assert.equal(metrics.titleSize, viewport.width <= 480 ? '28px' : '32px');
  if (viewport.height === 400) {
    assert.equal(metrics.scrollable, true);
  }
  await page.screenshot({ path: path.join(output, prefix + '-about-' + viewport.width + '.png') });
  const close = panel.getByRole('button', { name: 'Close About', exact: true });
  await close.focus();
  await page.keyboard.press('Tab');
  assert.equal(
    await page.evaluate(() => document.activeElement.classList.contains('interior-about-content')),
    true,
  );
  if (viewport.height === 400) {
    await panel.locator('.interior-about-content').evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(
      () => document.querySelector('.interior-about-content').scrollTop > 0,
    );
  }
  await page.keyboard.press('Tab');
  assert.equal(await link.evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'BACK');
  await page.keyboard.press('Tab');
  assert.equal(await close.evaluate((element) => element === document.activeElement), true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'BACK');
  assert.equal(await page.locator('#game-container').evaluate((element) => element.scrollLeft), 0);
  if (viewport.width === 1014) {
    await page.keyboard.press('Escape');
  } else if (viewport.width === 360) {
    await panel.getByRole('button', { name: 'BACK', exact: true }).click();
  } else {
    await close.click();
  }
  await waitForHome(page, 'interior-design-003');
  await page.waitForFunction(() =>
    document.activeElement.classList.contains('interior-about-menu-item'),
  );
  assert.equal(
    await page.locator('.interior-about-drawer').evaluate((element) => element.inert),
    true,
  );
  return metrics;
}
try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of fixture.targets) {
        const page = await browser.newPage({ viewport: { width: 1014, height: 704 } });
        const result = { browser: candidate.name, target: target.name, viewports: [], errors: [] };
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
          for (const viewport of [
            { width: 1014, height: 704 },
            { width: 360, height: 640 },
            { width: 320, height: 400 },
          ]) {
            await page.setViewportSize(viewport);
            const menu = await page.locator('.interior-home-menu').evaluate((element) => {
              const bounds = element.getBoundingClientRect();
              return {
                fits: bounds.top >= 0 && bounds.bottom <= window.innerHeight,
                brandAbsent: !element.querySelector('h1'),
                labels: [...element.querySelectorAll('.inner')].map((label) => {
                  const range = document.createRange();
                  range.selectNodeContents(label);
                  const rect = range.getBoundingClientRect();
                  const card = label.closest('.side-button').getBoundingClientRect();
                  const style = window.getComputedStyle(label);
                  return {
                    text: label.textContent,
                    size: style.fontSize,
                    weight: style.fontWeight,
                    family: style.fontFamily,
                    singleLine: range.getClientRects().length === 1,
                    clearOfIcons: rect.left >= card.left + 44 && rect.right <= card.right - 38,
                  };
                }),
              };
            });
            assert.equal(menu.fits, true);
            assert.equal(menu.brandAbsent, true);
            assert.equal(menu.labels.length, 5);
            assert.deepEqual(
              menu.labels.map((label) => label.text),
              ['SINGLE PLAY', 'PLAY TOGETHER', 'PRACTICE', 'INTERIOR DESIGN', 'ABOUT'],
            );
            for (const label of menu.labels) {
              assert.equal(label.size, viewport.width <= 480 ? '22px' : '24px');
              assert.equal(label.weight, '700');
              assert.match(label.family, /Saira ExtraCondensed Bold/);
              assert.equal(label.singleLine, true);
              assert.equal(label.clearOfIcons, true);
            }
            await page.screenshot({
              path: path.join(
                output,
                candidate.name + '-' + target.name + '-ui-menu-' + viewport.width + '.png',
              ),
            });
            const about = await verifyAbout(page, viewport, candidate.name + '-' + target.name);
            const moreItem = page.locator('.interior-more-menu-item');
            await moreItem.focus();
            await page.keyboard.press('ArrowDown');
            assert.equal(await page.evaluate(() => document.activeElement.textContent), 'PRACTICE');
            await page.keyboard.press('ArrowUp');
            await page.keyboard.press(viewport.width === 360 ? 'Space' : 'Enter');
            await page.waitForFunction(() => {
              const panel = window.__pcolTestGame._currentController._moreDialog;
              return panel?.isActive && !panel.needsUpdate && !panel.blocked;
            });
            const morePanel = page.locator('.interior-more-things');
            assert.equal(await morePanel.locator('h2').textContent(), 'PLAY TOGETHER');
            assert.deepEqual(
              await morePanel.locator('.interior-more-option h3').allTextContents(),
              ['TWO-PLAYER MATCH', 'ROOMS'],
            );
            assert.deepEqual(await morePanel.locator('.interior-more-status').allTextContents(), [
              'SET UP A MATCH ↗',
              'COMING SOON',
            ]);
            assert.equal(await morePanel.locator('.interior-more-option button').count(), 0);
            const moreBounds = await morePanel.boundingBox();
            const expectedMoreWidth =
              viewport.width <= 480
                ? viewport.width - 16
                : Math.min(840, Math.max(480, viewport.width * 0.6), viewport.width - 48);
            assert.ok(Math.abs(moreBounds.width - expectedMoreWidth) <= 1);
            const options = await morePanel.locator('.interior-more-option').evaluateAll((cards) =>
              cards.map((card) => {
                const bounds = card.getBoundingClientRect();
                return { x: bounds.x, y: bounds.y, right: bounds.right };
              }),
            );
            assert.equal(
              viewport.width > 1000,
              Math.abs(options[0].y - options[1].y) < 1 && options[1].x >= options[0].right,
            );
            assert.ok(
              moreBounds.x >= 0 &&
                moreBounds.y >= 0 &&
                moreBounds.x + moreBounds.width <= viewport.width + 1 &&
                moreBounds.y + moreBounds.height <= viewport.height + 1,
            );
            const previousUrl = page.url();
            await morePanel.locator('.interior-more-option').last().click();
            assert.equal(page.url(), previousUrl);
            await morePanel
              .getByRole('button', { name: 'Close PLAY TOGETHER', exact: true })
              .focus();
            await page.keyboard.press('Shift+Tab');
            assert.equal(await page.evaluate(() => document.activeElement.textContent), 'BACK');
            await page.keyboard.press('Tab');
            assert.equal(
              await page.evaluate(() => document.activeElement.getAttribute('aria-label')),
              'Close PLAY TOGETHER',
            );
            await page.keyboard.press('ArrowDown');
            await page.screenshot({
              path: path.join(
                output,
                candidate.name + '-' + target.name + '-more-things-' + viewport.width + '.png',
              ),
            });
            if (viewport.width === 1014) {
              await page.keyboard.press('Escape');
            } else if (viewport.width === 360) {
              await morePanel.getByRole('button', { name: 'BACK', exact: true }).click();
            } else {
              await morePanel
                .getByRole('button', { name: 'Close PLAY TOGETHER', exact: true })
                .click();
            }
            await waitForHome(page, 'interior-design-003');
            await page.waitForFunction(() =>
              document.activeElement.classList.contains('interior-more-menu-item'),
            );
            assert.equal(page.url(), previousUrl);
            await openVenueDrawer(page);
            const drawer = await page.locator('.interior-venue-drawer').evaluate((panel) => {
              function measure(element) {
                const range = document.createRange();
                range.selectNodeContents(element);
                const rect = range.getBoundingClientRect();
                const box = element.getBoundingClientRect();
                const style = window.getComputedStyle(element);
                return {
                  size: style.fontSize,
                  weight: style.fontWeight,
                  family: style.fontFamily,
                  singleLine: range.getClientRects().length === 1,
                  fits: rect.left >= box.left - 1 && rect.right <= box.right + 1,
                };
              }
              const title = panel.querySelector('h2');
              const range = document.createRange();
              range.selectNodeContents(title);
              const list = panel.querySelector('.interior-design-list');
              const footer = panel.querySelector('footer');
              return {
                title: measure(title),
                clearOfClose:
                  range.getBoundingClientRect().right + 12 <=
                  panel.querySelector('.interior-close').getBoundingClientRect().left,
                noHorizontalOverflow: list.scrollWidth <= list.clientWidth,
                footerFits: footer.getBoundingClientRect().bottom <= window.innerHeight,
                back: measure(footer.querySelector('button')),
                names: [...panel.querySelectorAll('strong')].map(measure),
                descriptions: [...panel.querySelectorAll('.interior-design-description')].map(
                  measure,
                ),
              };
            });
            assert.equal(drawer.title.size, viewport.width <= 480 ? '28px' : '32px');
            assert.equal(drawer.title.weight, '700');
            assert.equal(drawer.title.singleLine, true);
            assert.equal(drawer.clearOfClose, true);
            assert.equal(drawer.noHorizontalOverflow, true);
            assert.equal(drawer.footerFits, true);
            for (const name of drawer.names) {
              assert.equal(name.size, viewport.width <= 480 ? '20px' : '22px');
              assert.equal(name.weight, '700');
              assert.equal(name.singleLine, true);
              assert.equal(name.fits, true);
            }
            for (const description of drawer.descriptions) {
              assert.equal(description.size, '14px');
              assert.equal(description.weight, '600');
              assert.equal(description.fits, true);
            }
            assert.equal(drawer.back.size, '20px');
            assert.equal(drawer.back.weight, '700');
            await page.screenshot({
              path: path.join(
                output,
                candidate.name + '-' + target.name + '-ui-drawer-' + viewport.width + '.png',
              ),
            });
            await page.locator('[data-design-id="interior-design-003"]').click();
            await waitForHome(page, 'interior-design-003');
            await page.waitForFunction(() =>
              document.activeElement.classList.contains('interior-menu-item'),
            );
            await openVenueDrawer(page);
            await page.getByRole('button', { name: 'BACK', exact: true }).click();
            await waitForHome(page, 'interior-design-003');
            await page.waitForFunction(() =>
              document.activeElement.classList.contains('interior-menu-item'),
            );
            result.viewports.push({ viewport, menu, drawer, about, currentAndBackPassed: true });
          }
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await verifyAbout(
            page,
            { width: 320, height: 400 },
            candidate.name + '-' + target.name + '-reduced',
          );
          await page.locator('.interior-more-menu-item').click();
          await page.waitForFunction(() => {
            const panel = window.__pcolTestGame._currentController._moreDialog;
            return panel?.isActive && !panel.needsUpdate && !panel.blocked;
          });
          await page.keyboard.press('Escape');
          await waitForHome(page, 'interior-design-003');
          await page.waitForFunction(() =>
            document.activeElement.classList.contains('interior-more-menu-item'),
          );
          await openVenueDrawer(page);
          await page.keyboard.press('Escape');
          await waitForHome(page, 'interior-design-003');
          await page.waitForFunction(() =>
            document.activeElement.classList.contains('interior-menu-item'),
          );
          result.reducedMotionPassed = true;
          assert.deepEqual(result.errors, []);
          console.log(
            candidate.name +
              ' ' +
              target.name +
              ': five-item menu, About/future/venue drawers, keyboard/focus, three viewports and reduced motion passed',
          );
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  assert.equal(fixture.sourceErrors, '');
  report.passed = true;
} finally {
  await writeFile(
    path.join(ROOT, 'reports/validation/interior-ui.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  await fixture.close();
}
