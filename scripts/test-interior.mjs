import { spawn } from 'node:child_process';
import { ROOT } from '../config/project.config.mjs';
import { verifyBuild } from '../tooling/build/verify-build.mjs';

// Existing verified builds are inputs; suites run sequentially and own their servers.
await verifyBuild('development');
await verifyBuild('production');
for (const suite of [
  'interior-loading-continuity',
  'interior-ui',
  'interior-transition',
  'interior-selection',
  'startup-recovery',
]) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['tests/e2e/' + suite + '.test.mjs'], {
      cwd: ROOT,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('exit', (code, signal) =>
      signal ? reject(new Error(suite + ' interrupted: ' + signal)) : resolve(code),
    );
  });
  if (code !== 0) {
    process.exitCode = code || 1;
    break;
  }
}
