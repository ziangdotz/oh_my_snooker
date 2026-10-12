import { spawn } from 'node:child_process';
import { ROOT } from '../config/project.config.mjs';

const child = spawn(process.execPath, ['tests/e2e/match-opening-scenes.test.mjs'], {
  cwd: ROOT,
  windowsHide: true,
  stdio: 'inherit',
});
await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('exit', (code, signal) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error('Match scene capture failed: ' + (signal || code)));
    }
  });
});
