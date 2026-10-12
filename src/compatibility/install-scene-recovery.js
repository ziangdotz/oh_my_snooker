/** Preserve Babylon 3.2 HDR filtering and frozen PBR bindings across restoration. */
export default function installSceneRecovery(Babylon, scene, requestRender = () => {}) {
  const engine = scene.getEngine();
  const samplingModes = new Map();
  let readyTimer;
  let generation = 0;
  const lostObserver = engine.onContextLostObservable.add(() => {
    generation++;
    clearTimeout(readyTimer);
    // Invalidate old bindings before rebuilt dynamic textures upload their canvas.
    engine.wipeCaches(true);
    // Both HDR loaders request trilinear filtering, but createRawCubeTexture
    // omits samplingMode metadata and its rebuild otherwise defaults to nearest.
    for (const texture of scene.textures) {
      if (
        texture instanceof Babylon.HDRCubeTexture ||
        texture instanceof Babylon.PcolHdrCubeTexture
      ) {
        const internal = texture.getInternalTexture();
        if (internal && internal.samplingMode === undefined) {
          samplingModes.set(internal, internal.samplingMode);
          internal.samplingMode = Babylon.Texture.TRILINEAR_SAMPLINGMODE;
        }
      }
    }
  });
  const restoreObserver = engine.onContextRestoredObservable.add(() => {
    clearTimeout(readyTimer);
    // Preserve the original anisotropy clamp as well as the actual GPU filter.
    for (const [texture, mode] of samplingModes) {
      texture.samplingMode = mode;
    }
    samplingModes.clear();
    // Recompilation resets spherical-light uniforms outside the PBR UBO.
    // Its frozen/synchronized path skips those uniforms. Invalidate once so
    // the next bind uploads them, preserving material values and freezing.
    for (const material of scene.materials) {
      const buffer = material._uniformBuffer;
      if (material.isFrozen && buffer && buffer.useUbo) {
        buffer._needSync = true;
      }
    }
    scene.resetCachedMaterial();
    requestRender();
    const restoredGeneration = ++generation;
    function refreshWhenReady() {
      if (scene.isDisposed || restoredGeneration !== generation) {
        return;
      }
      if (
        scene.textures.some((texture) => !texture.isReady()) ||
        Object.values(engine._compiledEffects).some((effect) => !effect.isReady())
      ) {
        readyTimer = setTimeout(refreshWhenReady, 16);
        return;
      }
      requestRender();
    }
    refreshWhenReady();
  });
  scene.onDisposeObservable.add(() => {
    generation++;
    clearTimeout(readyTimer);
    samplingModes.clear();
    engine.onContextLostObservable.remove(lostObserver);
    engine.onContextRestoredObservable.remove(restoreObserver);
  });
}
