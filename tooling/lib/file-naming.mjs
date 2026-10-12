import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import { filesIn } from './integrity.mjs';
import { ARTIFACT_CATEGORIES } from './artifact-paths.mjs';

const maintainedRoots = [
  'src',
  'config',
  'scripts',
  'tooling',
  'tests',
  'docs',
  'reports',
  'artifacts',
];
const fixedRootNames = new Set([
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  '.editorconfig',
  '.gitattributes',
  '.gitignore',
  '.prettierignore',
  '.npmrc',
  '.node-version',
]);
const sharedDesignNames = new Set([
  'interior-design-builder',
  'interior-design-registry',
  'interior-design-collection',
]);
const segmentPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)*$/;

/** Fixed ecosystem filenames have explicit, narrow exceptions; artifact roles are checked too. */
export function fileNamingIssue(file) {
  if (!file.includes('/') && fixedRootNames.has(file)) {
    return null;
  }
  const segments = file.split('/');
  if (
    segments[0] === 'artifacts' &&
    segments.length > 2 &&
    !ARTIFACT_CATEGORIES.includes(segments[1])
  ) {
    return 'Unclassified artifact directory: ' + file;
  }
  const filename = segments.at(-1);
  for (const [index, segment] of segments.entries()) {
    if (segment === 'README.md' && index === segments.length - 1) {
      continue;
    }
    if (!segmentPattern.test(segment)) {
      return 'Use lowercase kebab-case paths: ' + file;
    }
  }
  const stem = filename.split('.')[0];
  if (
    stem.startsWith('interior-design-') &&
    !sharedDesignNames.has(stem) &&
    !/^interior-design-(?:original|[0-9]{3})(?:-[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?$/.test(stem)
  ) {
    return 'Interior design identifiers must use original or three digits: ' + file;
  }
  return null;
}

export async function auditFileNames(root = ROOT) {
  const files = [];
  const excluded = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isFile()) {
      files.push(entry.name);
    } else if (entry.name !== 'baselines' && !maintainedRoots.includes(entry.name)) {
      excluded.push(entry.name);
    }
  }
  for (const directory of maintainedRoots) {
    for (const relative of await filesIn(path.join(root, directory))) {
      const file = directory + '/' + relative;
      files.push(file);
    }
  }
  const violations = files.map(fileNamingIssue).filter(Boolean);
  return {
    date: new Date().toISOString(),
    checkedFiles: files.length,
    fixedNames: files.filter(
      (file) => fixedRootNames.has(file) || path.posix.basename(file) === 'README.md',
    ),
    excludedRoots: excluded.sort(),
    frozenRoots: ['baselines/pcol/game', 'baselines/pcol/manifests'],
    artifactCategories: ARTIFACT_CATEGORIES,
    violations,
    passed: violations.length === 0,
  };
}
