import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const RED = 2;
const COLORS = 252;
const round = (
  first,
  potted,
  score,
  foulCode,
  ballOn,
  playerIndex,
  pts,
  brk,
  penalty = [0, 0],
  inHand = 0,
  respotted = [],
) => ({
  first,
  potted,
  expected: { score, foulCode, ballOn, playerIndex, pts, brk, penalty, inHand, respotted },
});
const scenarios = [
  {
    name: 'red-black-red-break',
    rounds: [
      round(1, [1], 1, 0, COLORS, 0, [1, 0], [1, 0]),
      round(7, [7], 7, 0, RED, 0, [8, 0], [8, 0], [0, 0], 0, [7]),
      round(1, [1], 1, 0, COLORS, 0, [9, 0], [9, 0]),
    ],
  },
  {
    name: 'miss-target-then-opponent-scores',
    rounds: [
      round(0, [], -4, 1, RED, 1, [0, 0], [0, 0], [-4, 0]),
      round(1, [1], 1, 0, COLORS, 1, [0, 1], [0, 1], [-4, 0]),
    ],
  },
  {
    name: 'miss-during-color-choice',
    rounds: [
      round(1, [1], 1, 0, COLORS, 0, [1, 0], [1, 0]),
      round(0, [], -7, 1, RED, 1, [1, 0], [0, 0], [-7, 0]),
    ],
  },
  { name: 'illegal-first-black', rounds: [round(7, [], -7, 2, RED, 1, [0, 0], [0, 0], [-7, 0])] },
  {
    name: 'illegal-black-pot',
    rounds: [round(1, [7], -7, 4, RED, 1, [0, 0], [0, 0], [-7, 0], 0, [7])],
  },
  {
    name: 'cue-ball-pot-and-replacement',
    replacement: true,
    rounds: [round(1, [0], -4, 8, RED, 1, [0, 0], [0, 0], [-4, 0], 2, [0])],
  },
  {
    name: 'combined-cue-and-black-foul',
    rounds: [round(1, [0, 7], -7, 12, RED, 1, [0, 0], [0, 0], [-7, 0], 2, [0, 7])],
  },
  {
    name: 'break-ends-with-legal-miss',
    rounds: [
      round(1, [1], 1, 0, COLORS, 0, [1, 0], [1, 0]),
      round(7, [7], 7, 0, RED, 0, [8, 0], [8, 0], [0, 0], 0, [7]),
      round(1, [], 0, 0, RED, 1, [8, 0], [0, 0]),
    ],
  },
  {
    name: 'last-red-and-color-clearance',
    lastRed: true,
    rounds: [
      round(1, [1], 1, 0, COLORS, 0, [1, 0], [1, 0]),
      round(7, [7], 7, 0, 4, 0, [8, 0], [8, 0], [0, 0], 0, [7]),
      round(2, [2], 2, 0, 8, 0, [10, 0], [10, 0]),
      round(3, [3], 3, 0, 16, 0, [13, 0], [13, 0]),
      round(4, [4], 4, 0, 32, 0, [17, 0], [17, 0]),
      round(5, [5], 5, 0, 64, 0, [22, 0], [22, 0]),
      round(6, [6], 6, 0, 128, 0, [28, 0], [28, 0]),
      round(7, [7], 7, 0, 0, 0, [35, 0], [35, 0]),
    ],
  },
];

