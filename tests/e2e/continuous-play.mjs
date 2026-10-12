import { confirmGameAction, waitForActiveBasicGuide } from '../helpers/game-ui-actions.mjs';
import assert from 'node:assert/strict';
import { gameState, assertBallsRestored } from './game-recovery.mjs';
import { observeFrames, waitForCamera } from './browser-observations.mjs';
import { waitForHumanTurn } from '../helpers/human-turn-readiness.mjs';

async function closeGuide(page) {
  await waitForActiveBasicGuide(page);
  const guide = page.locator('.controls-guide-box:visible');
  if (await guide.count()) {
    await guide.getByRole('button', { name: 'CLOSE', exact: true }).click();
    await guide.waitFor({ state: 'hidden' });
    await page.waitForFunction(() => !window.__pcolTestGame._uiLayer.isBlocked);
  }
}

async function ready(page) {
  await waitForHumanTurn(page);
  await closeGuide(page);
}

async function placeCue(page) {
  if (
    await page.evaluate(
      () => window.__pcolTestGame._currentController._activeSubControl.name !== 'inHand',
    )
  ) {
    return;
  }
  await waitForCamera(page);
  // Only real pointer input places the ball. Try distinct legal D-zone spots
  // when a later foul has left an object ball occupying the opening spot.
  for (const z of [0.12, -0.12, 0, 0.2, -0.2]) {
    const point = await page.evaluate((z) => {
      const g = window.__pcolTestGame;
      const B = window.__pcolTestRequire('adapters/rendering/babylon-engine');
      const v = g._gView;
      const p = B.Vector3.Project(
        new B.Vector3(-1.18, 0.02625, z).add(v._playArea.position),
        B.Matrix.Identity(),
        v._scene.getTransformMatrix(),
        v._scene.activeCamera.viewport.toGlobal(
          g._engine.getRenderWidth(),
          g._engine.getRenderHeight(),
        ),
      );
      return { x: p.x, y: p.y };
    }, z);
    await page.mouse.move(point.x, point.y);
    await page.waitForFunction(
      () => !window.__pcolTestGame._currentController._activeSubControl._needsUpdate,
    );
    if (
      await page.evaluate(
        () => window.__pcolTestGame._currentController._activeSubControl._isValidSpot,
      )
    ) {
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForFunction(
        () => window.__pcolTestGame._currentController._activeSubControl.name === 'gaming',
      );
      return;
    }
  }
  assert.fail('No legal tested D-zone placement');
}

async function humanShot(page, power) {
  await ready(page);
  await placeCue(page);
  await closeGuide(page);
  await page.locator('#game-view').focus();
  await page.keyboard.press('w');
  await page.waitForFunction(() =>
    window.__pcolTestGame._currentController._playerCtls[0].isReadyToStroke(),
  );
  await closeGuide(page);
  const previous = await gameState(page);
  const beforePower = await page.evaluate(
    () => window.__pcolTestGame._currentController._playerCtls[0].strokePower,
  );
  if (Math.abs(beforePower - power) > 1e-7) {
    const canvas = await page.locator('#game-view').boundingBox();
    assert.ok(canvas);
    await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height * 0.45);
    await page.mouse.wheel(0, Math.round((power - beforePower) / 0.0005));
    await page.waitForFunction(
      (power) =>
        Math.abs(window.__pcolTestGame._currentController._playerCtls[0].strokePower - power) <
        1e-6,
      power,
    );
  }
  await page.locator('#game-view').focus();
  await page.keyboard.press('Space');
  await page.waitForFunction(
    (shoots) =>
      window.__pcolTestGame._currentController._model.players[0].shootingCount === shoots + 1,
    previous.players[0].shootingCount,
  );
  await page.waitForFunction(
    (rounds) => window.__pcolTestGame._currentController._model.getContext('nRounds') > rounds,
    previous.context.nRounds,
    { timeout: 45000 },
  );
  await ready(page);
  // A cue-ball foul enters the placement control, which previews a ghost
  // ball and hides Replay. Complete its real placement before comparing meshes.
  await placeCue(page);
  const after = await gameState(page);
  assert.equal(
    after.players[0].shootingCount,
    previous.players[0].shootingCount + 1,
    'Exactly one human stroke',
  );
  assert.notEqual(
    after.replayId,
    previous.replayId,
    'A subsequent stroke replaces the recorded clip',
  );
  assert.equal(
    after.ui.pts,
    after.players[0].pts - (after.players[1]?.penalty ?? 0),
    'Displayed score follows scoring and penalties',
  );
  assert.equal(after.ui.brk, after.players[0].brk, 'Displayed break matches the player');
  assert.equal(
    after.ui.ballOn,
    `ball-on-icon snooker b-${after.context.ballOn}`,
    'Displayed target matches the returned turn',
  );
  assert.ok(
    after.balls.every((ball) =>
      [...ball.position, ...ball.velocity, ...ball.spin].every(Number.isFinite),
    ),
    'Physics contains no NaN or Infinity',
  );
  assertBallsRestored(after);
  return after;
}

