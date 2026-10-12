import test from 'node:test';
import assert from 'node:assert/strict';
import { fileNamingIssue } from '../../tooling/lib/file-naming.mjs';
import { artifactDirectory } from '../../tooling/lib/artifact-paths.mjs';

test('naming audit accepts fixed ecosystem names, typed suffixes and design identifiers', () => {
  for (const file of [
    'README.md',
    'AGENTS.md',
    '.gitignore',
    'package.json',
    'package-lock.json',
    'docs/validation/README.md',
    'config/project.config.mjs',
    'tests/e2e/interior-design-original.test.mjs',
    'src/assets/shaders/plane-batch.fragment.fx',
    'src/assets/images/interior-design-001-art.png',
    'src/assets/images/interior-design-004-art.png',
    'src/presentation/scenes/interior-design-registry.js',
    'artifacts/testing/designs/interior-design-001/scene/report.json',
  ]) {
    assert.equal(fileNamingIssue(file), null, file);
  }
});

test('artifact output is limited to current testing themes and rejects traversal', () => {
  assert.ok(artifactDirectory('testing', 'regression').endsWith('regression'));
  assert.throws(() => artifactDirectory('unused', 'regression'), /Invalid artifact directory/);
  assert.throws(() => artifactDirectory('testing', '..'), /Invalid artifact directory/);
});

test('naming audit rejects case, separators, unpadded design numbers and misplaced fixed names', () => {
  for (const file of [
    'src/MyFile.js',
    'src/my_file.js',
    'src/my file.js',
    'src/AGENTS.md',
    'src/UPPER/README.md',
    'src/assets/images/interior-design-2-art.png',
    'artifacts/testing/designs/interior-design-original/室内设计·原始配置.json',
    'artifacts/regression/report.json',
    'artifacts/unused/report.json',
  ]) {
    assert.ok(fileNamingIssue(file), file);
  }
});
