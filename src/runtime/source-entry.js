import createModuleLoader from './module-loader.js';
import legacyFactory from '../compatibility/legacy-factory.js';
import interiorDesignTransitionModule from '../application/interior-transition.js';
import pageFontsModule from '../presentation/typography/page-fonts.js';

let sourceTransition = null;

async function readLocalText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Source resource failed: ' + response.status + ' ' + url);
  }
  return response.text();
}

async function launchSourceGame() {
  const catalog = JSON.parse(
    await readLocalText(new URL('./runtime-catalog.json', import.meta.url)),
  );
  const bundlePaths = Object.fromEntries(Object.keys(catalog.bundles).map((id) => [id, id]));
  async function loadFactories(bundleId, register) {
    const entries = await Promise.all(
      catalog.modules
        .filter((entry) => entry.bundle === bundleId)
        .map(async (entry) => {
          if (
            !entry.source.startsWith('src/') ||
            entry.source.split('/').some((part) => part === '..')
          ) {
            throw new Error('Source module outside src: ' + entry.id);
          }
          const url = new URL('../' + entry.source.slice(4), import.meta.url);
          if (entry.kind === 'asset') {
            return [
              entry.id,
              (module, _exports, loadModule) => {
                module.exports = loadModule.p + entry.asset;
              },
            ];
          }
          if (entry.kind === 'template') {
            const text = await readLocalText(url);
            return [
              entry.id,
              (module) => {
                module.exports = text;
              },
            ];
          }
          const source = await import(url.href);
          const factory = entry.source.startsWith('src/third-party/')
            ? legacyFactory(source.default)
            : source.default;
          return [entry.id, factory];
        }),
    );
    register(bundleId, Object.fromEntries(entries));
  }
  const loader = createModuleLoader(bundlePaths, { loadFactories });
  await loader.require.e('bootstrap');
  sourceTransition = loader.require('application/interior-transition');
  loader.require(catalog.entry);
}

launchSourceGame().catch((error) => {
  console.error(error);
  if (!sourceTransition) {
    const transition = {};
    const fonts = {};
    pageFontsModule(fonts);
    interiorDesignTransitionModule(transition, {}, () => fonts.exports);
    sourceTransition = transition.exports;
  }
  sourceTransition.fail({
    title: 'Game unavailable',
    message: 'The game could not start. Please try again or return to your previous venue.',
  });
});
