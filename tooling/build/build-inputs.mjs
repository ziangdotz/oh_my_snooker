import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { ROOT, LAYOUT, COMPATIBILITY_OUTPUT } from '../../config/project.config.mjs';
import { filesIn, sha256, verifySnapshot } from '../lib/integrity.mjs';
import { assembleRuntime, assertRuntimePath, verifyAssetReferences } from './runtime-assembly.mjs';

/** Read a single source snapshot; outputs are never copied from the regression baseline. */
export async function readBuildInputs({ root = ROOT } = {}) {
  const baseline = await verifySnapshot(LAYOUT.baseline, LAYOUT.baselineManifest, { root });
  const outputs = new Map();
  const sources = new Map();
  const sourceManifest = [];
  const catalogBytes = await readFile(path.join(root, LAYOUT.runtimeCatalog));
  const catalog = JSON.parse(catalogBytes.toString());
  const entries = new Map(catalog.modules.map((entry) => [entry.source, entry]));
  sourceManifest.push({
    path: LAYOUT.runtimeCatalog,
    bytes: catalogBytes.length,
    sha256: sha256(catalogBytes),
  });
  function addOutput(file, bytes) {
    assertRuntimePath(file);
    if ([...outputs.keys()].some((name) => name.toLowerCase() === file.toLowerCase())) {
      throw new Error(`Output path collision: ${file}`);
    }
    outputs.set(file, bytes);
  }
  for (const directory of ['src']) {
    for (const file of await filesIn(path.join(root, directory))) {
      const source = `${directory}/${file}`;
      if (source === LAYOUT.runtimeCatalog) {
        continue;
      }
      assertRuntimePath(source);
      const bytes = await readFile(path.join(root, source));
      sourceManifest.push({ path: source, bytes: bytes.length, sha256: sha256(bytes) });
      const entry = entries.get(source);
      if (entry?.kind === 'asset') {
        assertRuntimePath(entry.asset);
        if (source !== `src/${entry.asset}` || !entry.asset.startsWith('assets/')) {
          throw new Error(`Asset catalog path mismatch: ${source}`);
        }
        sources.set(
          source,
          `export default function (module, _exports, loadModule) { module.exports = loadModule.p + ${JSON.stringify(entry.asset)}; }`,
        );
      } else if (entry?.kind === 'template') {
        if (!source.startsWith('src/presentation/templates/') || !source.endsWith('.html')) {
          throw new Error(`Invalid template module: ${source}`);
        }
        sources.set(
          source,
          `export default function (module) { module.exports = ${JSON.stringify(bytes.toString('utf8'))}; }`,
        );
      }
      if (
        [
          'src/runtime/source-entry.js',
          'src/start.mjs',
          'src/compatibility/legacy-factory.js',
        ].includes(source)
      ) {
        // Native source launch is maintained input, not a compiled browser bundle.
        continue;
      } else if (source === `${LAYOUT.compatibility}/browser.js`) {
        addOutput(`${COMPATIBILITY_OUTPUT}/${file.slice('compatibility/'.length)}`, bytes);
      } else if (file.endsWith('.js')) {
        sources.set(source, bytes.toString('utf8'));
      } else if (entry?.kind === 'template') {
        continue;
      } else if (source === 'src/index.html') {
        // Target entry paths for our source page; no legacy import/migration patches.
        const html = bytes
          .toString('utf8')
          .replace('./presentation/styles/game.css', './styles/game.css')
          .replace(
            '<script type="module" src="./runtime/source-entry.js"></script>',
            '<script src="./scripts/runtime-bootstrap.js"></script>',
          );
        addOutput('index.html', Buffer.from(html));
      } else if (source.startsWith('src/assets/')) {
        addOutput(source.slice(4), bytes);
      } else if (source.startsWith('src/presentation/styles/') && file.endsWith('.css')) {
        const output = `styles/${file.slice('presentation/styles/'.length)}`;
        const css = bytes
          .toString('utf8')
          .replace(/url\((['"]?)([^'")]+)\1\)/g, (match, quote, url) => {
            if (/^(?:data:|blob:|https?:|\/\/|#)/.test(url)) {
              return match;
            }
            const suffix = url.match(/[?#].*$/)?.[0] ?? '';
            const resource = path.posix.normalize(
              path.posix.join(
                path.posix.dirname(source.slice(4)),
                url.slice(0, url.length - suffix.length),
              ),
            );
            const outputResource = resource.startsWith('presentation/styles/')
              ? 'styles/' + resource.slice('presentation/styles/'.length)
              : resource;
            return (
              'url(' +
              quote +
              path.posix.relative(path.posix.dirname(output), outputResource) +
              suffix +
              quote +
              ')'
            );
          });
        addOutput(output, Buffer.from(css));
      } else if (source === `${LAYOUT.thirdParty}/notices.txt`) {
        addOutput('third-party-notices.txt', bytes);
      } else {
        throw new Error(`Unclassified runtime input: ${source}`);
      }
    }
  }
  const runtime = assembleRuntime(catalog, sources);
  for (const [file, bytes] of runtime.outputs) {
    addOutput(file, bytes);
  }
  const references = [...runtime.references, ...verifyAssetReferences(outputs, sources)];
  return {
    baseline,
    outputs,
    manifest: {
      schemaVersion: 2,
      architecture: 'named-factory-modules-v1',
      baselineId: baseline.baselineId,
      baselineManifestSHA256: sha256(await readFile(path.join(root, LAYOUT.baselineManifest))),
      sourceFiles: sourceManifest.sort((a, b) => a.path.localeCompare(b.path, 'en')),
      modules: catalog.modules,
      references,
      files: [...outputs]
        .map(([file, bytes]) => ({ path: file, bytes: bytes.length, sha256: sha256(bytes) }))
        .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
    },
  };
}
