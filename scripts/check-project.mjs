import { spawn } from 'node:child_process';
import { ROOT } from '../tooling/lib/integrity.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length && args[0] !== '--browser')) {
  throw new Error('Usage: node scripts/check-project.mjs [--browser]');
}
const steps = [
  ['directory structure', ['scripts/check-structure.mjs']],
  ['file naming', ['scripts/check-file-naming.mjs']],
  ['lint', ['scripts/lint-code.mjs']],
  ['build', ['scripts/build.mjs']],
  ['integrity', ['scripts/verify.mjs']],
  ['maintenance / documentation', ['scripts/check-maintenance.mjs']],
  ['format', ['scripts/format-code.mjs', '--check']],
  ['unit / integration tests', ['scripts/test-project.mjs']],
];
if (args.includes('--browser')) {
  steps.push(['offline browser regression', ['tests/e2e/game.test.mjs']]);
}
for (const [name, command] of steps) {
  console.log(`\nChecking: ${name}`);
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, command, { cwd: ROOT, stdio: 'inherit', shell: false });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      signal ? reject(new Error(`${name} stopped: ${signal}`)) : resolve(code),
    );
  });
  if (code !== 0) {
    process.exitCode = code || 1;
    break;
  }
}
if (!process.exitCode) {
  console.log('\nAll requested checks passed.');
}
