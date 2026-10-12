import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 工程路径和服务配置。玩法参数由 src/domain/ 与场景源码管理。
export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const absolute = (relative) => path.join(ROOT, relative);
export const LAYOUT = Object.freeze({
  baseline: 'baselines/pcol/game',
  baselineManifest: 'baselines/pcol/manifests/baseline.json',
  compatibility: 'src/compatibility',
  runtimeCatalog: 'src/runtime/runtime-catalog.json',
  thirdParty: 'src/third-party',
  cache: '.cache',
});
export const BUILD_TARGETS = Object.freeze(['development', 'production']);
export const BUILD_OUTPUTS = Object.freeze({
  development: 'build/development',
  production: 'dist',
});
export const COMPATIBILITY_OUTPUT = 'compatibility';
export const SERVER = Object.freeze({ host: '127.0.0.1', port: 5173 });
export const CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'self'";
