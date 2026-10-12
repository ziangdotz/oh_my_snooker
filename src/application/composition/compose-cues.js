import createCueMaterial from '../../presentation/rendering/cue-material.js';
import createCueDefinitions from '../../presentation/rendering/cue-definitions.js';
import createCueAssetCache from '../../infrastructure/assets/cue-asset-cache.js';
import createCueMeshManager from '../../presentation/rendering/cue-mesh-manager.js';

/** Own one file cache, default-file prefetch guard and clone counter per game composition. */
export default function composeCues(dependencies) {
  const createMaterial = createCueMaterial(dependencies.CueMaterial, dependencies.CueTexture);
  const definitions = createCueDefinitions(dependencies.manifest, createMaterial);
  const cueAssetCache = createCueAssetCache(definitions, (url, success, failure) => {
    dependencies.Babylon.Tools.LoadFile(url, success, null, null, false, failure);
  });
  const CueEvents = Object.create(null);
  CueEvents.READY = 'ready';
  let nextCueLoadId = 0;
  let defaultFileRequested = false;
  const CueMeshManager = createCueMeshManager({
    get Babylon() {
      return dependencies.Babylon;
    },
    get EventEmitter() {
      return dependencies.EventEmitter;
    },
    get CueEvents() {
      return CueEvents;
    },
    get cueAssetCache() {
      return cueAssetCache;
    },
    // Preserve the migrated manager's interface; this flag guards prefetch,
    // while cancelPendingCheck() cancels only that manager's polling timer.
    get cueLoadCancelled() {
      return defaultFileRequested;
    },
    set cueLoadCancelled(value) {
      defaultFileRequested = value;
    },
    get nextCueLoadId() {
      return nextCueLoadId;
    },
    set nextCueLoadId(value) {
      nextCueLoadId = value;
    },
  });
  return { CueEvents, CueMeshManager };
}
