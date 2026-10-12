import { mkdir, mkdtemp, open, realpath, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, LAYOUT } from '../../config/project.config.mjs';
import { removeBuildPath } from '../../tooling/build/build-transaction.mjs';
import { createServer } from '../../tooling/server/static-server.mjs';

export function fileProbe(makeStream) {
  const metrics = { opened: 0, closed: 0, active: 0, readBytes: 0, maxReadChunk: 0, sources: [] };
  const pending = [];
  const firstStream = Promise.withResolvers();
  return {
    metrics,
    firstStream: firstStream.promise,
    waitForClosed(count) {
      return metrics.closed >= count
        ? Promise.resolve()
        : new Promise((resolve) => pending.push({ count, resolve }));
    },
    fileSystem: {
      realpath,
      stat,
      async open(file, flags) {
        const handle = await open(file, flags);
        metrics.opened++;
        metrics.active++;
        return {
          stat: () => handle.stat(),
          createReadStream(options) {
            const source = makeStream?.(file, options) || handle.createReadStream(options);
            metrics.sources.push(source);
            // Observe actual producer chunks without switching the stream into flowing mode.
            const originalPush = source.push;
            source.push = function (chunk, encoding) {
              if (chunk) {
                metrics.readBytes += chunk.length;
                metrics.maxReadChunk = Math.max(metrics.maxReadChunk, chunk.length);
              }
              return originalPush.call(this, chunk, encoding);
            };
            firstStream.resolve(source);
            return source;
          },
          async close() {
            await handle.close();
            metrics.closed++;
            metrics.active--;
            for (const waiter of pending.splice(0)) {
              if (metrics.closed >= waiter.count) {
                waiter.resolve();
              } else {
                pending.push(waiter);
              }
            }
          },
        };
      },
    },
  };
}

export async function staticFixture(t, fileSystem) {
  const cache = path.join(ROOT, LAYOUT.cache);
  await mkdir(cache, { recursive: true });
  const root = await mkdtemp(path.join(cache, 'test-static-'));
  const publicRoot = path.join(root, 'public');
  const owned = { server: null };
  t.after(async () => {
    if (owned.server) {
      owned.server.closeAllConnections();
      await new Promise((resolve) => owned.server.close(resolve));
    }
    await removeBuildPath(ROOT, root);
  });
  await mkdir(publicRoot);
  const body = Buffer.alloc(4 * 1024 * 1024);
  for (let index = 0; index < body.length; index++) {
    body[index] = (index * 31) & 255;
  }
  await writeFile(path.join(publicRoot, 'asset.bin'), body);
  await writeFile(path.join(publicRoot, 'empty.bin'), '');
  await writeFile(
    path.join(publicRoot, 'index.html'),
    '<!doctype html><title>Stream fixture</title>',
  );
  owned.server = createServer({ runtime: publicRoot, frozen: publicRoot, fileSystem });
  await new Promise((resolve) => owned.server.listen(0, '127.0.0.1', resolve));
  return {
    origin: `http://127.0.0.1:${owned.server.address().port}`,
    publicRoot,
    body,
    server: owned.server,
  };
}
