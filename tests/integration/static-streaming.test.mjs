import assert from 'node:assert/strict';
import test from 'node:test';
import http from 'node:http';
import { realpath, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { fileProbe, staticFixture } from '../helpers/static-fixture.mjs';
import { sha256 } from '../../tooling/lib/integrity.mjs';

test(
  'HEAD uses metadata without opening a body, including large assets and missing paths',
  { timeout: 10000 },
  async (t) => {
    let opened = 0;
    const fixture = await staticFixture(t, {
      realpath,
      stat,
      open: async () => {
        opened++;
        throw Object.assign(new Error('Body read forbidden'), { code: 'EACCES' });
      },
    });
    for (const route of ['/asset.bin', '/pcol/asset.bin', '/baseline/asset.bin']) {
      const response = await fetch(fixture.origin + route, { method: 'HEAD' });
      assert.equal(response.status, 200);
      assert.equal(Number(response.headers.get('content-length')), fixture.body.length);
      assert.equal(response.headers.get('content-type'), 'application/octet-stream');
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal((await response.arrayBuffer()).byteLength, 0);
      assert.equal(
        Boolean(response.headers.get('content-security-policy')),
        !route.startsWith('/baseline/'),
      );
    }
    assert.equal((await fetch(fixture.origin + '/absent.bin', { method: 'HEAD' })).status, 404);
    assert.equal(
      (await fetch(fixture.origin + '/pcol', { method: 'HEAD', redirect: 'manual' })).status,
      308,
    );
    assert.equal(opened, 0, 'HEAD must not open or read an asset body');
    const denied = await fetch(fixture.origin + '/asset.bin');
    assert.equal(denied.status, 500);
    assert.equal(await denied.text(), 'Read failed');
    assert.equal(opened, 1, 'GET attempts the real body open');
  },
);

test(
  'concurrent streamed GETs preserve all bytes and release handles; empty GET needs no stream',
  { timeout: 15000 },
  async (t) => {
    const probe = fileProbe();
    const fixture = await staticFixture(t, probe.fileSystem);
    const hash = sha256(fixture.body);
    await Promise.all(
      Array.from({ length: 6 }, async () => {
        const response = await fetch(fixture.origin + '/asset.bin');
        assert.equal(response.status, 200);
        assert.equal(Number(response.headers.get('content-length')), fixture.body.length);
        assert.equal(sha256(Buffer.from(await response.arrayBuffer())), hash);
      }),
    );
    await probe.waitForClosed(6);
    assert.equal(probe.metrics.active, 0);
    assert.equal(probe.metrics.readBytes, 6 * fixture.body.length);
    assert.ok(
      probe.metrics.maxReadChunk <= 64 * 1024 && probe.metrics.maxReadChunk < fixture.body.length,
      'Producer reads bounded chunks rather than an entire asset',
    );
    const empty = await fetch(fixture.origin + '/empty.bin');
    assert.equal(empty.status, 200);
    assert.equal(empty.headers.get('content-length'), '0');
    assert.equal((await empty.arrayBuffer()).byteLength, 0);
    await probe.waitForClosed(7);
    assert.equal(probe.metrics.sources.length, 6, 'Empty asset opens/closes without a body stream');
    assert.equal(probe.metrics.active, 0);
  },
);

test(
  'first-read errors return 404/500 before success headers and release the descriptor',
  { timeout: 10000 },
  async (t) => {
    let code = 'EIO';
    const probe = fileProbe((file) =>
      file.endsWith('asset.bin')
        ? new Readable({
            read() {
              this.destroy(Object.assign(new Error('Injected first-read error'), { code }));
            },
          })
        : undefined,
    );
    const fixture = await staticFixture(t, probe.fileSystem);
    for (const [failure, status] of [
      ['EIO', 500],
      ['ENOENT', 404],
    ]) {
      code = failure;
      const response = await fetch(fixture.origin + '/asset.bin');
      assert.equal(response.status, status);
      assert.equal(response.headers.get('content-length'), null, 'No stale asset Content-Length');
      assert.equal(await response.text(), status === 500 ? 'Read failed' : 'Not found');
    }
    await probe.waitForClosed(2);
    assert.equal(probe.metrics.active, 0);
    assert.ok(probe.metrics.sources.every((source) => source.destroyed));
    const healthy = await fetch(fixture.origin + '/');
    assert.equal(healthy.status, 200);
    assert.match(await healthy.text(), /Stream fixture/);
    await probe.waitForClosed(3);
  },
);

test(
  'read failure after body starts terminates the partial response and leaves the server usable',
  { timeout: 10000 },
  async (t) => {
    let failing;
    const probe = fileProbe((file) => {
      if (!file.endsWith('asset.bin')) {
        return undefined;
      }
      let started = false;
      failing = new Readable({
        read() {
          if (!started) {
            started = true;
            this.push(Buffer.alloc(64 * 1024, 7));
          }
        },
      });
      return failing;
    });
    const fixture = await staticFixture(t, probe.fileSystem);
    const result = await new Promise((resolve, reject) => {
      const request = http.get(fixture.origin + '/asset.bin', (response) => {
        let bytes = 0;
        response.on('data', (chunk) => {
          bytes += chunk.length;
          failing.destroy(Object.assign(new Error('Injected late read error'), { code: 'EIO' }));
        });
        response.on('error', () => {});
        response.on('aborted', () =>
          resolve({ status: response.statusCode, aborted: true, bytes }),
        );
        response.on('end', () => resolve({ status: response.statusCode, aborted: false, bytes }));
      });
      request.on('error', reject);
    });
    assert.equal(result.status, 200);
    assert.equal(result.aborted, true);
    assert.ok(result.bytes > 0 && result.bytes < fixture.body.length);
    await probe.waitForClosed(1);
    assert.equal(probe.metrics.active, 0);
    assert.equal(failing.destroyed, true);
    const healthy = await fetch(fixture.origin + '/');
    assert.equal(healthy.status, 200);
    await healthy.arrayBuffer();
    await probe.waitForClosed(2);
  },
);

test(
  'client abort during delivery cancels unread chunks and closes the file',
  { timeout: 10000 },
  async (t) => {
    const probe = fileProbe();
    const fixture = await staticFixture(t, probe.fileSystem);
    await new Promise((resolve, reject) => {
      const request = http.get(fixture.origin + '/asset.bin', (response) => {
        response.on('error', () => {});
        response.once('data', () => {
          response.destroy();
          request.destroy();
          resolve();
        });
      });
      request.on('error', reject);
    });
    await probe.waitForClosed(1);
    assert.equal(probe.metrics.active, 0);
    assert.ok(
      probe.metrics.readBytes < fixture.body.length,
      'Aborted client does not force a full-file read',
    );
    assert.equal(probe.metrics.sources[0].destroyed, true);
    const healthy = await fetch(fixture.origin + '/');
    assert.equal(healthy.status, 200);
    await healthy.arrayBuffer();
    await probe.waitForClosed(2);
  },
);

test(
  'EOF before Content-Length terminates the partial response and releases its handle',
  { timeout: 10000 },
  async (t) => {
    let shortened;
    const probe = fileProbe((file) => {
      if (!file.endsWith('asset.bin')) {
        return undefined;
      }
      let started = false;
      shortened = new Readable({
        read() {
          if (!started) {
            started = true;
            this.push(Buffer.alloc(64 * 1024, 9));
          }
        },
      });
      return shortened;
    });
    const fixture = await staticFixture(t, probe.fileSystem);
    const result = await new Promise((resolve, reject) => {
      const request = http.get(fixture.origin + '/asset.bin', (response) => {
        let bytes = 0;
        response.on('data', (chunk) => {
          bytes += chunk.length;
          shortened.push(null);
        });
        response.on('error', () => {});
        response.on('aborted', () => resolve({ aborted: true, bytes }));
        response.on('end', () => resolve({ aborted: false, bytes }));
      });
      request.on('error', reject);
    });
    assert.equal(
      result.aborted,
      true,
      'Short EOF cannot leave a keep-alive response waiting for bytes',
    );
    assert.ok(result.bytes > 0 && result.bytes < fixture.body.length);
    await probe.waitForClosed(1);
    assert.equal(probe.metrics.active, 0);
  },
);

test(
  'client abort during asynchronous open releases the handle without starting a stream',
  { timeout: 10000 },
  async (t) => {
    const probe = fileProbe();
    const opened = Promise.withResolvers(),
      release = Promise.withResolvers();
    const fixture = await staticFixture(t, {
      ...probe.fileSystem,
      async open(file, flags) {
        const handle = await probe.fileSystem.open(file, flags);
        if (file.endsWith('asset.bin')) {
          opened.resolve();
          await release.promise;
        }
        return handle;
      },
    });
    // Await socket close on the server before completing its deliberately delayed open.
    const disconnected = Promise.withResolvers();
    fixture.server.once('connection', (socket) => socket.once('close', disconnected.resolve));
    const request = http.get(fixture.origin + '/asset.bin');
    request.on('error', () => {});
    await opened.promise;
    request.destroy();
    await disconnected.promise;
    // The next metadata call sees a destroyed response; no body may be read.
    release.resolve();
    await probe.waitForClosed(1);
    assert.equal(probe.metrics.active, 0);
    assert.equal(probe.metrics.sources.length, 0);
    assert.equal(probe.metrics.readBytes, 0);
  },
);

test(
  'client abort while waiting for the first byte cancels the pending read and closes the file',
  { timeout: 10000 },
  async (t) => {
    const probe = fileProbe((file) =>
      file.endsWith('asset.bin') ? new Readable({ read() {} }) : undefined,
    );
    const fixture = await staticFixture(t, probe.fileSystem);
    const request = http.get(fixture.origin + '/asset.bin');
    request.on('error', () => {});
    const source = await probe.firstStream;
    request.destroy();
    await probe.waitForClosed(1);
    assert.equal(source.destroyed, true);
    assert.equal(probe.metrics.active, 0);
    assert.equal(probe.metrics.readBytes, 0);
    const healthy = await fetch(fixture.origin + '/');
    assert.equal(healthy.status, 200);
    await healthy.arrayBuffer();
    await probe.waitForClosed(2);
  },
);
