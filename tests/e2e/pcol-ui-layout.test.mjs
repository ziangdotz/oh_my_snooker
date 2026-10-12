import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import { createServer } from '../../tooling/server/static-server.mjs';
import { inspectRuntimeEntry } from '../../tooling/testing/runtime-inspection.mjs';
import {
  browserCandidates,
  launchTestBrowser,
  createRuntimeFixture,
  inspectRuntimeRoute,
} from '../helpers/runtime-fixture.mjs';

const output = path.join(ROOT, 'artifacts/testing/pcol-ui-layout');
await mkdir(output, { recursive: true });
const report = {
  date: new Date().toISOString(),
  comparison:
    'Live frozen PCOL geometry, menu order and screen locations; current home colors retained.',
  targets: [],
  passed: false,
};
const fixture = await createRuntimeFixture();
const baseline = createServer({ runtime: path.join(ROOT, 'baselines/pcol/game') });
await new Promise((resolve) => baseline.listen(0, '127.0.0.1', resolve));
const baselineTarget = {
  name: 'baseline',
  origin: 'http://127.0.0.1:' + baseline.address().port,
};
const baselineScript = await readFile(path.join(ROOT, 'baselines/pcol/game/res/index.js'), 'utf8');

async function settled(page, id) {
  await page.waitForFunction((id) => {
    const panel = window.__pcolTestGame._uiLayer._registeredBox[id];
    return panel.isActive && !panel.needsUpdate && !panel.blocked;
  }, id);
}

async function bounds(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    };
  });
}

function near(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) <= 2, label + ': ' + actual + ' / ' + expected);
}

async function inspect(browser, target, mode, name) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== target.origin) {
      errors.push('External request: ' + url.href);
      await route.abort();
    } else if (target.name === 'baseline' && url.pathname === '/res/index.js') {
      await route.fulfill({
        body: inspectRuntimeEntry(baselineScript, { baseline: true }),
        contentType: 'text/javascript',
      });
    } else if (target.name !== 'baseline' && (await inspectRuntimeRoute(route, target))) {
      return;
    } else {
      await route.continue();
    }
  });
  try {
    await page.goto(target.origin + '/');
    await page.waitForFunction(() => {
      const game = window.__pcolTestGame;
      return game?._currentController?.name === 'home' && game._currentController.state === 3;
    });
    await page
      .locator('.side-button')
      .filter({ hasText: mode === 'practice' ? 'PRACTICE' : 'SINGLE PLAY' })
      .click();
    let difficulty;
    if (mode === 'match') {
      await settled(page, 'hmDifBox');
      difficulty = await bounds(page, '.difficulty-box');
      await page.locator('.difficulty-box [data-sid="ai1"]').click();
    }
    await page.waitForFunction(() => {
      const game = window.__pcolTestGame;
      return (
        game._currentController.name === 'game' &&
        game._currentController.state === 3 &&
        !game._uiLayer.isBlocked
      );
    });
    const hud = [];
    for (const side of mode === 'match' ? ['left', 'right'] : ['left']) {
      const group = await bounds(page, '.score-container .' + side);
      const points = await bounds(page, '.score-container .' + side + ' .pts');
      hud.push({
        side,
        x: Math.min(group.x, points.x),
        y: group.y,
        right: Math.max(group.right, points.right),
        height: Math.max(group.height, points.height),
        points,
      });
    }
    const toolbar = await bounds(page, '.ingame-controls');
    if (target.name !== 'baseline') {
      assert.equal(await page.locator('.game-ui-target').count(), 0);
      assert.equal(
        await page
          .locator('.game-ui-status')
          .evaluate((element) => element.getBoundingClientRect().height),
        1,
      );
    }
    await page.screenshot({
      path: path.join(output, name + '-' + target.name + '-' + mode + '-hud.png'),
    });
    await page.locator('.ingame-controls [data-action="pause"]').click();
    await settled(page, 'pauseBox');
    const pause = await bounds(page, '.pause-box');
    const order = await page
      .locator('.pause-box section[data-sid]')
      .evaluateAll((elements) => elements.map((element) => element.dataset.sid));
    if (target.name !== 'baseline') {
      assert.equal(
        await page
          .locator('.pause-box')
          .getByRole('button', { name: 'RESUME', exact: true })
          .count(),
        1,
      );
      assert.equal(await page.locator('.pause-box .game-ui-dismiss').count(), 0);
      assert.equal(await page.locator('.game-ui-drawer').count(), 0);
    }
    await page.screenshot({
      path: path.join(output, name + '-' + target.name + '-' + mode + '-pause.png'),
    });
    await page.locator('.pause-box [data-sid="controls_guide"]').click();
    await settled(page, 'controlsGuideBox');
    const help = await bounds(page, '.controls-guide-box:visible');
    const helpBody = await bounds(
      page,
      target.name === 'baseline'
        ? '.controls-guide-box:visible .box-body'
        : '.controls-guide-box:visible .game-ui-panel-content',
    );
    await page.screenshot({
      path: path.join(output, name + '-' + target.name + '-' + mode + '-help.png'),
    });
    let narrow;
    if (target.name !== 'baseline') {
      await page.keyboard.press('Escape');
      await page.locator('.controls-guide-box:visible').waitFor({ state: 'hidden' });
      await settled(page, 'pauseBox');
      await page.keyboard.press('Escape');
      await page.locator('.pause-box').waitFor({ state: 'hidden' });
      await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
      await page.setViewportSize({ width: 320, height: 450 });
      narrow = await page.locator('.score-container').evaluate((element) => {
        const children = [...element.querySelectorAll('.left,.right,.pts')].filter(
          (child) =>
            window.getComputedStyle(child).display !== 'none' &&
            child.getBoundingClientRect().width,
        );
        return children.map((child) => {
          const rect = child.getBoundingClientRect();
          return { x: rect.x, right: rect.right, y: rect.y, bottom: rect.bottom };
        });
      });
      for (const rect of narrow) {
        assert.ok(rect.x >= 0 && rect.right <= 320, JSON.stringify(rect));
        assert.ok(rect.y >= 0 && rect.bottom <= 450, JSON.stringify(rect));
      }
      await page.screenshot({
        path: path.join(output, name + '-' + target.name + '-' + mode + '-narrow.png'),
      });
    }
    assert.deepEqual(errors, []);
    return { difficulty, hud, toolbar, pause, order, help, helpBody, narrow };
  } finally {
    await page.close();
  }
}