export async function snookerRules(page, reportPath) {
  const actual = await page.evaluate((cases) => {
    const game = window.__pcolTestGame;
    const controller = game._currentController;
    const model = controller._model;
    const simulator = controller._simulator;
    const world = simulator._world;
    const State = window.__pcolTestRequire('domain/game/game-state');
    game._engine.stopRenderLoop();
    const snapshot = () => ({
      state: model.gState,
      context: { ...model._gContext },
      result: { ...model._refResult },
      players: model.players.map((player) => ({
        pts: player.pts,
        brk: player.brk,
        maxbrk: player.maxbrk,
        penalty: player.penalty,
        shootingCount: player.shootingCount,
        scoreCount: player.scoreCount,
      })),
      ui: [...document.querySelectorAll('.score-container .left, .score-container .right')].map(
        (group) => ({
          pts: Number(group.querySelector('.pts').textContent),
          brk: Number(group.querySelector('.brk').textContent),
          ballOn: group.querySelector('.ball-on-icon').className,
        }),
      ),
      balls: simulator.getBalls().map((ball) => ({
        index: ball.index,
        number: ball.number,
        active: ball.active,
        position: [ball.position.x, ball.position.y, ball.position.z],
        spot: [ball.spot.x, ball.spot.y, ball.spot.z],
      })),
    });
    const results = [];
    for (const fixture of cases) {
      model.reqReset(simulator);
      // Public editor reset selects a deterministic opening player and target.
      model.reqEditorReset(simulator, 0, 2);
      if (fixture.lastRed) {
        for (const ball of simulator
          .getBalls()
          .filter((ball) => ball.number === 1)
          .slice(1)) {
          world.inactivateBall(ball);
        }
      }
      const entry = { name: fixture.name, initial: snapshot(), rounds: [] };
      const beforeWrongPlayer = JSON.stringify(snapshot());
      entry.wrongPlayerRejected = model.reportPlayerStroke(1) === false;
      entry.wrongPlayerUnchanged = JSON.stringify(snapshot()) === beforeWrongPlayer;
      model.reqRoundResult(simulator);
      entry.prematureResultUnchanged = JSON.stringify(snapshot()) === beforeWrongPlayer;
      for (const input of fixture.rounds) {
        const first = simulator
          .getBalls()
          .find((ball) => ball.number === input.first && ball.active);
        if (!first) {
          throw new Error(`No active first-contact ball in ${fixture.name}`);
        }
        const accepted = model.reportPlayerStroke(model.getContext('playerIndex'));
        const duringState = model.gState;
        simulator.clearResult();
        const result = simulator.result;
        result.firstKissIndex = first.index;
        result.nKissed = input.first === 0 ? 0 : 1;
        const removed = [];
        for (const number of input.potted) {
          const ball = simulator
            .getBalls()
            .find((candidate) => candidate.number === number && candidate.active);
          if (!ball) {
            throw new Error(`No active potted ball ${number} in ${fixture.name}`);
          }
          world.inactivateBall(ball);
          result.pottedIndices.push(ball.index);
          removed.push(ball.index);
        }
        model.reqRoundResult(simulator);
        entry.rounds.push({ accepted, duringState, removed, ...snapshot() });
      }
      if (fixture.replacement) {
        const before = snapshot();
        model.reqRespotCueball({ x: 100, y: simulator.spotY, z: 0 }, simulator);
        const invalid = snapshot();
        model.reqRespotCueball({ x: -1.18, y: simulator.spotY, z: 0.12 }, simulator);
        const valid = snapshot();
        entry.replacement = { before, invalid, valid };
      }
      results.push(entry);
    }
    model.reqReset(simulator);
    return { readyState: State.READY, simulatingState: State.SIMULATING, fixtures: results };
  }, scenarios);
  // Save all inputs/outcomes before asserting, so a failed rule retains its trace.
  await writeFile(reportPath, JSON.stringify({ ...actual, scenarios }, null, 2) + '\n');
  assert.equal(actual.fixtures.length, scenarios.length);
  for (const [index, result] of actual.fixtures.entries()) {
    const scenario = scenarios[index];
    assert.equal(result.name, scenario.name);
    assert.equal(result.wrongPlayerRejected, true, result.name);
    assert.equal(result.wrongPlayerUnchanged, true, result.name);
    assert.equal(result.prematureResultUnchanged, true, result.name);
    assert.deepEqual(
      result.initial.players,
      [
        { pts: 0, brk: 0, maxbrk: 0, penalty: 0, shootingCount: 0, scoreCount: 0 },
        { pts: 0, brk: 0, maxbrk: 0, penalty: 0, shootingCount: 0, scoreCount: 0 },
      ],
      result.name,
    );
    assert.equal(result.initial.state, actual.readyState);
    assert.deepEqual(result.initial.context, {
      nRounds: 0,
      inHand: 1,
      playerIndex: 0,
      ballOn: RED,
    });
    const shots = [0, 0],
      scores = [0, 0],
      bestBreaks = [0, 0];
    for (const [step, state] of result.rounds.entries()) {
      const { expected } = scenario.rounds[step];
      const label = `${result.name} round ${step + 1}`;
      const shooter = step === 0 ? 0 : scenario.rounds[step - 1].expected.playerIndex;
      shots[shooter]++;
      if (expected.score > 0) {
        scores[shooter]++;
      }
      for (let player = 0; player < 2; player++) {
        bestBreaks[player] = Math.max(bestBreaks[player], expected.brk[player]);
      }
      assert.equal(state.accepted, true, label);
      assert.equal(state.duringState, actual.simulatingState, label);
      assert.equal(state.state, actual.readyState, label);
      assert.deepEqual(state.result, { score: expected.score, foulCode: expected.foulCode }, label);
      for (const key of ['ballOn', 'playerIndex', 'inHand']) {
        assert.equal(state.context[key], expected[key], `${label} ${key}`);
      }
      assert.equal(state.context.nRounds, step + 1, label);
      for (const key of ['pts', 'brk', 'penalty']) {
        assert.deepEqual(
          state.players.map((player) => player[key]),
          expected[key],
          `${label} ${key}`,
        );
      }
      assert.deepEqual(
        state.players.map((player) => player.shootingCount),
        shots,
        `${label} stroke counts`,
      );
      assert.deepEqual(
        state.players.map((player) => player.scoreCount),
        scores,
        `${label} scoring counts`,
      );
      assert.deepEqual(
        state.players.map((player) => player.maxbrk),
        bestBreaks,
        `${label} best breaks`,
      );
      assert.deepEqual(
        state.ui.map((group) => group.pts),
        [expected.pts[0] - expected.penalty[1], expected.pts[1] - expected.penalty[0]],
        `${label} displayed score`,
      );
      assert.deepEqual(
        state.ui.map((group) => group.brk),
        expected.brk,
        `${label} displayed break`,
      );
      assert.deepEqual(
        state.ui.map((group) => group.ballOn),
        [0, 1].map(
          (player) =>
            `ball-on-icon snooker b-${player === expected.playerIndex ? expected.ballOn : 0}`,
        ),
        `${label} displayed target`,
      );
      for (const ballIndex of state.removed) {
        const ball = state.balls[ballIndex];
        const respotted = expected.respotted.includes(ball.number);
        assert.equal(ball.active, respotted, `${label} ball ${ballIndex} activation`);
        if (respotted) {
          assert.deepEqual(ball.position, ball.spot, `${label} ball ${ballIndex} restored spot`);
        }
      }
    }
    if (result.replacement) {
      assert.deepEqual(
        result.replacement.invalid,
        result.replacement.before,
        'Invalid placement preserves the current state',
      );
      const valid = result.replacement.valid;
      assert.equal(valid.context.inHand, 1, 'Valid placement completes ball in hand');
      assert.equal(valid.context.playerIndex, 1);
      assert.equal(valid.context.nRounds, 1);
      assert.deepEqual(valid.players, result.replacement.before.players);
      assert.deepEqual(valid.balls[0].position, [-1.18, valid.balls[0].spot[1], 0.12]);
    }
  }
  return actual;
}
