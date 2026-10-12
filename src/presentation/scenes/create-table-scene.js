import createInteriorSwitcher from './create-interior-switcher.js';

/** Preserve the original definition and evaluation order. */
export default function createTableScene(dependencies) {
  return {
    manifest: {
      'ball-ao-new': dependencies.moduleAssetsTexturesTableBallAmbientOcclusion,
      'ball-ref-g8.rad': dependencies.moduleAssetsEnvironmentsBallReflection,
      'carpet-light': dependencies.moduleAssetsTexturesTableCarpetLightmap,
      'carpet-normal': dependencies.moduleAssetsTexturesTableCarpetNormal,
      'carpet-overlay': dependencies.moduleAssetsTexturesTableCarpetOverlay,
      'carpet-tiled': dependencies.moduleAssetsTexturesTableCarpetTile,
      'com-irrd0': dependencies.moduleAssetsEnvironmentsRoomIrradiancePrimary,
      'com-irrd1': dependencies.moduleAssetsEnvironmentsRoomIrradianceSecondary,
      'frame-diffuse': dependencies.moduleAssetsTexturesTableFrameDiffuse,
      'frame-light': dependencies.moduleAssetsTexturesTableFrameLightmap,
      'frame-normal-1024': dependencies.moduleAssetsTexturesTableFrameNormal,
      'frame-ref': dependencies.moduleAssetsEnvironmentsFrameReflection,
      'frame-roughness': dependencies.moduleAssetsTexturesTableFrameRoughness,
      'ground-tiled': dependencies.moduleAssetsTexturesRoomInteriorDesignOriginalFloorTile,
      'mask-table': dependencies.moduleAssetsTexturesTableTableMask,
      model: dependencies.moduleAssetsModelsInteriorDesignOriginalRoom,
      'pocket-glossy': dependencies.moduleAssetsTexturesTablePocketGloss,
    },
    camInitialPosition: { x: -4.5, y: 1.7, z: 5 },
    playArea: { x: 0, y: 0.88, z: 0, w: 3.66, h: 1.859 },
    trackInfo: { radius: 2.05, scaleX: 1.55 },
    cushionData: {
      y: 0.92,
      bounds: [
        1.713, 0.897, 0.074, 0.897, 0.028, 1.005, -0.028, 1.005, -0.074, 0.897, -1.713, 0.897,
        -1.824, 0.978, -1.876, 0.925, -1.797, 0.808, -1.797, -0.808, -1.876, -0.925, -1.824, -0.978,
        -1.713, -0.897, -0.074, -0.897, -0.028, -1.005, 0.028, -1.005, 0.074, -0.897, 1.713, -0.897,
        1.824, -0.978, 1.876, -0.925, 1.797, -0.808, 1.797, 0.808, 1.876, 0.925, 1.824, 0.978,
      ],
    },
    ballColors: {
      0: [0.8, 0.6, 0.4],
      1: [0.2, 0, 0.001],
      2: [0.5, 0.2, 0],
      3: [0, 0.058546, 0.015527],
      4: [0.1, 0.017188, 0],
      5: [0.005218, 0.048421, 0.23805],
      6: [0.535055, 0.077231, 0.102762],
      7: [0, 0, 0],
    },
    addSharedTextures: function (t, e) {
      ((t.ballAO = new dependencies.PcolHdrCubeTexture(e, 'ballAO', this.manifest['ball-ao-new'])),
        (t.tableUI = new dependencies.Texture(this.commons['table-ui'], e)),
        (t.tableMask = new dependencies.Texture(this.manifest['mask-table'], e)));
    },
    beautify: function (t) {
      dependencies.originalInterior.initialize(t, this.manifest);
      if (dependencies.applyModernWallStudy) {
        dependencies.applyModernWallStudy(t);
      }
      if (dependencies.interiorDesign) {
        if (dependencies.interiorDesignRegistry) {
          dependencies.originalInterior(t);
          t.interiorSwitcher = createInteriorSwitcher(t, dependencies.interiorDesignRegistry);
          t.interiorSwitcher.initialize(dependencies.interiorDesign.id);
        } else {
          dependencies.interiorDesign.apply(t);
        }
      }
    },
    createLightProbeManager: function (t) {
      return new dependencies.LightProbeManager(
        t,
        this.manifest['ball-ref-g8.rad'],
        [this.manifest['com-irrd0'], this.manifest['com-irrd1']],
        {
          id: 'tcs',
          lpx: [-1.6, -1.04, 0, 1.04, 1.6],
          lpz: [-0.7, 0, 0.7],
          lpy: [0.90625, 1.65],
          aabbPosition: [0, 0.90625, 0],
          aabbSizeMin: [-2.2, 0, -1.3],
          aabbSizeMax: [2.2, 1.74, 1.3],
          aabbAO: [0.4, 1.1, 0.1],
        },
      );
    },
    createBallMaterial: function (t, e, i, s) {
      const n = new dependencies.DynamicLightingMaterial('ballMat' + t, e, s);
      ((n.reflectivityColor = new dependencies.ColorThree(0.04, 0.04, 0.04)),
        (n.roughness = 0.1),
        (n.aoTexture = i.ballAO),
        (n.toneMappingMode = 2),
        n.setLodFallOff(1.5, 3, 5, 2));
      const r = this.ballColors[t];
      return ((n.diffuseColor = new dependencies.ColorThree(r[0], r[1], r[2])), n.freeze(), n);
    },
    customizeShadow: function (t) {
      t.alpha = t.displayAlpha = 0.8;
    },
  };
}
