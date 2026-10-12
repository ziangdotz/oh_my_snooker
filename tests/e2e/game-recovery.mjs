import { confirmGameAction } from '../helpers/game-ui-actions.mjs';
import assert from 'node:assert/strict';

export async function gameState(page) {
  return page.evaluate(() => {
    const game = window.__pcolTestGame;
    const controller = game._currentController;
    const model = controller._model;
    return {
      state: model.gState,
      context: { ...model._gContext },
      control: controller._activeSubControl.name,
      players: model.players.map((player) => ({
        pts: player.pts,
        brk: player.brk,
        maxbrk: player.maxbrk,
        penalty: player.penalty,
        shootingCount: player.shootingCount,
        scoreCount: player.scoreCount,
      })),
      balls: controller._simulator.getBalls().map((ball) => ({
        active: ball.active,
        position: [ball.position.x, ball.position.y, ball.position.z],
        velocity: [ball.v.x, ball.v.y, ball.v.z],
        spin: [ball.w.x, ball.w.y, ball.w.z],
      })),
      meshes: game._gView.ballMeshes.map((mesh) => ({
        visible: mesh.isVisible,
        position: mesh.position.asArray(),
      })),
      replayId: controller._movieClip.uniqueId,
      ui: {
        pts: Number(document.querySelector('.score-container .left .pts').textContent),
        brk: Number(document.querySelector('.score-container .left .brk').textContent),
        ballOn: document.querySelector('.score-container .left .ball-on-icon').className,
      },
    };
  });
}

export function assertBallsRestored(state) {
  assert.equal(state.balls.length, 22);
  assert.equal(state.meshes.length, 22);
  for (const [index, ball] of state.balls.entries()) {
    assert.equal(state.meshes[index].visible, ball.active, `Restored mesh ${index} visibility`);
    if (ball.active) {
      for (let axis = 0; axis < 3; axis++) {
        assert.ok(
          Math.abs(ball.position[axis] - state.meshes[index].position[axis]) <= 1e-7,
          `Restored mesh ${index} axis ${axis}`,
        );
      }
    }
  }
}

export async function gameRecovery(page, initial) {
  assert.equal(initial.players.length, 1, 'Recovery uses Practice to avoid AI timing');
  const beforeExit = await gameState(page);
  assert.equal(beforeExit.control, 'replay');
  assert.equal(beforeExit.context.nRounds, 1, 'First real stroke was judged');
  assert.equal(beforeExit.players[0].shootingCount, 1);
  await page.locator('.replay-control .close-button').click();
  await page.waitForFunction(() => {
    const controller = window.__pcolTestGame._currentController;
    return (
      controller._activeSubControl === controller._subControl.gaming &&
      controller._model.gState === window.__pcolTestRequire('domain/game/game-state').READY
    );
  });
  const afterExit = await gameState(page);
  assert.deepEqual(afterExit.context, beforeExit.context, 'Replay exit preserves the rule context');
  assert.deepEqual(
    afterExit.players,
    beforeExit.players,
    'Replay exit preserves all scores/counters',
  );
  assert.deepEqual(afterExit.balls, beforeExit.balls, 'Replay exit preserves physical balls');
  assertBallsRestored(afterExit);
  await page.locator('#game-view').focus();
  await page.keyboard.press('w');
  await page.waitForFunction(() =>
    window.__pcolTestGame._currentController._playerCtls[0].stickCtl.isReadyToStroke(),
  );
  await page.keyboard.press('Space');
  await page.waitForFunction(() => {
    const model = window.__pcolTestGame._currentController._model;
    return (
      model.gState === window.__pcolTestRequire('domain/game/game-state').SIMULATING &&
      model.players[0].shootingCount === 2
    );
  });
  await page.waitForFunction(
    () => {
      const controller = window.__pcolTestGame._currentController;
      return (
        controller._model.gState === window.__pcolTestRequire('domain/game/game-state').READY &&
        controller._model.getContext('nRounds') === 2
      );
    },
    undefined,
    { timeout: 30000 },
  );
  const continued = await gameState(page);
  assert.equal(continued.players[0].shootingCount, 2);
  assert.notEqual(continued.replayId, beforeExit.replayId, 'Continued play records a new stroke');
  assertBallsRestored(continued);
  await page.locator('.ingame-controls [data-action="pause"]').click();
  await page.locator('.pause-box [data-sid="restart"]').click();
  await confirmGameAction(page, 'restart');
  await page.waitForFunction(() => {
    const controller = window.__pcolTestGame._currentController;
    return (
      controller._model.gState === window.__pcolTestRequire('domain/game/game-state').READY &&
      controller._model.getContext('nRounds') === 0 &&
      controller._activeSubControl === controller._subControl.inHand &&
      !controller._paused
    );
  });
  const restarted = await gameState(page);
  if (await page.locator('.game-ui-instruction').count()) {
    assert.equal(await page.locator('.game-ui-instruction').isVisible(), true);
    assert.equal(
      await page.locator('.game-ui-notice:not(.game-ui-instruction)').isVisible(),
      false,
    );
  }
  assert.deepEqual(restarted.context, initial.context, 'Restart restores opening rule context');
  assert.deepEqual(
    restarted.players,
    initial.players,
    'Restart clears scores, breaks, penalties and counters',
  );
  assert.deepEqual(
    restarted.balls,
    initial.balls,
    'Restart restores all physical ball positions and motion',
  );
  assert.deepEqual(restarted.ui, initial.ui, 'Restart restores displayed scores and target');
  assertBallsRestored(restarted);
  assert.ok(
    continued.context.nRounds > 0 && continued.players[0].penalty < 0,
    'Restart follows changed game state rather than a fresh game',
  );
  return {
    trace: { initial, beforeExit, afterExit, continued, restarted },
    summary: {
      replayExitPreservesState: true,
      replayExitRestoresMeshes: true,
      continuedRealStrokes: 2,
      continuedRecordingChanged: true,
      restartClearsScores: true,
      restartRestores22Balls: true,
      restartViaConfirmationUI: true,
    },
  };
}
