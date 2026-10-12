import { SERVER } from '../config/project.config.mjs';
import { ensureBuild } from '../tooling/build/build-target.mjs';
import { createServer } from '../tooling/server/static-server.mjs';

const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--port')) {
  throw new Error('Usage: node scripts/dev-server.mjs [--port PORT]');
}
const port = args.length ? Number(args[1]) : SERVER.port;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Invalid port');
}
await ensureBuild('development');
const server = createServer();
server.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, SERVER.host, () => {
  console.log(
    `PCOL: http://${SERVER.host}:${port}/ | Local baseline: http://${SERVER.host}:${port}/baseline/`,
  );
});
