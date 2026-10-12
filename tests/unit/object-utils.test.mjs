import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { parse } from 'espree';
import objectUtils from '../../src/shared/data/object-utils.js';
import { absolute, LAYOUT } from '../../config/project.config.mjs';

test('data utilities preserve clone, merge and duration results from the independent baseline', async () => {
  const text = await readFile(absolute(`${LAYOUT.baseline}/res/1.chunk.js`), 'utf8');
  const ast = parse(text, { ecmaVersion: 'latest', range: true });
  const factoryNode = ast.body.at(-1).expression.arguments[0].elements[1].elements[24];
  const originalFactory = runInNewContext(`(${text.slice(...factoryNode.range)})`);
  const original = { exports: {} };
  originalFactory(original);
  const current = { exports: {} };
  objectUtils(current);
  const before = original.exports;
  const after = current.exports;
  assert.equal(Object.getPrototypeOf(after), null);
  const inherited = Object.assign(Object.create({ inherited: 'retained' }), {
    own: [1, null, { value: true }],
  });
  for (const value of [
    undefined,
    null,
    false,
    0,
    'name',
    [1, undefined, null],
    inherited,
    () => {},
  ]) {
    assert.equal(JSON.stringify(after.deepClone(value)), JSON.stringify(before.deepClone(value)));
  }
  for (const value of [0, null, [1, 2], { inner: 2, newKey: true }, () => {}]) {
    const expected = { item: { inner: 1 } };
    const actual = { item: { inner: 1 } };
    before.politeMerge(expected, 'item', value);
    after.politeMerge(actual, 'item', value);
    assert.deepEqual(actual, expected);
  }
  for (const seconds of [
    -1,
    0,
    0.1,
    59.99999,
    60,
    3599.999999,
    3600,
    215999.999,
    216000,
    1e12,
    NaN,
    Infinity,
  ]) {
    assert.equal(after.toTimeString(seconds), before.toTimeString(seconds));
  }
});