async function replayCycle(page) {
  await closeGuide(page);
  await placeCue(page);
  await page.locator('.replay-icon').click();
  await page.locator('.replay-control').waitFor();
  await page.locator('.replay-control .pause-button').click();
  await page.waitForFunction(() => {
    const clip = window.__pcolTestGame._currentController._movieClip;
    return clip.state === 0 && !clip.needsUpdate;
  });
  const before = await gameState(page);
  const head = await page.evaluate(
    () => window.__pcolTestGame._currentController._movieClip.playHead,
  );
  await observeFrames(page);
  assert.equal(
    await page.evaluate(() => window.__pcolTestGame._currentController._movieClip.playHead),
    head,
    'Replay stays paused',
  );
  await page.locator('.replay-control .play-button').click();
  await page.waitForFunction(
    (head) => window.__pcolTestGame._currentController._movieClip.playHead > head,
    head,
  );
  await page.locator('.replay-control .close-button').click();
  await ready(page);
  const after = await gameState(page);
  for (const key of ['context', 'players', 'balls', 'replayId', 'ui']) {
    assert.deepEqual(after[key], before[key], `Replay exit preserves ${key}`);
  }
  assertBallsRestored(after);
  return {
    round: after.context.nRounds,
    replayId: after.replayId,
    duration: await page.evaluate(
      () => window.__pcolTestGame._currentController._movieClip.duration,
    ),
  };
}

async function menuAction(page, action) {
  const resets = await page.evaluate(() => window.__pcolContinuousResets.length);
  await closeGuide(page);
  await page.locator('.ingame-controls [data-action="pause"]').click();
  await page.locator(`.pause-box [data-sid="${action}"]`).click();
  await confirmGameAction(page, action);
  if (action === 'quit') {
    await page.locator('.side-button').filter({ hasText: 'SINGLE PLAY' }).waitFor();
    await waitForCamera(page);
  } else {
    await page.waitForFunction(
      (count) => window.__pcolContinuousResets.length === count + 1,
      resets,
    );
    await ready(page);
    await waitForCamera(page);
  }
}

async function enter(page, mode) {
  // Subscribe before launching: the AI can be the opening player and act
  // before a camera-ready polling snapshot. Reset notifications are synchronous.
  await page.evaluate(() => {
    const c = window.__pcolTestGame._controllers.game;
    window.__pcolContinuousRounds = [];
    window.__pcolContinuousStateChanges = [];
    window.__pcolContinuousResets = [];
    c._model.on('gstate_change', (state) => window.__pcolContinuousStateChanges.push(state));
    c._model.on('response', (result) => {
      const m = c._model;
      const round = {
        context: { ...m._gContext },
        players: m.players.map((p) => ({
          pts: p.pts,
          brk: p.brk,
          maxbrk: p.maxbrk,
          penalty: p.penalty,
          shootingCount: p.shootingCount,
          scoreCount: p.scoreCount,
        })),
        simulation: {
          ...c._simulator.result,
          pottedIndices: [...c._simulator.result.pottedIndices],
          outOfBoundsIndices: [...c._simulator.result.outOfBoundsIndices],
        },
        referee: { ...m._refResult },
      };
      window.__pcolContinuousRounds.push(round);
      if (result === 'restart') {
        window.__pcolContinuousResets.push({
          state: m.gState,
          context: round.context,
          players: round.players,
          balls: c._simulator.getBalls().map((b) => ({
            active: b.active,
            position: [b.position.x, b.position.y, b.position.z],
            velocity: [b.v.x, b.v.y, b.v.z],
            spin: [b.w.x, b.w.y, b.w.z],
          })),
        });
      }
    });
  });
  if (mode === 'practice') {
    await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
  } else {
    await page.locator('.side-button').filter({ hasText: 'SINGLE PLAY' }).click();
    await page.locator(`[data-sid="${mode}"]`).click();
  }
  await page.locator('.score-container .head').first().waitFor();
  await ready(page);
  await waitForCamera(page);
  const initial =
    mode === 'practice'
      ? await gameState(page)
      : await page.evaluate(() => window.__pcolContinuousResets[0]);
  assert.equal(initial.context.nRounds, 0);
  assert.equal(initial.players.length, mode === 'practice' ? 1 : 2);
  if (mode !== 'practice') {
    assert.equal(
      await page.evaluate(() => window.__pcolTestGame._currentController._model.players[1].id),
      mode,
    );
  }
  return initial;
}

