import { ESLint } from 'eslint';
import { ROOT } from '../config/project.config.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== '--fix')) {
  throw new Error('Usage: node scripts/lint-code.mjs [--fix]');
}
const eslint = new ESLint({ cwd: ROOT, fix: args[0] === '--fix' });
const results = await eslint.lintFiles([
  'src',
  'config',
  'scripts',
  'tooling',
  'tests',
  'eslint.config.mjs',
  'prettier.config.mjs',
]);
if (args[0] === '--fix') {
  await ESLint.outputFixes(results);
}
const formatter = await eslint.loadFormatter('stylish');
const output = await formatter.format(results);
if (output) {
  console.error(output);
}
const errors = results.reduce((sum, result) => sum + result.errorCount + result.warningCount, 0);
console.log(`Linted ${results.length} maintained code files; ${errors} errors/warnings`);
if (errors) {
  process.exitCode = 1;
}
