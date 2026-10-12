import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { check, format } from 'prettier';
import { ROOT, filesIn } from '../tooling/lib/integrity.mjs';
import options from '../prettier.config.mjs';

const args = process.argv.slice(2);
if (
  args.length > 2 ||
  (args.length && !['--check', '--write'].includes(args[0])) ||
  (args.length === 2 && args[1] !== '--engineering')
) {
  throw new Error('Usage: node scripts/format-code.mjs [--check | --write] [--engineering]');
}
const write = args[0] === '--write';
const engineeringOnly = args.includes('--engineering');
// Explicit whitelist excludes frozen references, binary assets and generated output.
const files = [
  'package.json',
  'prettier.config.mjs',
  'eslint.config.mjs',
  'README.md',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'baselines/pcol/README.md',
];
for (const directory of [
  ...(engineeringOnly ? [] : ['src']),
  'config',
  'scripts',
  'tooling',
  'tests',
  'docs',
]) {
  files.push(
    ...(await filesIn(path.join(ROOT, directory)))
      .filter(
        (file) =>
          !file.startsWith('assets/') &&
          !file.startsWith('third-party/') &&
          /\.(?:mjs|js|md|yml|html|css|json)$/.test(file),
      )
      .map((file) => `${directory}/${file}`),
  );
}
let failures = 0;
for (const file of files.sort()) {
  const source = await readFile(path.join(ROOT, file), 'utf8');
  const settings = { ...options, filepath: file };
  if (write) {
    await writeFile(path.join(ROOT, file), await format(source, settings));
  } else if (!(await check(source, settings))) {
    console.error(`Formatting differs: ${file}`);
    failures++;
  }
}
console.log(`${write ? 'Formatted' : 'Checked'} ${files.length} maintained engineering files`);
if (failures) {
  process.exitCode = 1;
}
