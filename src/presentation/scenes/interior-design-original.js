/** The maintained PCOL room, with the original initialization order and exact values. */
export default function interiorDesignOriginalModule(module, _exports, loadModule) {
  const B = loadModule('adapters/rendering/babylon-engine');
  const config = loadModule('presentation/scenes/interior-design-original-config');

  function initialize(scene, manifest) {
    for (const material of scene.materials) {
      material.disableLighting = true;
    }
    const ground = scene.getNodeByName('Ground').material;
    const groundTile = new B.Texture(manifest['ground-tiled'], scene);
    groundTile.uScale = groundTile.vScale = config.ground.tileScale;
    ground.lightmapTexture = groundTile;
    ground.useLightmapAsShadowmap = config.ground.useLightmapAsShadowmap;

    const pocketLight = scene.getNodeByName('PocketLight');
    const pocket = scene.getNodeByName('Pocket');
    pocketLight.includedOnlyMeshes = [pocket];
    const pocketMaterial = pocket.material;
    pocketMaterial.invertNormalMapX = config.pocket.invertNormalMapX;
    pocketMaterial.invertNormalMapY = config.pocket.invertNormalMapY;
    pocketMaterial.specularTexture = new B.Texture(manifest['pocket-glossy'], scene);
    pocketMaterial.diffuseColor = new B.Color3(...config.pocket.diffuse).toGammaSpace();
    pocketMaterial.ambientColor = pocketMaterial.diffuseColor;
    pocketMaterial.disableLighting = false;

    const tableInner = scene.getNodeByName('TableInner');
    const carpetNormal = new B.Texture(manifest['carpet-normal'], scene);
    carpetNormal.uScale = carpetNormal.vScale = config.carpet.normalScale;
    carpetNormal.level = config.carpet.normalLevel;
    const carpetTile = new B.Texture(manifest['carpet-tiled'], scene);
    carpetTile.uScale = carpetTile.vScale = config.carpet.tileScale;
    carpetTile.level = config.carpet.tileLevel;
    const carpet = new B.PcolCarpetMaterial('TableInnerMat', scene);
    carpet.diffuseColor = new B.Color3(...config.carpet.diffuse);
    carpet.reflectivityColor = new B.Color3(...config.carpet.reflectivity);
    carpet.chaoticTexture = carpetNormal;
    carpet.diffuseBaseTexture = carpetTile;
    carpet.toneMappingMode = config.carpet.toneMappingMode;
    carpet.diffuseOverlayTexture = new B.Texture(manifest['carpet-overlay'], scene);
    carpet.lightmapTexture = new B.Texture(manifest['carpet-light'], scene);
    const gameLight = scene.getNodeByName('GameLight');
    gameLight.includedOnlyMeshes = [tableInner];
    gameLight.diffuse = new B.Color3(...config.gameLight.diffuse);
    gameLight.intensity = config.gameLight.intensity;
    gameLight.angle = (config.gameLight.angleDegrees / 180) * Math.PI;
    tableInner.material = carpet;
    gameLight.position.y = config.gameLight.height;

    const frame = new B.PBRMetallicRoughnessMaterial('FrameMat', scene);
    frame.baseTexture = new B.Texture(manifest['frame-diffuse'], scene);
    frame.metallic = config.frame.metallic;
    frame.roughness = config.frame.roughness;
    frame.metallicRoughnessTexture = new B.Texture(manifest['frame-roughness'], scene);
    frame.baseTexture.uScale = frame.baseTexture.vScale = config.frame.tileScale;
    frame.metallicRoughnessTexture.uScale = frame.metallicRoughnessTexture.vScale =
      config.frame.tileScale;
    frame.disableLighting = true;
    frame.environmentTexture = new B.HDRCubeTexture(
      manifest['frame-ref'],
      scene,
      config.frame.environmentSize,
      config.frame.noMipmap,
      config.frame.generateHarmonics,
      config.frame.useInGammaSpace,
    );
    frame.occlusionTexture = new B.Texture(manifest['frame-light'], scene);
    frame.normalTexture = new B.Texture(manifest['frame-normal-1024'], scene);
    frame.invertNormalMapX = config.frame.invertNormalMapX;
    frame.invertNormalMapY = config.frame.invertNormalMapY;
    scene.getNodeByName('Frame').material = frame;
  }

  function apply(scene) {
    scene.metadata = {
      ...scene.metadata,
      interiorDesign: {
        id: config.id,
        name: config.name,
        theme: 'PCOL 原始 Tiger Club',
        modelAsset: config.modelAsset,
        roomMeshes: [...config.roomMeshes],
        geometry: 'Original model and baked lightmaps; no added or hidden meshes.',
      },
    };
  }
  // Other designs share the unchanged PCOL table initialization before decorating their rooms.
  apply.initialize = initialize;
  module.exports = apply;
}
