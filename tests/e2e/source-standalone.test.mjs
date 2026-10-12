import assert from 'node:assert/strict';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { clearTimeout } from 'node:timers';
import { cp, mkdir, mkdtemp, readdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { ROOT } from '../../config/project.config.mjs';
import { artifactDirectory, DESIGN_IDS } from '../../tooling/lib/artifact-paths.mjs';
import { removeBuildPath } from '../../tooling/build/build-transaction.mjs';

await mkdir(path.join(ROOT, '.cache'), { recursive: true });
const directory = await mkdtemp(path.join(ROOT, '.cache/source-standalone-test-'));
await cp(path.join(ROOT, 'src'), path.join(directory, 'src'), { recursive: true });
const output = artifactDirectory('testing', 'source-runtime', 'standalone');
await mkdir(output, { recursive: true });
const report = {
  date: new Date().toISOString(),
  fixtureContains: await readdir(directory),
  browsers: [],
  passed: false,
};
assert.deepEqual(report.fixtureContains, ['src']);
const child = spawn(process.execPath, ['start.mjs', '--port', '0'], {
  cwd: path.join(directory, 'src'),
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let stderr = '';
child.stderr.on('data', (bytes) => {
  stderr += bytes;
});
try {
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Source server did not start: ' + stderr)),
      10000,
    );
    let stdout = '';
    child.stdout.on('data', (bytes) => {
      stdout += bytes;
      const match = stdout.match(/http:\/\/127\.0\.0\.1:[0-9]+/);
      if (match) {
        clearTimeout(timer);
        resolve(match[0]);
      }
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('Source server exited: ' + code + ' ' + stderr));
    });
  });
  assert.equal((await fetch(origin + '/runtime/runtime-catalog.json')).status, 200);
  assert.equal((await fetch(origin + '/', { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(origin + '/', { method: 'POST' })).status, 405);
  assert.equal((await fetch(origin + '/%2e%2e%2fbaselines/pcol/game/index.html')).status, 403);
  const candidates = process.env.PCOL_BROWSER_PATH
    ? [{ name: 'custom', executablePath: process.env.PCOL_BROWSER_PATH }]
    : process.platform === 'win32'
      ? [
          {
            name: 'chrome',
            executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
          },
          {
            name: 'edge',
            executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
          },
        ]
      : [{ name: 'chromium' }];
  for (const candidate of candidates) {
    const browser = await chromium.launch({
      ...candidate,
      headless: true,
      args: ['--enable-unsafe-swiftshader'],
    });
    const result = { name: candidate.name, version: browser.version(), designs: [] };
    try {
      for (const id of DESIGN_IDS) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();
        const errors = [],
          requests = [];
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('response', (response) => {
          if (response.status() >= 400) {
            errors.push(response.status() + ': ' + response.url());
          }
        });
        page.on('requestfailed', (request) => errors.push(request.url()));
        await page.route('**/*', (route) => {
          requests.push(route.request().url());
          return route
            .request()
            .url()
            .startsWith(origin + '/')
            ? route.continue()
            : route.abort();
        });
        await page.goto(origin + '/?interior=' + id);
        await page
          .locator('.side-button')
          .filter({ hasText: 'PRACTICE' })
          .waitFor({ timeout: 60000 });
        await page.locator('.interior-menu-item').click();
        await page.locator('.interior-venue-drawer').waitFor();
        assert.equal(await page.locator('.interior-design-option').count(), 4);
        const current = page.locator('.interior-design-option[aria-pressed="true"]');
        assert.equal(await current.getAttribute('data-design-id'), id);
        await current.click();
        await page.locator('.interior-venue-drawer').waitFor({ state: 'hidden' });
        assert.equal(new URL(page.url()).searchParams.get('interior'), id);
        await page.locator('.side-button').filter({ hasText: 'PRACTICE' }).click();
        await page.locator('.score-container .head').first().waitFor({ timeout: 60000 });
        await page.locator('#game-view').waitFor({ state: 'visible' });
        await page.screenshot({ path: path.join(output, candidate.name + '-' + id + '.png') });
        assert.ok(
          requests.every(
            (url) =>
              url.startsWith(origin + '/') &&
              !new URL(url).pathname.startsWith('/baselines/') &&
              !new URL(url).pathname.startsWith('/config/'),
          ),
        );
        assert.deepEqual(errors, []);
        result.designs.push({
          id,
          title: await page.title(),
          localRequests: requests.length,
          interiorMenu: true,
          passed: true,
        });
        await context.close();
      }
      report.browsers.push(result);
      console.log(
        candidate.name + ': src-only copied directory starts all four designs and Practice.',
      );
    } finally {
      await browser.close();
    }
  }
  assert.equal(stderr, '');
  report.passed = true;
} finally {
  await writeFile(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (child.exitCode === null) {
    const exited = once(child, 'exit');
    child.kill();
    await exited;
  }
  await removeBuildPath(ROOT, directory);
}
