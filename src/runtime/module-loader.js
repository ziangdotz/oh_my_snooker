/** Named factory boundary preserves cached exports and circular dependencies. */
export default function createModuleLoader(bundlePaths, { loadFactories } = {}) {
  const factories = new Map();
  const instances = new Map();
  const pendingBundles = new Map();
  const registeredBundles = new Set();

  function requireModule(id) {
    if (instances.has(id)) {
      return instances.get(id).exports;
    }
    const factory = factories.get(id);
    if (!factory) {
      throw new Error(`Unknown runtime module: ${id}`);
    }
    const module = { id, loaded: false, exports: {} };
    instances.set(id, module);
    try {
      factory.call(module.exports, module, module.exports, requireModule);
    } catch (error) {
      instances.delete(id);
      throw error;
    }
    module.loaded = true;
    return module.exports;
  }

  function register(bundleId, entries) {
    if (!Object.hasOwn(bundlePaths, bundleId) || registeredBundles.has(bundleId)) {
      throw new Error(`Unexpected or duplicate runtime bundle: ${bundleId}`);
    }
    for (const [id, factory] of Object.entries(entries)) {
      if (factories.has(id) || typeof factory !== 'function') {
        throw new Error(`Invalid or duplicate module: ${id}`);
      }
    }
    for (const [id, factory] of Object.entries(entries)) {
      factories.set(id, factory);
    }
    registeredBundles.add(bundleId);
  }

  async function loadBundle(id) {
    if (!Object.hasOwn(bundlePaths, id)) {
      throw new Error(`Unknown runtime bundle: ${id}`);
    }
    if (registeredBundles.has(id)) {
      return;
    }
    if (pendingBundles.has(id)) {
      return pendingBundles.get(id);
    }
    const transport = loadFactories
      ? Promise.resolve().then(() => loadFactories(id, register))
      : new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = bundlePaths[id];
          script.charset = 'utf-8';
          const timeout = setTimeout(
            () => finish(new Error(`Runtime bundle timed out: ${id}`)),
            120000,
          );
          function finish(error) {
            clearTimeout(timeout);
            script.onload = null;
            script.onerror = null;
            script.remove();
            if (error) {
              reject(error);
            } else if (!registeredBundles.has(id)) {
              reject(new Error(`Runtime bundle did not register: ${id}`));
            } else {
              resolve();
            }
          }
          script.onload = () => finish();
          script.onerror = () => finish(new Error(`Runtime bundle failed to load: ${id}`));
          document.head.appendChild(script);
        });
    const promise = transport.then(() => {
      if (!registeredBundles.has(id)) {
        throw new Error(`Runtime bundle did not register: ${id}`);
      }
    });
    pendingBundles.set(id, promise);
    try {
      await promise;
    } finally {
      pendingBundles.delete(id);
    }
  }

  requireModule.e = loadBundle;
  requireModule.p = './';
  requireModule.o = (object, key) => Object.hasOwn(object, key);
  requireModule.d = (exports, name, getter) => {
    if (!Object.hasOwn(exports, name)) {
      Object.defineProperty(exports, name, { enumerable: true, get: getter });
    }
  };
  requireModule.r = (exports) => {
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    Object.defineProperty(exports, '__esModule', { value: true });
  };
  requireModule.n = (exports) => {
    const getter = exports?.__esModule ? () => exports.default : () => exports;
    requireModule.d(getter, 'a', getter);
    return getter;
  };
  return Object.freeze({ register, require: requireModule });
}
