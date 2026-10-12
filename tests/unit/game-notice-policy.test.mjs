import assert from 'node:assert/strict';
import test from 'node:test';
import notice from '../../src/presentation/ui/game-notice-policy.js';

test('Foul notices explain penalty points and preserve the referee reason', () => {
  const foul = notice({ title: 'FOUL', body: '-4: No ball was hit.', kind: 3, id: 'foul' });
  assert.equal(foul.title, 'FOUL · 4 PENALTY POINTS');
  assert.equal(foul.body, 'No ball was hit.');
  assert.equal(foul.id, 'foul');
  assert.equal(foul.kind, 3);
  assert.ok(foul.remaining >= 6);
  assert.equal(notice({ title: 'FOUL', body: 'Reason only', kind: 3 }).body, 'Reason only');
});

test('Persistent instructions and urgent notices take precedence over performance hints', () => {
  const instruction = notice({
    title: 'PLACE CUE BALL',
    body: 'Place inside the D.',
    pinned: true,
    kind: 3,
  });
  const performance = notice({ title: 'PERFORMANCE TIP', body: 'Legacy hint' });
  const error = notice({ title: 'ERROR', body: 'Try again.', kind: 3 });
  assert.equal(instruction.remaining, Infinity);
  assert.equal(instruction.kind, 0);
  assert.equal(notice({ title: 'PLACE CUE BALL' }).remaining, Infinity);
  assert.ok(instruction.priority > error.priority);
  assert.ok(error.priority > performance.priority);
  assert.match(performance.body, /WebGL 2/);
  assert.equal(notice({ title: 'LONG', body: 'word '.repeat(200) }).remaining, 12);
  assert.equal(notice({ title: 'SHORT', body: 'Done', duration: 1 }).remaining, 4);
});
