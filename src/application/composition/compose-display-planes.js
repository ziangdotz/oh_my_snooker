import createTableUiAtlas from '../../presentation/rendering/table-ui-atlas.js';
import createUiShaderMaterial from '../../presentation/rendering/ui-shader-material.js';
import createUiPlane from '../../presentation/rendering/ui-plane.js';
import createOrientedUiPlane from '../../presentation/rendering/oriented-ui-plane.js';
import createPlaneBatch from '../../presentation/rendering/plane-batch.js';
/** Own this type family and its shared state once per game composition. */
export default function composeDisplayPlanes(dependencies) {
  const UiShaderMaterial = createUiShaderMaterial({
    get Babylon() {
      return dependencies.Babylon;
    },
  });
  const PlaneDirtyFlags = { DF_TRANSFORM: 1, DF_RGB: 2, DF_ALPHA: 4, DF_ALL: 7 };
  const UiPlane = createUiPlane({
    get Babylon() {
      return dependencies.Babylon;
    },
    get PlaneDirtyFlags() {
      return PlaneDirtyFlags;
    },
  });
  const tableUiAtlas = createTableUiAtlas();
  const OrientedUiPlane = createOrientedUiPlane({
    get Babylon() {
      return dependencies.Babylon;
    },
    get PlaneDirtyFlags() {
      return PlaneDirtyFlags;
    },
    get UiPlane() {
      return UiPlane;
    },
  });
  const BatchDirtyFlags = { UPDATE_CHILD_UPDATE: 1, UPDATE_CHILD_ADD_REMOVE: 2 },
    sortByZIndex = (t, e) => t.zIndex - e.zIndex;
  const PlaneBatch = createPlaneBatch({
    get Babylon() {
      return dependencies.Babylon;
    },
    get BatchDirtyFlags() {
      return BatchDirtyFlags;
    },
    get OrientedUiPlane() {
      return OrientedUiPlane;
    },
    get PlaneDirtyFlags() {
      return PlaneDirtyFlags;
    },
    get UiPlane() {
      return UiPlane;
    },
    get UiShaderMaterial() {
      return UiShaderMaterial;
    },
    get sortByZIndex() {
      return sortByZIndex;
    },
    get tableUiAtlas() {
      return tableUiAtlas;
    },
  });

  return { UiShaderMaterial, tableUiAtlas, OrientedUiPlane, PlaneBatch };
}
