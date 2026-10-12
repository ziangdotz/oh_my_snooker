/** Capture registered constructors; resolve texture paths from the active definition. */
export default function createCueMaterial(CueMaterial, CueTexture) {
  return function createMaterial(name, scene, lightProbeManager) {
    const material = new CueMaterial(name, scene, lightProbeManager);
    material.radianceLevel = 0.12;
    material.irradianceLevel = 1;
    material.roughness = 1;
    material.useRadianceLodRoughness = true;
    material.reflectivityRoughnessTexture = new CueTexture(this.manifest.glossy, scene);
    material.toneMappingMode = 2;
    material.diffuseTexture = new CueTexture(this.manifest.color, scene);
    material.setLodFallOff(1.5, 10, 2, 1.5);
    material.freeze();
    return material;
  };
}
