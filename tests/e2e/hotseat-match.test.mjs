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
import { waitForActiveBasicGuide, confirmGameAction } from '../helpers/game-ui-actions.mjs';
import { waitForCamera, observeFrames } from './browser-observations.mjs';
import { gameState, assertBallsRestored } from './game-recovery.mjs';
import { snookerRules } from './snooker-rules.mjs';

const args = process.argv.slice(2);
assert.ok(
  args.length === 0 || (args.length === 1 && args[0] === '--lifecycle'),
  'Usage: node tests/e2e/hotseat-match.test.mjs [--lifecycle]',
);
const lifecycleOnly = args.includes('--lifecycle');
const suite = lifecycleOnly ? 'hotseat-lifecycle' : 'hotseat-match';
const output = path.join(ROOT, 'artifacts/testing/' + suite);
await mkdir(output, { recursive: true });
const report = {
  date: new Date().toISOString(),
  scenarios: [],
  passed: false,
  limitations: [
    'Rule cases inject contact/pot outcomes into the actual referee, separate from real keyboard/mouse strokes. Results use controlled score fixtures; this does not represent a complete physically played frame.',
    'Headless software WebGL checks functionality, not hardware latency.',
  ],
};
const fixture = await createRuntimeFixture();
let browser;
async function ready(page) {
  await page.waitForFunction(() => {
    const game = window.__pcolTestGame;
    return (
      game._currentController.name === 'game' &&
      game._currentController.state === 3 &&
      game._currentController._model.gState === 4 &&
      game._currentController._simulator._world.environmentReady &&
      !game._uiLayer.isBlocked &&
      game._gView._scene.isReady()
    );
  });
  await waitForCamera(page);
}
async function closeGuide(page) {
  await waitForActiveBasicGuide(page);
  const guide = page.locator('.controls-guide-box:visible');
  if (await guide.count()) {
    await guide.getByRole('button', { name: 'CLOSE', exact: true }).click();
    await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  }
}
async function setup(page, design, names = ['Alice', 'Bob']) {
  await page.locator('.interior-more-menu-item').click();
  await page.waitForFunction(() => {
    const box = window.__pcolTestGame._currentController._moreDialog;
    return box?.isActive && !box.needsUpdate && !box.blocked;
  });
  await page.locator('[data-hotseat-setup]').click();
  await page.locator('input[name="player-1"]').fill(names[0]);
  await page.locator('input[name="player-2"]').fill(names[1]);
  await page.locator('input[name="venue"][value="' + design + '"]').check();
}
async function place(page) {
  if (
    await page.evaluate(
      () => window.__pcolTestGame._currentController._activeSubControl.name !== 'inHand',
    )
  ) {
    return;
  }
  const point = await page.evaluate(() => {
    const game = window.__pcolTestGame;
    const view = game._gView;
    const B = window.__pcolTestRequire('adapters/rendering/babylon-engine');
    const p = B.Vector3.Project(
      new B.Vector3(-1.18, 0.02625, 0.12).add(view._playArea.position),
      B.Matrix.Identity(),
      view._scene.getTransformMatrix(),
      view.camera.viewport.toGlobal(game._engine.getRenderWidth(), game._engine.getRenderHeight()),
    );
    const rect = view.canvas.getBoundingClientRect();
    return {
      x: rect.x + (p.x * rect.width) / game._engine.getRenderWidth(),
      y: rect.y + (p.y * rect.height) / game._engine.getRenderHeight(),
    };
  });
  await page.mouse.move(point.x, point.y);
  await page.waitForFunction(() => {
    const control = window.__pcolTestGame._currentController._activeSubControl;
    return control._isValidSpot && !control._needsUpdate;
  });
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForFunction(
    () => window.__pcolTestGame._currentController._activeSubControl.name === 'gaming',
  );
  await closeGuide(page);
}
async function shot(page, stress = false) {
  await place(page);
  await page.locator('#game-view').focus();
  await page.keyboard.press('w');
  await page.waitForFunction(() =>
    window.__pcolTestGame._currentController._fpc.stickCtl.isReadyToStroke(),
  );
  await closeGuide(page);
  await page.locator('#game-view').focus();
  const before = await gameState(page);
  await page.keyboard.down('Space');
  await page.waitForFunction(() => window.__pcolTestGame._currentController._model.gState === 8);
  if (stress) {
    await page.keyboard.down('ArrowRight');
    await page.mouse.move(600, 450);
    await page.mouse.down();
    await page.mouse.move(640, 460, { steps: 4 });
  }
  await page.waitForFunction((rounds) => {
    const model = window.__pcolTestGame._currentController._model;
    return model.gState === 4 && model.getContext('nRounds') === rounds + 1;
  }, before.context.nRounds);
  if (stress) {
    assert.deepEqual(
      await page.evaluate(() => {
        const controller = window.__pcolTestGame._currentController;
        const input = controller._subControl.gaming._evtManager;
        const orbit = controller._fpc._horizonCtl;
        return {
          dragging: input._isDragging,
          heldKeys: Object.values(input._keyList).some((key) => key.triggered),
          speed: orbit._angularSpd,
          target: orbit._orbitSpd.tgt,
        };
      }),
      { dragging: false, heldKeys: false, speed: 0, target: 0 },
    );
    await page.keyboard.up('ArrowRight');
    await page.mouse.up();
  }
  await page.keyboard.up('Space');
  await closeGuide(page);
  const after = await gameState(page);
  assert.equal(
    after.players.reduce((sum, player) => sum + player.shootingCount, 0),
    before.players.reduce((sum, player) => sum + player.shootingCount, 0) + 1,
  );
  assertBallsRestored(after);
  assert.equal(
    await page.evaluate(() => window.__pcolTestGame._currentController._fpc.gPlayerIndex),
    after.context.playerIndex,
  );
  return { before, after };
}
async function pause(page, action) {
  await page.locator('.ingame-controls [data-action="pause"]').click();
  await page.waitForFunction(() => {
    const box = window.__pcolTestGame._uiLayer._registeredBox.pauseBox;
    return box.isActive && !box.needsUpdate && !box.blocked;
  });
  const before = await gameState(page);
  await observeFrames(page);
  assert.deepEqual(await gameState(page), before, 'pause preserves game state');
  await page.locator('.pause-box [data-sid="' + action + '"]').click();
  if (action !== 'resume') {
    await confirmGameAction(page, action);
  }
}
async function opening(page) {
  return page.evaluate(() => {
    const game = window.__pcolTestGame;
    return {
      camera: {
        position: game._gView.camera.position.asArray(),
        target: game._gView.camera.lockedTarget.asArray(),
        fov: game._gView.camera.fov,
      },
      balls: game._currentController._simulator
        .getBalls()
        .map((ball) => [
          ball.number,
          ball.active,
          ball.position.x,
          ball.position.y,
          ball.position.z,
        ]),
      lights: game._gView._scene.lights
        .filter((light) => light.isEnabled())
        .map((light) => [light.name, light.intensity]),
    };
  });
}
async function verifyRecovery(page, entry) {
  await setup(page, 'interior-design-001', ['Carol', 'Dan']);
  await page.evaluate(() => {
    const game = window.__pcolTestGame;
    window.__hotseatScene = game._gView._scene;
    window.__hotseatEngine = game._engine;
    const switcher = game._gView._scene.interiorSwitcher;
    const realSwitch = switcher.switchTo.bind(switcher);
    switcher.switchTo = (_id) => {
      switcher.switchTo = realSwitch;
      return Promise.reject(new Error('Controlled venue preparation failure'));
    };
  });
  await page.getByRole('button', { name: 'START MATCH', exact: true }).click();
  await page.locator('.interior-transition[data-state="error"]').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => window.__pcolTestGame._currentController.name), 'home');
  await page.locator('.interior-transition [data-action="back"]').click();
  await page.waitForFunction(() => !window.__pcolTestGame._currentController._moreDialog._busy);
  assert.equal(await page.locator('input[name="player-1"]').inputValue(), 'Carol');
  assert.equal(
    await page.locator('input[name="venue"]:checked').inputValue(),
    'interior-design-001',
  );
  assert.equal(
    await page.evaluate(() => window.__pcolTestGame._gView._scene.metadata.interiorDesign.id),
    'interior-design-original',
  );
  await page.getByRole('button', { name: 'START MATCH', exact: true }).click();
  await ready(page);
  assert.deepEqual(
    await page.evaluate(() => {
      const game = window.__pcolTestGame;
      return {
        design: game._gView._scene.metadata.interiorDesign.id,
        sameEngine: game._engine === window.__hotseatEngine,
        sameScene: game._gView._scene === window.__hotseatScene,
        names: game._currentController._model.players.map((player) => player.displayName),
        rounds: game._currentController._model.getContext('nRounds'),
      };
    }),
    {
      design: 'interior-design-001',
      sameEngine: true,
      sameScene: true,
      names: ['Carol', 'Dan'],
      rounds: 0,
    },
  );
  await pause(page, 'quit');
  await waitForHome(page, 'interior-design-001');
  await openVenueDrawer(page);
  await page.locator('[data-design-id="interior-design-original"]').click();
  await waitForHome(page, 'interior-design-original');
  entry.venueFailureCancelRetry = true;
}
try {
  for (const candidate of browserCandidates()) {
    browser = await launchTestBrowser(candidate);
    for (const target of fixture.targets.filter(
      (item) => !lifecycleOnly || item.name === 'source',
    )) {
      for (const suffix of lifecycleOnly ? ['original'] : ['original', '001', '002', '003']) {
        const design = 'interior-design-' + suffix;
        const entry = { browser: candidate.name, target: target.name, design, errors: [] };
        report.scenarios.push(entry);
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        page.setDefaultTimeout(45000);
        page.on('pageerror', (error) => entry.errors.push(error.message));
        await page.route('**/*', async (route) => {
          if (
            !route
              .request()
              .url()
              .startsWith(target.origin + '/')
          ) {
            entry.errors.push('External request');
            await route.abort();
          } else if (!(await inspectRuntimeRoute(route, target))) {
            await route.continue();
          }
        });
        try {
          await page.goto(target.origin + '/?interior=' + design);
          await waitForHome(page, design);
          if (suffix === 'original') {
            await setup(page, design, ['王小明', 'Bob']);
            await page.reload();
            await page.waitForFunction(() => {
              const box = window.__pcolTestGame?._currentController?._moreDialog;
              return box?._page === 'setup' && box.isActive && !box.needsUpdate && !box.blocked;
            });
            assert.equal(await page.locator('input[name="player-1"]').inputValue(), '王小明');
            assert.equal(
              await page.evaluate(() => window.__pcolTestGame._currentController.name),
              'home',
            );
            await page.getByRole('button', { name: 'Close PLAY TOGETHER', exact: true }).click();
            await waitForHome(page, design);
            entry.refreshRestoresSetupWithoutMatch = true;
            await verifyRecovery(page, entry);
          }
          // Compare to the actual Single Play opening, including all 22 balls and lighting.
          await page.locator('.side-button').filter({ hasText: 'SINGLE PLAY' }).click();
          await page.waitForFunction(() => {
            const box = window.__pcolTestGame._uiLayer._registeredBox.hmDifBox;
            return box?.isActive && !box.needsUpdate && !box.blocked;
          });
          await page.locator('.difficulty-box [data-sid="ai1"] button').click();
          await ready(page);
          const singleOpening = await opening(page);
          await pause(page, 'quit');
          await waitForHome(page, design);
          await setup(page, design, [' Alice ', 'alice']);
          await page.getByRole('button', { name: 'START MATCH', exact: true }).click();
          assert.match(await page.locator('#hotseat-error').textContent(), /different name/);
          await page.locator('input[name="player-2"]').fill('Bob');
          if (target.name === 'source' && suffix === 'original') {
            for (const viewport of [
              { width: 360, height: 780 },
              { width: 768, height: 900 },
              { width: 1440, height: 900 },
            ]) {
              await page.setViewportSize(viewport);
              const bounds = await page.locator('.interior-more-things').boundingBox();
              assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width + 1);
              assert.equal(await page.locator('.hotseat-venue').count(), 4);
              await page.screenshot({
                path: path.join(output, candidate.name + '-setup-' + viewport.width + '.png'),
              });
            }
          }
          await page.getByRole('button', { name: 'START MATCH', exact: true }).click();
          await ready(page);
          const hotseatOpening = await opening(page);
          assert.deepEqual(hotseatOpening.balls, singleOpening.balls);
          assert.deepEqual(hotseatOpening.lights, singleOpening.lights);
          assert.equal(hotseatOpening.camera.fov, singleOpening.camera.fov);
          for (const key of ['position', 'target']) {
            hotseatOpening.camera[key].forEach((coordinate, index) => {
              assert.ok(
                Math.abs(coordinate - singleOpening.camera[key][index]) < 1e-9,
                'hotseat uses Single Play camera: ' + key,
              );
            });
          }
          const initial = await gameState(page);
          assert.equal(initial.control, 'inHand');
          assert.equal(initial.context.playerIndex, 0);
          assert.deepEqual(
            await page.evaluate(() => {
              const controller = window.__pcolTestGame._currentController;
              return {
                names: controller._model.players.map((player) => player.displayName),
                types: controller._model.players.map((player) => player.type),
                controls: controller._playerCtls.length,
                unique: new Set(controller._playerCtls).size,
              };
            }),
            { names: ['Alice', 'Bob'], types: [0, 0], controls: 1, unique: 1 },
          );
          const first = await shot(page, true);
          assert.equal(first.after.context.playerIndex, 1, 'opening miss/foul transfers the turn');
          await pause(page, 'resume');
          await ready(page);
          const beforeReplay = await gameState(page);
          await page.locator('.ingame-controls [data-action="replay"]').click();
          await page.waitForFunction(
            () => window.__pcolTestGame._currentController._activeSubControl.name === 'replay',
          );
          await observeFrames(page, 12);
          await page.locator('.replay-control .close-button').click();
          await ready(page);
          const afterReplay = await gameState(page);
          assert.deepEqual(afterReplay.players, beforeReplay.players);
          assert.deepEqual(afterReplay.context, beforeReplay.context);
          assert.deepEqual(afterReplay.balls, beforeReplay.balls);
          assertBallsRestored(afterReplay);
          const second = await shot(page);
          assert.deepEqual(
            second.after.players.map((player) => player.shootingCount),
            [1, 1],
          );
          await pause(page, 'restart');
          await ready(page);
          const reset = await gameState(page);
          assert.equal(reset.context.playerIndex, 1);
          assert.equal(reset.context.nRounds, 0);
          entry.realShots = [first, second].map(({ before, after }) => ({
            owner: before.context.playerIndex,
            rounds: after.context.nRounds,
            shotCounts: after.players.map((player) => player.shootingCount),
            nextPlayer: after.context.playerIndex,
          }));
          entry.heldInputCleared = true;
          entry.replayPreservesModelAndBalls = true;
          entry.restartOpener = reset.context.playerIndex;
          entry.openingMatchesSinglePlay = true;
          assert.ok(
            reset.players.every(
              (player) => player.shootingCount === 0 && player.pts === 0 && player.penalty === 0,
            ),
          );
          await place(page);
          assert.equal(
            await page.evaluate(() => window.__pcolTestGame._currentController._fpc.gPlayerIndex),
            1,
          );
          if (!lifecycleOnly && target.name === 'source' && suffix === 'original') {
            const rulesPath = path.join(output, candidate.name + '-rules.json');
            entry.rules = await snookerRules(page, rulesPath);
            // Plain text names must never become markup in scoreboard or result headings.
            const resultCases = await page.evaluate(() => {
              const controller = window.__pcolTestGame._currentController;
              const players = controller._model.players;
              players[0]._userInfo.displayName = '<img src=x>';
              players[1]._userInfo.displayName = 'Bob';
              const ui = window.__pcolTestGame._uiLayer;
              ui.getRegisteredUI('scoreBar').resetPlayers(players);
              const result = ui._registeredBox.duoResultBox;
              return [
                [12, 0],
                [0, 12],
                [0, 0],
              ].map(([left, right]) => {
                players[0].pts = left;
                players[1].pts = right;
                players[0].penalty = 0;
                players[1].penalty = 0;
                players[0].brk = 7;
                result.data({ time: 1, players });
                return {
                  heading: result._head.textContent,
                  best: result._brks[0].textContent,
                  markup: result.element.querySelector('img') !== null,
                  hudMarkup:
                    ui.getRegisteredUI('scoreBar').element.querySelector('.head img') !== null,
                };
              });
            });
            assert.deepEqual(
              resultCases.map((item) => item.heading),
              ['<IMG SRC=X> WINS', 'BOB WINS', 'DRAW'],
            );
            assert.ok(
              resultCases.every((item) => !item.markup && !item.hudMarkup && item.best === '7'),
            );
            entry.results = resultCases;
          }
          if (lifecycleOnly) {
            // Player 2 can quit after placing the ball; a fresh match resets the opener.
            await pause(page, 'quit');
            await waitForHome(page, design);
            await setup(page, design);
            await page.getByRole('button', { name: 'START MATCH', exact: true }).click();
            await ready(page);
            assert.equal((await gameState(page)).context.playerIndex, 0);
            // Controlled terminal state exercises the actual result/retry UI, without
            // claiming this was a fully played physical frame.
            await page.evaluate(() => {
              const controller = window.__pcolTestGame._currentController;
              const model = controller._model;
              model.players[0].pts = 12;
              model._gContext.ballOn = 0;
              model._response(controller._simulator);
            });
            await page.waitForFunction(() => {
              const box = window.__pcolTestGame._uiLayer._registeredBox.duoResultBox;
              return box.isActive && !box.needsUpdate && !box.blocked;
            });
            assert.equal(
              await page.locator('.game-ui-results .box-head').textContent(),
              'ALICE WINS',
            );
            await page
              .locator('.game-ui-results')
              .getByRole('button', { name: 'PLAY AGAIN', exact: true })
              .click();
            await ready(page);
            const again = await gameState(page);
            assert.equal(again.context.playerIndex, 1);
            assert.equal(again.context.nRounds, 0);
            assert.ok(
              again.players.every((player) => player.pts === 0 && player.shootingCount === 0),
            );
            await pause(page, 'quit');
            await waitForHome(page, design);
            await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
            await ready(page);
            assert.equal((await gameState(page)).players.length, 1);
            assert.equal(
              await page.evaluate(() => window.__pcolTestGame._currentController._model.isHotseat),
              false,
            );
            entry.playerTwoQuitAndResultRetry = true;
            entry.returnToPractice = true;
          }
          entry.passed = true;
          assert.deepEqual(entry.errors, []);
          console.log('Hotseat passed: ' + candidate.name + ' / ' + target.name + ' / ' + design);
        } catch (error) {
          entry.failure = error.stack;
          await page.screenshot({
            path: path.join(
              output,
              candidate.name + '-' + target.name + '-' + suffix + '-failure.png',
            ),
          });
          console.log(
            await page.evaluate(() => ({
              body: document.body.innerText,
              state: window.__pcolTestGame?._currentController?.state,
              context: window.__pcolTestGame?._currentController?._model?._gContext,
            })),
          );
          throw error;
        } finally {
          await context.close();
        }
      }
    }
    await browser.close();
    browser = null;
  }
  report.passed = true;
} finally {
  await browser?.close();
  await fixture.close();
  await writeFile(
    path.join(ROOT, 'reports/validation/' + suite + '.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
