import createTableScene from '../../presentation/scenes/create-table-scene.js';

/** Own this type family and its shared state once per game composition. */
export default function composeScenes(dependencies) {
  const tigerClubScene = createTableScene({
    get moduleAssetsTexturesTableBallAmbientOcclusion() {
      return dependencies.moduleAssetsTexturesTableBallAmbientOcclusion;
    },
    get moduleAssetsEnvironmentsBallReflection() {
      return dependencies.moduleAssetsEnvironmentsBallReflection;
    },
    get moduleAssetsTexturesTableCarpetLightmap() {
      return dependencies.moduleAssetsTexturesTableCarpetLightmap;
    },
    get moduleAssetsTexturesTableCarpetNormal() {
      return dependencies.moduleAssetsTexturesTableCarpetNormal;
    },
    get moduleAssetsTexturesTableCarpetOverlay() {
      return dependencies.moduleAssetsTexturesTableCarpetOverlay;
    },
    get moduleAssetsTexturesTableCarpetTile() {
      return dependencies.moduleAssetsTexturesTableCarpetTile;
    },
    get moduleAssetsEnvironmentsRoomIrradiancePrimary() {
      return dependencies.moduleAssetsEnvironmentsRoomIrradiancePrimary;
    },
    get moduleAssetsEnvironmentsRoomIrradianceSecondary() {
      return dependencies.moduleAssetsEnvironmentsRoomIrradianceSecondary;
    },
    get moduleAssetsTexturesTableFrameDiffuse() {
      return dependencies.moduleAssetsTexturesTableFrameDiffuse;
    },
    get moduleAssetsTexturesTableFrameLightmap() {
      return dependencies.moduleAssetsTexturesTableFrameLightmap;
    },
    get moduleAssetsTexturesTableFrameNormal() {
      return dependencies.moduleAssetsTexturesTableFrameNormal;
    },
    get moduleAssetsEnvironmentsFrameReflection() {
      return dependencies.moduleAssetsEnvironmentsFrameReflection;
    },
    get moduleAssetsTexturesTableFrameRoughness() {
      return dependencies.moduleAssetsTexturesTableFrameRoughness;
    },
    get moduleAssetsTexturesRoomInteriorDesignOriginalFloorTile() {
      return dependencies.moduleAssetsTexturesRoomInteriorDesignOriginalFloorTile;
    },
    get moduleAssetsTexturesTableTableMask() {
      return dependencies.moduleAssetsTexturesTableTableMask;
    },
    get moduleAssetsModelsInteriorDesignOriginalRoom() {
      return dependencies.moduleAssetsModelsInteriorDesignOriginalRoom;
    },
    get moduleAssetsTexturesTablePocketGloss() {
      return dependencies.moduleAssetsTexturesTablePocketGloss;
    },
    get PcolHdrCubeTexture() {
      return dependencies.PcolHdrCubeTexture;
    },
    get Texture() {
      return dependencies.Texture;
    },
    get originalInterior() {
      return dependencies.originalInterior;
    },
    get applyModernWallStudy() {
      return dependencies.applyModernWallStudy;
    },
    get interiorDesign() {
      return dependencies.interiorDesign;
    },
    get interiorDesignRegistry() {
      return dependencies.interiorDesignRegistry;
    },
    get LightProbeManager() {
      return dependencies.LightProbeManager;
    },
    get DynamicLightingMaterial() {
      return dependencies.DynamicLightingMaterial;
    },
    get ColorThree() {
      return dependencies.ColorThree;
    },
  });
  const sceneDefinitions = Object.create(null);
  sceneDefinitions.tigerClubSno = tigerClubScene;
  const sharedTableTextures = { 'table-ui': dependencies.moduleAssetsTexturesTableTableUiAtlas },
    scenePrototype = {
      getCushionBody: function () {
        return (
          !this.__cushionBody &&
            this.cushionData &&
            (this.__cushionBody = new dependencies.CushionBodyType(this.id, this.cushionData)),
          this.__cushionBody
        );
      },
    };
  for (const t in sceneDefinitions) {
    const e = sceneDefinitions[t];
    ((e.id = t), (e.commons = sharedTableTextures));
    for (const t in scenePrototype) {
      e[t] = scenePrototype[t];
    }
  }
  const scenes = sceneDefinitions;

  return { scenes };
}
