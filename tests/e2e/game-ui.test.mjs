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
import { confirmGameAction } from '../helpers/game-ui-actions.mjs';
import { observeFrames } from './browser-observations.mjs';

const output = path.join(ROOT, 'artifacts/testing/game-ui');
await mkdir(output, { recursive: true });
const report = {
  date: new Date().toISOString(),
  instrumentation:
    'Response-only runtime inspection. UI fixtures exercise presentation without altering the match model. Actual stroke/replay/rules are checked separately by the gameplay regression.',
  scenarios: [],
  passed: false,
};
const fixture = await createRuntimeFixture();

async function settled(page, id) {
  await page.waitForFunction((id) => {
    const box = window.__pcolTestGame._uiLayer._registeredBox[id];
    return box.isActive && !box.needsUpdate && !box.blocked;
  }, id);
}

async function closePanel(page, dialog) {
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
}

async function layout(page, panel = '.game-ui-hud') {
  const bounds = await page.locator(panel).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: window.innerWidth,
      height: window.innerHeight,
      overflow: element.scrollWidth > element.clientWidth + 1,
    };
  });
  assert.ok(bounds.left >= 0 && bounds.right <= bounds.width + 1, JSON.stringify(bounds));
  assert.ok(bounds.top >= 0 && bounds.bottom <= bounds.height + 1, JSON.stringify(bounds));
  assert.equal(bounds.overflow, false, panel + ' horizontal overflow');
  return bounds;
}

