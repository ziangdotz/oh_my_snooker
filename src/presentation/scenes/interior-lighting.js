/** Room lights and their shadow casters are isolated from the original game materials. */
export default function createInteriorLighting(B, scene, prefix, meshes, casters, definition) {
  const lights = [];
  const warm = new B.Color3(1, 0.92, 0.8);
  function spot(key, position, direction, angle, intensity) {
    const light = new B.SpotLight(
      prefix + key,
      new B.Vector3(...position),
      new B.Vector3(...direction),
      angle,
      1,
      scene,
    );
    light.diffuse = warm;
    light.specular = new B.Color3(1, 0.94, 0.83);
    light.intensity = intensity;
    light.range = 18;
    light.includedOnlyMeshes = meshes;
    lights.push(light);
    return light;
  }
  const height = definition.height || 3.6;
  const down = spot(
    'floor-light',
    [0, height - 0.5, 0],
    [0, -1, 0],
    2.55,
    definition.floorIntensity,
  );
  const ambient = new B.HemisphericLight(prefix + 'ambient', new B.Vector3(0, 1, 0), scene);
  ambient.diffuse = new B.Color3(1, 0.97, 0.91);
  ambient.groundColor = new B.Color3(0.23, 0.22, 0.19);
  ambient.specular = B.Color3.Black();
  ambient.intensity = definition.ambientIntensity;
  ambient.includedOnlyMeshes = meshes;
  lights.push(ambient);
  const gallery = spot(
    'gallery-wash',
    definition.picturePosition,
    [0, -0.86, -0.34],
    2.5,
    definition.galleryIntensity,
  );
  gallery.range = 4;
  const lounge = spot(
    'lounge-wash',
    [0.4, height - 0.35, 6.55],
    [0, -1, 0.12],
    2.55,
    definition.loungeIntensity,
  );
  for (const [index, z] of (definition.windows || []).entries()) {
    const light = new B.PointLight(
      prefix + 'window-light-' + index,
      new B.Vector3(-5.82, 2.05, z),
      scene,
    );
    light.diffuse = new B.Color3(1, 0.975, 0.925);
    light.specular = new B.Color3(0.48, 0.47, 0.44);
    light.intensity = 0.24;
    light.range = 3.8;
    light.includedOnlyMeshes = meshes;
    lights.push(light);
  }
  for (const [index, x] of [-5.8, 6.62].entries()) {
    const light = new B.PointLight(
      prefix + 'wall-lamp-light-' + index,
      new B.Vector3(x, 2.17, 4.85),
      scene,
    );
    light.diffuse = new B.Color3(1, 0.75, 0.46);
    light.specular = new B.Color3(0.38, 0.29, 0.18);
    light.intensity = 0.24;
    light.range = 2.6;
    light.includedOnlyMeshes = meshes;
    lights.push(light);
  }
  const table = ['Frame', 'TableInner', 'Pocket', 'TableBot'].map((key) =>
    scene.getMeshByName(key),
  );
  const shadowMaps = [];
  const staticShadows = [];
  for (const [light, size, darkness] of [
    [down, 2048, 0.32],
    [lounge, 1024, 0.38],
  ]) {
    const shadow = new B.ShadowGenerator(size, light);
    shadow.useBlurExponentialShadowMap = true;
    shadow.blurKernel = 20;
    shadow.bias = 0.0005;
    shadow.normalBias = 0.015;
    shadow.setDarkness(darkness);
    shadow.getShadowMap().renderList = [...table.filter(Boolean), ...casters];
    // These lights and all listed casters are static; balls and cues use the
    // original game shadow path. Babylon retries an unready caster by resetting
    // the refresh counter, so render-once also works during first compilation.
    shadow.getShadowMap().refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    staticShadows.push(shadow);
    shadowMaps.push({ light: light.name, size, casters: casters.map((mesh) => mesh.name) });
  }
  const engine = scene.getEngine();
  function refreshStaticShadows() {
    for (const shadow of staticShadows) {
      // Context restoration recreates the render targets in this engine version.
      // Read the current target rather than retaining its old, disposed instance.
      const map = shadow.getShadowMap();
      map.refreshRate = B.RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
    }
  }
  const resizeObserver = engine.onResizeObservable.add(refreshStaticShadows);
  const restoreObserver = engine.onContextRestoredObservable.add(refreshStaticShadows);
  function releaseObservers() {
    engine.onResizeObservable.remove(resizeObserver);
    engine.onContextRestoredObservable.remove(restoreObserver);
    scene.onDisposeObservable.remove(disposeObserver);
  }
  const disposeObserver = scene.onDisposeObservable.add(releaseObservers);
  down.onDisposeObservable.add(releaseObservers);
  return { names: lights.map((light) => light.name.slice(prefix.length)), shadowMaps };
}
