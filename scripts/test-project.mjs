import { spawn } from 'node:child_process';
import path from 'node:path';
import { ROOT, filesIn } from '../tooling/lib/integrity.mjs';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length && !['--unit', '--integration'].includes(args[0]))) {
  throw new Error('Usage: node scripts/test-project.mjs [--unit | --integration]');
}
const scopes = args.length ? [args[0].slice(2)] : ['unit', 'integration'];
const files = [];
for (const scope of scopes) {
  files.push(
    ...(await filesIn(path.join(ROOT, 'tests', scope)))
      .filter((file) => file.endsWith('.test.mjs'))
      .map((file) => `tests/${scope}/${file}`),
  );
}
if (!files.length) {
  throw new Error('No tests in selected scope');
}
const code = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['--test', ...files], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });
  child.once('error', reject);
  child.once('exit', (code, signal) =>
    signal ? reject(new Error(`Tests stopped: ${signal}`)) : resolve(code),
  );
});
process.exitCode = code || 0;
