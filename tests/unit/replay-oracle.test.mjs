import assert from 'node:assert/strict';
import test from 'node:test';
import { recordedBallAt } from '../helpers/replay-oracle.mjs';

test('Replay oracle respects held frames, interpolation, inactive frames and endpoints', () => {
  const track = {
    stride: 7,
    totalFrames: 3,
    data: [0, 1, 1, 0, 2, 4, 1, 3, 0, 2, 8, 6, 0, 1, 4, 5, 0, 9, 7, 1, 0],
  };
  for (const time of [-1, 0, 0.5, 1]) {
    assert.deepEqual(recordedBallAt(track, time), { visible: true, position: [0, 2, 4] });
  }
  assert.deepEqual(recordedBallAt(track, 2), { visible: true, position: [4, 4, 2] });
  assert.deepEqual(recordedBallAt(track, 3), { visible: true, position: [8, 6, 0] });
  assert.deepEqual(recordedBallAt(track, 3.5), { visible: true, position: [8.5, 6.5, 0.5] });
  for (const time of [4, 9, 20]) {
    assert.deepEqual(recordedBallAt(track, time), { visible: false, position: [9, 7, 1] });
  }
  assert.throws(() => recordedBallAt({ ...track, stride: 6 }, 0), /Unsupported/);
  assert.throws(() => recordedBallAt({ ...track, totalFrames: 0 }, 0), /empty/);
});
