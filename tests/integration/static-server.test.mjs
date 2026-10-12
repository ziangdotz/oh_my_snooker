import { LAYOUT } from '../../config/project.config.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../../tooling/server/static-server.mjs';
import { sha256, verifySnapshot } from '../../tooling/lib/integrity.mjs';
import { readBuildInputs } from '../../tooling/build/build-inputs.mjs';

test('HTTP delivery preserves baseline bytes and serves complete local runtime', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const manifest = await verifySnapshot(LAYOUT.baseline, LAYOUT.baselineManifest);
  const expectedRuntime = new Map(
    (await readBuildInputs()).manifest.files.map((file) => [file.path, file]),
  );
  for (const file of manifest.files) {
    const response = await fetch(`${base}/baseline/${file.path}`);
    assert.equal(response.status, 200, file.path);
    assert.equal(sha256(Buffer.from(await response.arrayBuffer())), file.sha256, file.path);
  }
  for (const file of expectedRuntime.values()) {
    const runtime = await fetch(`${base}/${file.path}`);
    assert.equal(runtime.status, 200, file.path);
    assert.equal(
      sha256(Buffer.from(await runtime.arrayBuffer())),
      expectedRuntime.get(file.path).sha256,
      file.path,
    );
    const head = await fetch(`${base}/${file.path}`, { method: 'HEAD' });
    assert.equal(head.status, 200, file.path);
    for (const header of [
      'content-length',
      'content-type',
      'cache-control',
      'content-security-policy',
      'x-content-type-options',
      'referrer-policy',
    ]) {
      assert.equal(
        head.headers.get(header),
        runtime.headers.get(header),
        `${file.path}: ${header}`,
      );
    }
    assert.equal((await head.arrayBuffer()).byteLength, 0, file.path);
  }
  for (const route of [
    '/',
    '/pcol/',
    '/scripts/render-engine.js',
    '/scripts/snooker-game.js',
    '/compatibility/browser.js',
    '/assets/icons/snooker-favicon-32x32.png',
  ]) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-security-policy'), /connect-src 'self'/);
    await response.arrayBuffer();
  }
  const javascript = await fetch(base + '/scripts/render-engine.js');
  assert.match(javascript.headers.get('content-type'), /javascript/);
  await javascript.arrayBuffer();
  assert.equal((await fetch(base + '/res/absent.png')).status, 404);
  assert.equal((await fetch(base + '/original/')).status, 404);
  assert.equal((await fetch(base + '/.git/config')).status, 404);
  assert.equal((await fetch(base + '/res/')).status, 404);
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/', { method: 'HEAD' })).status, 200);
  for (const route of [
    '/%2e%2e/package.json',
    '/res/%2e%2e/%2e%2e/package.json',
    '/%5c../package.json',
    '/%zz',
  ]) {
    const status = await new Promise((resolve) =>
      http.get({ hostname: '127.0.0.1', port: server.address().port, path: route }, (res) => {
        res.resume();
        resolve(res.statusCode);
      }),
    );
    assert.equal(status, route === '/%zz' ? 400 : 403, route);
  }
});
