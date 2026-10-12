import http from 'node:http';
import path from 'node:path';
import { open, realpath, stat } from 'node:fs/promises';
import { once } from 'node:events';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { ROOT } from '../lib/integrity.mjs';
import { LAYOUT, BUILD_OUTPUTS, CSP } from '../../config/project.config.mjs';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.babylon': 'application/json',
  '.fx': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.hdr': 'application/octet-stream',
};
export { CSP };

/** 提供开发输出和离线对照的 GET/HEAD 服务；不暴露源码及工具目录。 */
export function createServer({
  runtime = path.join(ROOT, BUILD_OUTPUTS.development),
  frozen = path.join(ROOT, LAYOUT.baseline),
  fileSystem = { open, realpath, stat },
} = {}) {
  return http.createServer(async (req, res) => {
    const fail = (code, message) => {
      if (res.destroyed) {
        return;
      }
      if (res.headersSent) {
        return res.destroy();
      }
      res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(message);
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return fail(405, 'Method not allowed');
    }
    let pathname;
    try {
      pathname = decodeURIComponent(req.url.split('?')[0]);
    } catch {
      return fail(400, 'Malformed URL');
    }
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) {
      return fail(403, 'Forbidden');
    }
    const baseline = pathname === '/baseline' || pathname.startsWith('/baseline/');
    if (['/baseline', '/pcol'].includes(pathname)) {
      res.writeHead(308, { Location: `${pathname}/` });
      return res.end();
    }
    const base = baseline ? frozen : runtime;
    let relative = baseline
      ? pathname.slice('/baseline/'.length)
      : pathname.replace(/^\/pcol\//, '').replace(/^\//, '');
    if (!relative || relative.endsWith('/')) {
      relative += 'index.html';
    }
    let handle;
    let source;
    try {
      const [resolvedBase, resolvedFile] = await Promise.all([
        fileSystem.realpath(base),
        fileSystem.realpath(path.join(base, relative)),
      ]);
      if (!resolvedFile.startsWith(resolvedBase + path.sep)) {
        return fail(403, 'Forbidden');
      }
      let metadata = await fileSystem.stat(resolvedFile);
      if (!metadata.isFile()) {
        return fail(404, 'Not found');
      }
      if (res.destroyed) {
        return;
      }
      if (req.method !== 'HEAD') {
        handle = await fileSystem.open(resolvedFile, 'r');
        // GET length and bytes come from the same open file.
        metadata = await handle.stat();
        if (!metadata.isFile()) {
          return fail(404, 'Not found');
        }
      }
      const headers = {
        'Content-Type': MIME[path.extname(resolvedFile)] || 'application/octet-stream',
        'Content-Length': metadata.size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
      };
      if (!baseline) {
        headers['Content-Security-Policy'] = CSP;
      }
      if (res.destroyed) {
        return;
      }
      if (req.method === 'HEAD' || metadata.size === 0) {
        res.writeHead(200, headers);
        res.end();
        return;
      }
      // Keep descriptor ownership here, including first-read errors and disconnects.
      source = handle.createReadStream({
        autoClose: false,
        highWaterMark: 64 * 1024,
        end: metadata.size - 1,
      });
      const cancellation = new globalThis.AbortController();
      const onClose = () => {
        if (!res.writableFinished) {
          cancellation.abort();
          source.destroy();
        }
      };
      res.once('close', onClose);
      try {
        // Read the first chunk before committing 200, so early I/O failures retain 404/500.
        await once(source, 'readable', { signal: cancellation.signal });
        const first = source.read();
        if (!first?.length || first.length > metadata.size) {
          throw new Error('Asset changed before its first read');
        }
        res.writeHead(200, headers);
        res.write(first);
        let delivered = first.length;
        const lengthCheck = new Transform({
          transform(chunk, _encoding, next) {
            delivered += chunk.length;
            next(
              delivered > metadata.size ? new Error('Asset length changed during delivery') : null,
              chunk,
            );
          },
          flush(next) {
            next(delivered === metadata.size ? null : new Error('Asset truncated during delivery'));
          },
        });
        await pipeline(source, lengthCheck, res, { signal: cancellation.signal });
      } finally {
        res.off('close', onClose);
      }
    } catch (error) {
      if (['ENOENT', 'ENOTDIR'].includes(error.code)) {
        return fail(404, 'Not found');
      }
      fail(500, 'Read failed');
    } finally {
      source?.destroy();
      if (handle) {
        try {
          await handle.close();
        } catch {
          fail(500, 'Read failed');
        }
      }
    }
  });
}