function assertRestart(initial, restarted) {
  for (const key of ['state', 'context', 'players', 'balls', 'ui']) {
    assert.deepEqual(restarted[key], initial[key], `Restart restores opening ${key}`);
  }
  assertBallsRestored(restarted);
}

export async function resourceSample(page, session, label) {
  const [game, metrics, dom] = await Promise.all([
    page.evaluate(() => {
      const g = window.__pcolTestGame;
      const s = g._gView._scene;
      return {
        controller: g._currentController.name,
        liveDOMNodes: document.querySelectorAll('*').length,
        meshes: s.meshes.length,
        materials: s.materials.length,
        textures: s.textures.length,
        engineTextures: g._engine.getLoadedTexturesCache().length,
        frameObservers: g._engine.onBeginFrameObservable._observers.length,
        renderLoops: g._engine._activeRenderLoops.length,
        webGLContextLost: g._engine._gl.isContextLost(),
        compatibility: window.PCOLCompatibility?.diagnostics ?? null,
      };
    }),
    session.send('Performance.getMetrics'),
    session.send('Memory.getDOMCounters'),
  ]);
  const metric = Object.fromEntries(metrics.metrics.map(({ name, value }) => [name, value]));
  assert.equal(game.webGLContextLost, false, 'WebGL context remains usable');
  assert.equal(game.renderLoops, 1, 'Exactly one game render loop');
  if (game.compatibility) {
    assert.deepEqual(game.compatibility.errors, []);
    assert.deepEqual(game.compatibility.resourceFailures, []);
  }
  return {
    label,
    monotonicMs: metric.Timestamp * 1000,
    ...game,
    heapUsedBytes: metric.JSHeapUsedSize,
    heapTotalBytes: metric.JSHeapTotalSize,
    documents: dom.documents,
    retainedDOMNodes: dom.nodes,
    jsEventListeners: dom.jsEventListeners,
  };
}

function stableResources(sample) {
  return Object.fromEntries(
    ['meshes', 'materials', 'textures', 'engineTextures', 'frameObservers', 'renderLoops'].map(
      (key) => [key, sample[key]],
    ),
  );
}

