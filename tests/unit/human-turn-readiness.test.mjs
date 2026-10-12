import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { waitForHumanTurn } from '../helpers/human-turn-readiness.mjs';

function fixture(states) {
  let current = { rounds: 0, player: 1, state: 4, paused: false, control: 'gaming' };
  const calls = [];
  let disposed = 0;
  function execute(fn, argument) {
    return runInNewContext('(' + fn.toString() + ')', {
      window: {
        __pcolTestRequire: () => ({ READY: 4 }),
        __pcolTestGame: {
          _currentController: {
            _model: {
              gState: current.state,
              getContext(key) {
                return key === 'nRounds' ? current.rounds : current.player;
              },
            },
            _paused: current.paused,
            _activeSubControl: { name: current.control },
          },
        },
      },
    })(argument);
  }
  const queue = [...states];
  return {
    calls,
    get disposed() {
      return disposed;
    },
    page: {
      async evaluate(fn) {
        return execute(fn);
      },
      async waitForFunction(fn, argument, options) {
        calls.push({ argument, options });
        while (queue.length) {
          current = { ...current, ...queue.shift() };
          const value = execute(fn, argument);
          if (value) {
            return {
              async jsonValue() {
                return value;
              },
              async dispose() {
                disposed++;
              },
            };
          }
        }
        throw new Error('No judged-round or human-turn progress within deadline');
      },
    },
  };
}

test('human readiness waits through real judged AI rounds without increasing the stall deadline', async () => {
  const context = fixture([
    ...Array.from({ length: 30 }, (_, index) => ({ rounds: index + 1 })),
    { player: 0 },
  ]);
  await waitForHumanTurn(context.page);
  assert.equal(context.calls.length, 31);
  assert.equal(context.disposed, 31);
  assert.ok(context.calls.every((call) => call.options.timeout === 180000));
  assert.deepEqual(
    context.calls.map((call) => call.argument),
    Array.from({ length: 31 }, (_, i) => i),
  );
});

test('stalled AI readiness fails instead of resetting its deadline without a judged round', async () => {
  const context = fixture([{ state: 8 }, { state: 4 }, { paused: true }]);
  await assert.rejects(waitForHumanTurn(context.page), /within deadline/);
  assert.equal(context.calls.length, 1);
  assert.equal(context.disposed, 0);
});

test('human readiness requires ready model, human ownership, unpaused state and a playable control', async () => {
  const context = fixture([
    { player: 0, state: 8 },
    { state: 4, paused: true },
    { paused: false, control: 'replay' },
    { control: 'inHand' },
  ]);
  await waitForHumanTurn(context.page);
  assert.equal(context.calls.length, 1);
  assert.equal(context.disposed, 1);
});

test('judged AI progress stays bounded and every browser observation handle is released', async () => {
  const context = fixture([{ rounds: 1 }, { rounds: 2 }, { rounds: 3 }]);
  await assert.rejects(waitForHumanTurn(context.page, { maxRounds: 3 }), /judged-round limit: 3/);
  assert.equal(context.calls.length, 3);
  assert.equal(context.disposed, 3);
});
