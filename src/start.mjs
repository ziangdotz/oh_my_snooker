import http from 'node:http';
import path from 'node:path';
import { readFile, realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Self-contained local source server: only Node built-ins and this src directory.
const root = await realpath(fileURLToPath(new URL('./', import.meta.url)));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--port')) {
  throw new Error('Usage: node start.mjs [--port PORT]');
}
const port = args.length ? Number(args[1]) : 5173;
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error('Invalid port');
}
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.babylon': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.fx': 'text/plain; charset=utf-8',
};
const server = http.createServer(async (request, response) => {
  const fail = (code, message) => {
    response.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(message);
  };
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.setHeader('Allow', 'GET, HEAD');
    return fail(405, 'Method not allowed');
  }
  let pathname;
  try {
    pathname = decodeURIComponent(request.url.split('?')[0]);
  } catch {
    return fail(400, 'Malformed URL');
  }
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) {
    return fail(403, 'Forbidden');
  }
  let relative = pathname.replace(/^\//, '');
  if (!relative || relative.endsWith('/')) {
    relative += 'index.html';
  }
  try {
    const filename = await realpath(path.join(root, relative));
    if (!filename.startsWith(root + path.sep)) {
      return fail(403, 'Forbidden');
    }
    const metadata = await stat(filename);
    if (!metadata.isFile()) {
      return fail(404, 'Not found');
    }
    const bytes = request.method === 'HEAD' ? undefined : await readFile(filename);
    response.writeHead(200, {
      'Content-Type': mime[path.extname(filename)] || 'application/octet-stream',
      'Content-Length': bytes?.length ?? metadata.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(bytes);
  } catch (error) {
    fail(['ENOENT', 'ENOTDIR'].includes(error.code) ? 404 : 500, 'Read failed');
  }
});
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log('Source game: http://127.0.0.1:' + server.address().port + '/');
  console.log('src only; stop with Ctrl+C.');
});
