import test from 'node:test';
import assert from 'node:assert/strict';
import { auditAlgorithmStructure } from '../../tooling/validation/algorithm-structure.mjs';

test('extracted classes and retained algorithm operations match the frozen baseline', async () => {
  const report = await auditAlgorithmStructure();
  assert.equal(report.passed, 137);
  assert.equal(report.failed, 0);
});
