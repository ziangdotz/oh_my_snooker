import assert from 'node:assert/strict';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from '../../config/project.config.mjs';
import { filesIn } from './integrity.mjs';
import { ARTIFACT_CATEGORIES } from './artifact-paths.mjs';

const rootDirectories = new Set([
  'src',
  'config',
  'scripts',
  'tooling',
  'tests',
  'baselines',
  'docs',
  'reports',
  'build',
  'dist',
  'artifacts',
  'node_modules',
  '.cache',
  '.npm',
  '.git',
  '.vscode',
  '.agents',
  '.codex',
]);
const rootFiles = new Set([
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'package.json',
  'package-lock.json',
  'prettier.config.mjs',
  'eslint.config.mjs',
  'start.cmd',
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  '.prettierignore',
  '.npmrc',
  '.node-version',
]);
const requiredDirectories = [
  'src/compatibility',
  'src/application',
  'src/domain',
  'src/presentation',
  'src/infrastructure',
  'src/runtime',
  'src/assets',
  'src/shared',
  'src/third-party',
  'config',
  'scripts',
  'tooling/build',
  'tooling/server',
  'tooling/lib',
  'baselines/pcol/game',
  'tests/unit',
  'tests/integration',
  'tests/e2e',
  'baselines/pcol/manifests',
  'docs/architecture',
  'docs/development',
  'docs/learning',
  'docs/validation',
  'reports',
];

/** Validate owned source names, assets and the separation of output / frozen references. */
export async function verifyProjectStructure(root = ROOT) {
  for (const entry of await readdir(root, { withFileTypes: true })) {
    assert.ok(
      (entry.isDirectory() ? rootDirectories : rootFiles).has(entry.name),
      `Unclassified root entry: ${entry.name}`,
    );
  }
  for (const directory of requiredDirectories) {
    assert.ok(
      (await stat(path.join(root, directory))).isDirectory(),
      `Missing architecture directory: ${directory}`,
    );
  }
  for (const entry of await readdir(path.join(root, 'artifacts'), { withFileTypes: true })) {
    assert.ok(
      entry.isDirectory()
        ? ARTIFACT_CATEGORIES.includes(entry.name)
        : entry.isFile() && entry.name === 'README.md',
      `Unclassified artifact entry: ${entry.name}`,
    );
  }
  let codeFiles = 0;
  for (const directory of ['src', 'config', 'scripts', 'tooling', 'tests']) {
    for (const file of await filesIn(path.join(root, directory))) {
      for (const segment of file.split('/')) {
        assert.match(
          segment,
          /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)*$/,
          `Naming violation: ${directory}/${file}`,
        );
        assert.doesNotMatch(
          segment,
          /(?:^[a-f0-9]{32}\.|^\d+\.chunk\.)/,
          `Opaque source name: ${directory}/${file}`,
        );
      }
      if (!/\.(?:js|mjs)$/.test(file)) {
        const resource =
          directory === 'src' &&
          (/^(?:assets\/|presentation\/(?:styles|templates)\/)/.test(file) ||
            file === 'index.html' ||
            file === 'third-party/notices.txt');
        const catalog = directory === 'src' && file === 'runtime/runtime-catalog.json';
        assert.ok(resource || catalog, `Unclassified source file: ${directory}/${file}`);
        continue;
      }
      assert.match(
        path.basename(file),
        /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.(?:config|test))?\.(?:mjs|js)$/,
        `Code naming violation: ${directory}/${file}`,
      );
      codeFiles++;
    }
  }
  return { requiredDirectories: requiredDirectories.length, codeFiles };
}