async function deepChecks(page, prefix, result) {
  const pause = page.getByRole('dialog', { name: 'PAUSED', exact: true });
  const opening = await page.evaluate(() => {
    const c = window.__pcolTestGame._currentController;
    return JSON.stringify({ context: c._model._gContext, players: c._model.players });
  });
  for (let index = 0; index < 12; index++) {
    await page.keyboard.press('Tab');
    assert.equal(await pause.evaluate((element) => element.contains(document.activeElement)), true);
  }
  await page.keyboard.press('w');
  assert.equal(
    await page.evaluate(() => {
      const c = window.__pcolTestGame._currentController;
      return JSON.stringify({ context: c._model._gContext, players: c._model.players });
    }),
    opening,
    'Panel keys must not change the game',
  );
  await pause.getByRole('button', { name: 'RESTART', exact: true }).click();
  await settled(page, 'confirm');
  const confirm = page.getByRole('dialog', { name: 'RESTART PRACTICE?', exact: true });
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'CANCEL');
  await page.screenshot({ path: path.join(output, prefix + '-confirm.png') });
  await closePanel(page, confirm);
  await settled(page, 'pauseBox');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'RESTART');
  await pause.getByRole('button', { name: 'CONTROLS GUIDE', exact: true }).click();
  await settled(page, 'controlsGuideBox');
  const help = page.getByRole('dialog', { name: 'CONTROLS GUIDE', exact: true });
  assert.equal(await help.locator('.control-guide-key').count(), 5);
  await page.screenshot({ path: path.join(output, prefix + '-help.png') });
  await closePanel(page, help);
  await settled(page, 'pauseBox');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), 'CONTROLS GUIDE');
  result.layouts = [];
  for (const viewport of [
    { width: 960, height: 640 },
    { width: 720, height: 450 },
    { width: 480, height: 450 },
  ]) {
    await page.setViewportSize(viewport);
    result.layouts.push({ viewport, pause: await layout(page, '.pause-box') });
    await page.screenshot({
      path: path.join(output, prefix + '-pause-' + viewport.width + '.png'),
    });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await pause.getByRole('button', { name: 'RESUME', exact: true }).click();
  await pause.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'game-view');

  await page.evaluate(() => {
    const ui = window.__pcolTestGame._uiLayer;
    ui.message('PERFORMANCE TIP', 'Legacy performance copy', 2, false, 'ui-tip');
    ui.message('FOUL', '-4: No ball was hit.', 3, false, 'ui-foul');
    ui.message('FOUL', '-4: No ball was hit.', 3, false, 'ui-foul');
  });
  const message = page.locator('.game-ui-notice:not(.game-ui-instruction)');
  assert.equal(await message.getAttribute('role'), 'alert');
  assert.equal(await message.locator('.box-head').textContent(), 'FOUL · 4 PENALTY POINTS');
  assert.equal(await page.evaluate(() => window.__pcolTestGame._uiLayer._noticeQueue.length), 1);
  assert.equal(await page.locator('.game-ui-instruction').isVisible(), false);
  await message.hover();
  const dwell = await page.evaluate(() => window.__pcolTestGame._uiLayer._currentNotice.remaining);
  await observeFrames(page);
  assert.equal(
    await page.evaluate(() => window.__pcolTestGame._uiLayer._currentNotice.remaining),
    dwell,
  );
  await message.getByRole('button', { name: 'Dismiss notification', exact: true }).focus();
  await page.mouse.move(4, 4);
  await observeFrames(page);
  assert.equal(
    await page.evaluate(() => window.__pcolTestGame._uiLayer._currentNotice.remaining),
    dwell,
  );
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await settled(page, 'pauseBox');
  assert.equal(await message.isVisible(), false);
  const coveredDwell = await page.evaluate(
    () => window.__pcolTestGame._uiLayer._currentNotice.remaining,
  );
  await observeFrames(page);
  assert.equal(
    await page.evaluate(() => window.__pcolTestGame._uiLayer._currentNotice.remaining),
    coveredDwell,
  );
  await closePanel(page, pause);
  await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  await message.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  assert.equal(await message.locator('.box-head').textContent(), 'PERFORMANCE TIP');
  await message.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
  await page.evaluate(() => window.__pcolTestGame._uiLayer.message('PERFORMANCE TIP', 'Repeat', 2));
  assert.equal(await message.isVisible(), false, 'Performance hint is deduplicated');
  assert.equal(await page.locator('.game-ui-instruction').isVisible(), true);

  // Isolated result display fixtures: no model reset, artificial shot or winner override.
  await page.evaluate(() => {
    window.__pcolTestGame._uiLayer.popBox('singleResultBox', {
      time: 123,
      players: [{ pts: 147, maxbrk: 147, penalty: -8, accuracy: 0.9 }],
    });
  });
  await settled(page, 'singleResultBox');
  const practice = page.getByRole('dialog', { name: 'RESULTS', exact: true });
  assert.equal(await practice.locator('.fouls').textContent(), '8');
  assert.equal(await practice.locator('.fouls-label').textContent(), 'PENALTY POINTS');
  assert.deepEqual(
    await practice.locator('.single-result-box > section > label').allTextContents(),
    ['TIME', 'POINTS', 'MAX BREAK', 'PENALTY POINTS', 'ACCURACY'],
  );
  assert.equal(
    await practice
      .locator('.single-result-box')
      .evaluate((element) => window.getComputedStyle(element).display),
    'block',
  );
  await layout(page, '.game-ui-results:visible .game-ui-panel-content');
  await page.screenshot({ path: path.join(output, prefix + '-results.png') });
  await closePanel(page, practice);
  await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  await page.evaluate(() => {
    window.__pcolTestGame._uiLayer.popBox('duoResultBox', {
      time: 300,
      players: [
        {
          displayName: 'Player with a long display name',
          pts: 40,
          maxbrk: 32,
          penalty: -4,
          accuracy: 0.7,
        },
        {
          displayName: 'Opponent with a long display name',
          pts: 40,
          maxbrk: 32,
          penalty: -4,
          accuracy: 0.7,
        },
      ],
    });
  });
  await settled(page, 'duoResultBox');
  const draw = page.getByRole('dialog', { name: 'DRAW', exact: true });
  assert.deepEqual(await draw.locator('.fouls0, .fouls1').allTextContents(), ['4', '4']);
  await page.setViewportSize({ width: 480, height: 450 });
  await layout(page, '.game-ui-results:visible');
  await layout(page, '.game-ui-results:visible .game-ui-panel-content');
  await draw.locator('.game-ui-panel-content').evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  assert.equal(
    await draw.getByRole('button', { name: 'MAIN MENU', exact: true }).isVisible(),
    true,
  );
  await page.screenshot({ path: path.join(output, prefix + '-draw-narrow.png') });
  for (const [points, heading] of [
    [41, 'YOU WIN!'],
    [39, 'YOU LOSE'],
  ]) {
    await page.evaluate((points) => {
      const display = window.__pcolTestGame._uiLayer._registeredBox.duoResultBox;
      display.data({
        time: 300,
        players: [
          { displayName: 'Player 1', pts: points, maxbrk: 32, penalty: -4, accuracy: 0.7 },
          { displayName: 'AI-1', pts: 40, maxbrk: 32, penalty: -4, accuracy: 0.7 },
        ],
      });
    }, points);
    assert.equal(await page.locator('.game-ui-results:visible .box-head').textContent(), heading);
  }
  // The element's accessible name has changed from DRAW to YOU LOSE.
  const resultPanel = page.getByRole('dialog', { name: 'YOU LOSE', exact: true });
  await closePanel(page, resultPanel);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Pause game', exact: true }).click();
  await settled(page, 'pauseBox');
  assert.equal(
    await page.evaluate(() => window.__pcolTestGame._uiLayer._registeredBox.pauseBox._duration()),
    0.016,
  );
  result.deepChecks = [
    'focus trap',
    'input isolation',
    'default cancel',
    'nested focus restoration',
    'help',
    'narrow/200%-equivalent CSS viewport',
    'notice priority/dedup',
    'hover/modal dwell',
    'placement instruction restored after transient notice',
    'results/draw/penalty semantics',
    'reduced motion',
  ];
}