try {
  for (const candidate of browserCandidates()) {
    const browser = await launchTestBrowser(candidate);
    try {
      for (const mode of ['practice', 'match']) {
        const reference = await inspect(browser, baselineTarget, mode, candidate.name);
        for (const target of fixture.targets) {
          const result = {
            browser: candidate.name,
            target: target.name,
            mode,
            reference,
            passed: false,
          };
          report.targets.push(result);
          result.current = await inspect(browser, target, mode, candidate.name);
          const current = result.current;
          assert.deepEqual(current.order, reference.order);
          for (let index = 0; index < reference.hud.length; index++) {
            for (const coordinate of ['x', 'y', 'right', 'height']) {
              near(
                current.hud[index][coordinate],
                reference.hud[index][coordinate],
                mode + ' HUD ' + coordinate,
              );
            }
          }
          near(current.toolbar.y, reference.toolbar.y, 'Toolbar location');
          near(current.pause.width, reference.pause.width, 'Pause width');
          near(
            current.pause.x + current.pause.width / 2,
            reference.pause.x + reference.pause.width / 2,
            'Pause horizontal center',
          );
          near(
            current.pause.y + current.pause.height / 2,
            reference.pause.y + reference.pause.height / 2,
            'Pause vertical center',
          );
          near(current.help.width, reference.help.width, 'Help width');
          near(current.helpBody.height, reference.helpBody.height, 'Help scroll area');
          near(
            current.help.x + current.help.width / 2,
            reference.help.x + reference.help.width / 2,
            'Help center',
          );
          if (mode === 'match') {
            near(current.difficulty.width, reference.difficulty.width, 'Difficulty width');
          }
          result.passed = true;
          console.log(candidate.name + '/' + target.name + '/' + mode + ': PCOL layout passed');
        }
      }
    } finally {
      await browser.close();
    }
  }
  report.passed = true;
} finally {
  baseline.closeAllConnections();
  await new Promise((resolve) => baseline.close(resolve));
  await fixture.close();
  await writeFile(
    path.join(ROOT, 'reports/validation/pcol-ui-layout.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
