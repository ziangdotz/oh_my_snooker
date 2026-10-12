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
} from '../helpers/runtime-fixture.mjs';

const output = path.join(ROOT, 'artifacts/testing/ui-vector-artwork');
await mkdir(output, { recursive: true });
const report = { date: new Date().toISOString(), targets: [], passed: false };
const fixture = await createRuntimeFixture();
async function inspectGuideLayout(guide) {
  return guide.evaluate((element) => {
    const content = element.querySelector('.game-ui-panel-content');
    const rect = (node) => {
      const bounds = node.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom };
    };
    const rows = [...element.querySelectorAll('.control-guide-row')];
    const panel = element.getBoundingClientRect();
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      panelFits:
        panel.left >= 0 &&
        panel.right <= window.innerWidth &&
        panel.top >= 0 &&
        panel.bottom <= window.innerHeight,
      noHorizontalOverflow: content.scrollWidth <= content.clientWidth + 1,
      rows: rows.map((row) => ({
        action: row.querySelector('dt').textContent,
        input: rect(row.querySelector('.control-guide-input')),
        actionBounds: rect(row.querySelector('dt')),
        condition: row.querySelector('.control-guide-condition')
          ? rect(row.querySelector('.control-guide-condition'))
          : null,
        inputFits:
          row.querySelector('.control-guide-input').scrollWidth <=
          row.querySelector('.control-guide-input').clientWidth + 1,
      })),
      header: rect(element.querySelector('.game-ui-panel-header')),
      footer: rect(element.querySelector('.box-foot')),
    };
  });
}
try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of fixture.targets) {
        const context = await browser.newContext({
          viewport: { width: 1140, height: 850 },
          deviceScaleFactor: 2,
        });
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
          await page.goto(target.origin + '/?interior=interior-design-001');
          await waitForHome(page, 'interior-design-001');
          result.assets = [];
          for (const asset of ['ui-sprite-atlas', 'ai-difficulty-dots', 'snooker-ball-icons']) {
            const assetUrl = target.origin + '/assets/images/' + asset + '.svg';
            const response = await page.request.get(assetUrl);
            assert.equal(response.status(), 200);
            assert.match(response.headers()['content-type'], /image\/svg\+xml/);
            assert.equal(
              await page.evaluate(async (url) => {
                const image = new window.Image();
                image.src = url;
                await image.decode();
                return image.naturalWidth > 0 && image.naturalHeight > 0;
              }, assetUrl),
              true,
            );
            result.assets.push(asset);
          }
          await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
          await page.waitForFunction(
            () =>
              window.__pcolTestGame._currentController.state === 3 &&
              !window.__pcolTestGame._uiLayer.isBlocked,
          );
          const basicDialog = page
            .locator('.controls-guide-box')
            .filter({ has: page.locator('.box-head', { hasText: 'BASIC CONTROLS' }) });
          if (await basicDialog.isVisible()) {
            assert.equal(await basicDialog.locator('.control-guide-key').count(), 5);
            await basicDialog.getByRole('button', { name: 'CLOSE', exact: true }).click();
          }
          await page.locator('.ingame-controls [data-action="pause"]').click();
          await page.locator('.pause-box [data-sid="controls_guide"]').click();
          const guide = page
            .locator('.controls-guide-box')
            .filter({ has: page.locator('.box-head', { hasText: 'CONTROLS GUIDE' }) });
          await guide.waitFor({ state: 'visible' });
          await page.waitForFunction(() => {
            const guide = window.__pcolTestGame._uiLayer._registeredBox.controlsGuideBox;
            return guide.isActive && !guide.needsUpdate && !guide.blocked;
          });
          assert.deepEqual(await guide.locator('.control-guide-key').allTextContents(), [
            'W',
            'A',
            'S',
            'D',
            'R',
          ]);
          assert.deepEqual(await guide.locator('.kb').allTextContents(), [
            'W',
            'X',
            'P',
            'SPACE',
            'Alt',
            'C',
            'Alt',
            'S',
          ]);
          result.guide = await guide.evaluate((element) => {
            const diagram = element.querySelector('.basic-controls-img');
            const mouse = element.querySelector('.m-d-i');
            const bounds = diagram.getBoundingClientRect();
            return {
              background: window.getComputedStyle(diagram).backgroundImage,
              mouseAsset: window.getComputedStyle(mouse).backgroundImage,
              liveLettering: [...diagram.querySelectorAll('.control-guide-label')].map(
                (label) => label.textContent,
              ),
              letteringFits: [
                ...diagram.querySelectorAll('.control-guide-label, .control-guide-key'),
              ].every((label) => {
                const rect = label.getBoundingClientRect();
                return (
                  rect.left >= bounds.left - 1 &&
                  rect.right <= bounds.right + 1 &&
                  rect.top >= bounds.top - 1 &&
                  rect.bottom <= bounds.bottom + 1
                );
              }),
            };
          });
          assert.equal(result.guide.background, 'none');
          assert.match(result.guide.mouseAsset, /ui-sprite-atlas\.svg/);
          assert.equal(result.guide.letteringFits, true);
          await guide.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-controls.png'),
          });
          result.guideDesktopLayout = await inspectGuideLayout(guide);
          const desktopInputLeft = result.guideDesktopLayout.rows[0].input.x;
          for (const row of result.guideDesktopLayout.rows) {
            assert.ok(Math.abs(row.input.x - desktopInputLeft) < 1);
            assert.equal(row.inputFits, true, JSON.stringify(row));
            if (row.condition) {
              assert.ok(
                row.condition.x >= row.input.right,
                'Conditions must not shift the key column',
              );
            }
          }
          result.guideLayouts = [];
          for (const viewport of [
            { width: 578, height: 577 },
            { width: 480, height: 450 },
            { width: 320, height: 400 },
          ]) {
            await page.setViewportSize(viewport);
            await guide.locator('.game-ui-panel-content').evaluate((element) => {
              element.scrollTop = 0;
            });
            const before = await inspectGuideLayout(guide);
            assert.equal(before.panelFits, true, JSON.stringify(before));
            assert.equal(before.noHorizontalOverflow, true, JSON.stringify(before));
            const inputLeft = before.rows[0].input.x;
            for (const row of before.rows) {
              assert.ok(Math.abs(row.input.x - inputLeft) < 1, 'Input column must align');
              assert.ok(row.input.x >= row.actionBounds.right, 'Action and key must not overlap');
              assert.equal(row.inputFits, true, JSON.stringify(row));
              if (row.condition) {
                assert.ok(
                  viewport.width <= 480
                    ? row.condition.y >= row.input.bottom - 1
                    : row.condition.x >= row.input.right,
                  'Conditions must stay separate from the input',
                );
              }
            }
            await guide.screenshot({
              path: path.join(
                output,
                candidate.name + '-' + target.name + '-controls-' + viewport.width + '.png',
              ),
            });
            await guide.locator('.game-ui-panel-content').focus();
            await page.keyboard.press('End');
            await page.waitForFunction(() => {
              const body = document.querySelector(
                '[data-panel="controlsGuideBox"] .game-ui-panel-content',
              );
              return body.scrollTop + body.clientHeight >= body.scrollHeight - 1;
            });
            const after = await inspectGuideLayout(guide);
            assert.deepEqual(after.header, before.header, 'Header must stay fixed while scrolling');
            assert.deepEqual(
              after.footer,
              before.footer,
              'Close action must stay fixed while scrolling',
            );
            await guide.screenshot({
              path: path.join(
                output,
                candidate.name + '-' + target.name + '-aiming-' + viewport.width + '.png',
              ),
            });
            result.guideLayouts.push(before);
          }
          await page.setViewportSize({ width: 1140, height: 850 });
          await guide.locator('.game-ui-panel-content').evaluate((element) => {
            element.scrollTop = element.scrollHeight;
          });
          await guide.screenshot({
            path: path.join(output, candidate.name + '-' + target.name + '-aiming.png'),
          });
          await guide.getByRole('button', { name: 'CLOSE', exact: true }).click();
          await guide.waitFor({ state: 'hidden' });
          await page
            .locator('.pause-box')
            .getByRole('button', { name: 'RESUME', exact: true })
            .click();
          await page.locator('.pause-box').waitFor({ state: 'hidden' });
          assert.equal(await page.title(), 'OH MY SNOOKER');
          assert.deepEqual(result.errors, []);
          result.passed = true;
          console.log(
            candidate.name +
              ' ' +
              target.name +
              ': SVG decoding, live control lettering, 2x display and pause/guide/resume passed',
          );
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  report.passed = true;
} finally {
  await fixture.close();
  await writeFile(
    path.join(ROOT, 'reports/validation/ui-vector-artwork.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