export async function continuousPlay(page, session, trace, options, save) {
  trace.samples = [];
  trace.practice = { cycles: [], replayChecks: [] };
  trace.ai = [];
  const sample = async (label) => {
    const s = await resourceSample(page, session, label);
    trace.samples.push(s);
    await save();
    return s;
  };
  const initial = await enter(page, 'practice');
  trace.practice.initial = initial;
  for (let cycle = 0; cycle < options.cycles; cycle++) {
    const entry = { index: cycle, shots: [] };
    trace.practice.cycles.push(entry);
    for (let shot = 0; shot < options.shots; shot++) {
      trace.phase = `practice cycle ${cycle + 1} stroke ${shot + 1}`;
      const state = await humanShot(page, [0.5, 0.6, 0.4][shot % 3]);
      assert.equal(state.context.nRounds, shot + 1);
      assert.equal(state.players[0].shootingCount, shot + 1);
      entry.shots.push(state);
      trace.practice.replayChecks.push(await replayCycle(page));
      await sample(`practice-${cycle}-shot-${shot}`);
    }
    entry.rounds = await page.evaluate(() => window.__pcolContinuousRounds);
    entry.stateChanges = await page.evaluate(() => window.__pcolContinuousStateChanges);
    assert.deepEqual(
      [...new Set(entry.rounds.map((r) => r.context.nRounds).filter((n) => n > 0))],
      Array.from({ length: options.shots }, (_, i) => i + 1),
      'Every continuous round is observed in order',
    );
    const simulating = await page.evaluate(
      () => window.__pcolTestRequire('domain/game/game-state').SIMULATING,
    );
    assert.equal(
      entry.stateChanges.filter((state) => state === simulating).length,
      options.shots,
      'Every stroke enters original simulation',
    );
    await menuAction(page, 'restart');
    entry.restarted = await gameState(page);
    assertRestart(initial, entry.restarted);
    const resources = await sample(`practice-${cycle}-restarted`);
    if (cycle > 0) {
      assert.deepEqual(
        stableResources(resources),
        trace.practice.stableResources,
        'Repeated restarts do not accumulate scene resources or observers',
      );
    } else {
      trace.practice.stableResources = stableResources(resources);
    }
    // Reset only the test-owned observation buffers, never game state.
    await page.evaluate(() => {
      window.__pcolContinuousRounds = [];
      window.__pcolContinuousStateChanges = [];
    });
    console.log(
      `${trace.browser}/${trace.route}: practice cycle ${cycle + 1}/${options.cycles} (${options.shots} real strokes) passed`,
    );
  }
  await menuAction(page, 'quit');
  await sample('practice-quit');
  for (const mode of ['ai1', 'ai2', 'ai3']) {
    trace.phase = `${mode} entry`;
    const opening = await enter(page, mode);
    const entry = { mode, opening, sessions: [] };
    trace.ai.push(entry);
    for (let run = 0; run < 2; run++) {
      trace.phase = `${mode} session ${run + 1}`;
      let after;
      // Normally the opening misses, passing to AI. If a legitimate score
      // retains the turn, take another real shot rather than forcing a foul.
      for (let attempt = 0; attempt < 6; attempt++) {
        after = await humanShot(page, 0.5);
        if (after.players[1].shootingCount > 0) {
          break;
        }
      }
      assert.ok(after.players[1].shootingCount > 0, `${mode} actually strokes`);
      assert.ok(
        after.context.nRounds > after.players[0].shootingCount,
        `${mode} stroke is physically simulated and judged`,
      );
      assert.equal(after.context.playerIndex, 0, `${mode} returns the turn to the human`);
      const replay = await replayCycle(page);
      const rounds = await page.evaluate(() => window.__pcolContinuousRounds);
      const states = await page.evaluate(() => window.__pcolContinuousStateChanges);
      for (const r of rounds.filter((r) => r.context.nRounds > 0)) {
        assert.equal(
          r.players.reduce((n, p) => n + p.shootingCount, 0),
          r.context.nRounds,
          'Every accepted shot is judged once',
        );
        assert.ok(
          r.players.every((p) => [p.pts, p.brk, p.penalty].every(Number.isFinite)),
          'AI scores are finite',
        );
      }
      entry.sessions.push({ after, rounds, states, replay });
      const resources = await sample(`${mode}-${run}-played`);
      if (run === 0) {
        entry.stableResources = stableResources(resources);
        await page.evaluate(() => {
          window.__pcolContinuousRounds = [];
          window.__pcolContinuousStateChanges = [];
        });
        await menuAction(page, 'restart');
        entry.restarted = await page.evaluate(() => window.__pcolContinuousResets.at(-1));
        assert.deepEqual(
          entry.restarted.context,
          { ...opening.context, playerIndex: 1 - opening.context.playerIndex },
          'Two-player restart alternates the opening player',
        );
        for (const key of ['state', 'players', 'balls']) {
          assert.deepEqual(
            entry.restarted[key],
            opening[key],
            `AI restart restores ${key} before autonomous play`,
          );
        }
        const resetResources = await sample(`${mode}-restarted`);
        assert.deepEqual(
          stableResources(resetResources),
          entry.stableResources,
          `${mode} restart resources stay stable`,
        );
      } else {
        assert.deepEqual(
          stableResources(resources),
          entry.stableResources,
          `${mode} restart resources stay stable`,
        );
      }
    }
    await menuAction(page, 'quit');
    await sample(`${mode}-quit`);
    console.log(
      `${trace.browser}/${trace.route}: ${mode} autonomous shots, turn return, replay and restart passed`,
    );
  }
  const reentered = await enter(page, 'practice');
  assertRestart(initial, reentered);
  const final = await sample('practice-reentered');
  assert.deepEqual(
    stableResources(final),
    trace.practice.stableResources,
    'Mode switching returns to the same scene resources',
  );
  await menuAction(page, 'quit');
  await sample('final-home');
  trace.summary = {
    practiceStrokes: options.cycles * options.shots,
    practiceRestarts: options.cycles,
    aiDifficulties: trace.ai.map(({ mode, sessions }) => ({
      mode,
      humanStrokes: sessions.reduce((n, s) => n + s.after.players[0].shootingCount, 0),
      aiStrokes: sessions.reduce((n, s) => n + s.after.players[1].shootingCount, 0),
      restarts: 1,
      replayChecks: sessions.length,
    })),
    replayChecks: trace.practice.replayChecks.length + 6,
    modeQuitTransitions: 5,
    resourceCountsStable: true,
    freshPracticeAfterAISwitching: true,
  };
}
