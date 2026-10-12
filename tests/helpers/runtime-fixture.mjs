import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { clearTimeout } from 'node:timers';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ROOT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import { createServer } from '../../tooling/server/static-server.mjs';
import {
  inspectRuntimeEntry,
  inspectSourceEntry,
} from '../../tooling/testing/runtime-inspection.mjs';

export function browserCandidates() {
  if (process.env.PCOL_BROWSER_PATH) {
    return [{ name: 'custom', executablePath: process.env.PCOL_BROWSER_PATH }];
  }
  return process.platform === 'win32'
    ? [
        { name: 'chrome', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' },
        {
          name: 'edge',
          executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        },
      ]
    : [{ name: 'chromium' }];
}

export function launchTestBrowser(candidate) {
  const options = { ...candidate };
  delete options.name;
  return chromium.launch({ ...options, headless: true, args: ['--enable-unsafe-swiftshader'] });
}

/** Owns only this suite's servers; closes them on setup failure and normal teardown. */
export async function createRuntimeFixture() {
  const child = spawn(process.execPath, ['src/start.mjs', '--port', '0'], {
    cwd: ROOT,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let sourceErrors = '';
  const servers = [];
  child.stderr.on('data', (bytes) => {
    sourceErrors += bytes;
  });
  async function close() {
    for (const server of servers) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill();
      await exited;
    }
  }
  try {
    const sourceOrigin = await new Promise((resolve, reject) => {
      let stdout = '';
      const timer = setTimeout(
        () => reject(new Error('Source startup timed out: ' + sourceErrors)),
        10000,
      );
      function finish(error, origin) {
        clearTimeout(timer);
        if (error) {
          reject(error);
        } else {
          resolve(origin);
        }
      }
      child.stdout.on('data', (bytes) => {
        stdout += bytes;
        const match = stdout.match(/http:\/\/127\.0\.0\.1:[0-9]+/);
        if (match) {
          finish(null, match[0]);
        }
      });
      child.once('error', (error) => finish(error));
      child.once('exit', (code) =>
        finish(new Error('Source server exited: ' + code + ' ' + sourceErrors)),
      );
    });
    const targets = [{ name: 'source', origin: sourceOrigin }];
    for (const name of ['development', 'production']) {
      const server = createServer({ runtime: path.join(ROOT, BUILD_OUTPUTS[name]) });
      servers.push(server);
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      targets.push({ name, origin: 'http://127.0.0.1:' + server.address().port });
    }
    return {
      targets,
      close,
      get sourceErrors() {
        return sourceErrors;
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}

/** Response-only instrumentation preserves the actual source and published files. */
export async function inspectRuntimeRoute(route, target) {
  const pathname = new URL(route.request().url()).pathname;
  let body;
  if (pathname.endsWith('/scripts/runtime-bootstrap.js')) {
    body = inspectRuntimeEntry(
      await readFile(
        path.join(ROOT, BUILD_OUTPUTS[target.name], 'scripts/runtime-bootstrap.js'),
        'utf8',
      ),
    );
  } else if (
    target.name === 'source' &&
    ['/runtime/source-entry.js', '/application/launch-game.js'].includes(pathname)
  ) {
    body = inspectSourceEntry(await readFile(path.join(ROOT, 'src', pathname.slice(1)), 'utf8'), {
      application: pathname.endsWith('/launch-game.js'),
    });
  } else {
    return false;
  }
  await route.fulfill({ body, contentType: 'text/javascript' });
  return true;
}

export async function waitForHome(page, id) {
  await page.waitForFunction((expected) => {
    const game = window.__pcolTestGame;
    const menu = game?._currentController?._homeMainMenu;
    return (
      game?._currentController?.name === 'home' &&
      game._currentController.state === 3 &&
      menu?.isActive &&
      !menu.needsUpdate &&
      game._gView._scene.isReady() &&
      game._gView._scene.metadata.interiorDesign.id === expected
    );
  }, id);
  await page.locator('.interior-transition').waitFor({ state: 'hidden' });
  assert.equal(
    await page.evaluate(() => window.sessionStorage.getItem('oh-my-snooker:interior-transition')),
    null,
  );
}

export async function openVenueDrawer(page) {
  await page.locator('.interior-menu-item').click();
  await page.waitForFunction(() => {
    const panel = window.__pcolTestGame._currentController._interiorDialog;
    return panel?.isActive && !panel.needsUpdate && !panel.blocked;
  });
  assert.equal(await page.locator('.interior-design-option').count(), 4);
}
