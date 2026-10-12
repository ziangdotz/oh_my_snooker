/** Exact PCOL room assets and material overrides; baked room finishes remain in the model. */
export default function interiorDesignOriginalConfigModule(module) {
  module.exports = {
    id: 'interior-design-original',
    name: '室内设计·原始',
    modelAsset: 'assets/models/interior-design-original-room.babylon',
    roomMeshes: [
      'Room',
      'Ground',
      'RoofLights',
      'Pillars',
      'Corridor',
      'ItemEast',
      'ItemSouth1',
      'ItemSouth2',
      'ItemWest',
      'ItemNorth',
      'MainLight',
    ],
    ground: { tileScale: 30, useLightmapAsShadowmap: true },
    pocket: { diffuse: [0.002, 0.002, 0.002], invertNormalMapX: true, invertNormalMapY: true },
    carpet: {
      normalScale: 30,
      normalLevel: 0.6,
      tileScale: 30,
      tileLevel: 0.8,
      diffuse: [0.008, 0.07, 0.015],
      reflectivity: [0.012, 0.012, 0.012],
      toneMappingMode: 3,
    },
    gameLight: { diffuse: [1, 1, 1], intensity: 60, angleDegrees: 175, height: 3.6 },
    frame: {
      metallic: 1,
      roughness: 0.8,
      tileScale: 4,
      environmentSize: 256,
      noMipmap: false,
      generateHarmonics: false,
      useInGammaSpace: false,
      invertNormalMapX: true,
      invertNormalMapY: true,
    },
  };
}