try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const target of fixture.targets) {
        for (const suffix of ['original', '001', '002', '003']) {
          for (const mode of ['practice', 'match']) {
            const design = 'interior-design-' + suffix;
            const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
            const page = await context.newPage();
            const result = {
              browser: candidate.name,
              target: target.name,
              design,
              mode,
              errors: [],
              passed: false,
            };
            report.scenarios.push(result);
            const prefix = [candidate.name, target.name, suffix, mode].join('-');
            try {
              page.on('pageerror', (error) => result.errors.push(error.message));
              await page.route('**/*', async (route) => {
                if (
                  !route
                    .request()
                    .url()
                    .startsWith(target.origin + '/')
                ) {
                  result.errors.push('External request: ' + route.request().url());
                  await route.abort();
                } else if (!(await inspectRuntimeRoute(route, target))) {
                  await route.continue();
                }
              });
              await page.goto(target.origin + '/?interior=' + design);
              await waitForHome(page, design);
              assert.equal(await page.locator('.game-ui-notice:visible').count(), 0);
              await page
                .locator('.interior-home-menu .side-button')
                .filter({ hasText: mode === 'practice' ? 'PRACTICE' : 'SINGLE PLAY' })
                .click();
              if (mode === 'match') {
                await settled(page, 'hmDifBox');
                await layout(page, '.difficulty-box');
                await page.locator('.difficulty-box [data-sid="ai1"] button').click();
              }
              await page.waitForFunction(() => {
                const g = window.__pcolTestGame;
                return (
                  g._currentController.name === 'game' &&
                  g._currentController.state === 3 &&
                  !g._uiLayer.isBlocked
                );
              });
              assert.equal(await page.locator('.game-ui-hud').getAttribute('data-mode'), mode);
              result.hud = await layout(page);
              assert.equal(await page.locator('.game-ui-current-player').count(), 1);
              await page.getByRole('button', { name: 'Pause game', exact: true }).click();
              await settled(page, 'pauseBox');
              await layout(page, '.pause-box');
              if (suffix === '003') {
                await page.screenshot({ path: path.join(output, prefix + '-pause.png') });
              }
              if (suffix === '003' && mode === 'practice') {
                await deepChecks(page, prefix, result);
              }
              const pause = page.getByRole('dialog', { name: 'PAUSED', exact: true });
              await pause.getByRole('button', { name: 'QUIT', exact: true }).click();
              await confirmGameAction(page, 'quit');
              await waitForHome(page, design);
              assert.deepEqual(result.errors, []);
              result.passed = true;
              console.log(prefix + ': UI and return-to-menu passed');
            } catch (error) {
              result.error = error.stack;
              await page.screenshot({ path: path.join(output, prefix + '-failure.png') });
              throw error;
            } finally {
              await context.close();
            }
          }
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
    path.join(ROOT, 'reports/validation/game-ui-browser.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
