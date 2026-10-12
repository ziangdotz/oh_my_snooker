import createPowerView from '../../presentation/rendering/power-view.js';
import createAimSegment from '../../presentation/rendering/aim-segment.js';
import createAimGuide from '../../presentation/rendering/aim-guide.js';
import createTableTrack from '../../presentation/rendering/table-track.js';
import createGameView from '../../presentation/rendering/game-view.js';
import createRecoveringGameView from '../../compatibility/create-recovering-game-view.js';
/** Own this type family and its shared state once per game composition. */
export default function composeGameView(dependencies) {
  const PowerDirtyFlags = Object.create(null);
  ((PowerDirtyFlags.DF_ALPHA = 1), (PowerDirtyFlags.DF_LEN = 2));
  const PowerView = createPowerView({
    get Babylon() {
      return dependencies.Babylon;
    },
    get PowerDirtyFlags() {
      return PowerDirtyFlags;
    },
    get UiColors() {
      return dependencies.UiColors;
    },
    get UiShaderMaterial() {
      return dependencies.UiShaderMaterial;
    },
    get tableUiAtlas() {
      return dependencies.tableUiAtlas;
    },
  });
  const AimSegment = createAimSegment({
    get OrientedUiPlane() {
      return dependencies.OrientedUiPlane;
    },
  });
  const AimAlphaMode = Object.create(null);
  ((AimAlphaMode.SOLID = 0), (AimAlphaMode.GRADIENT = 1));
  const aimSolidSegments = [1, 0],
    aimGradientSegments = [4, 5, 6, 7];
  const AimGuide = createAimGuide({
    get AimAlphaMode() {
      return AimAlphaMode;
    },
    get AimSegment() {
      return AimSegment;
    },
    get Babylon() {
      return dependencies.Babylon;
    },
    get PlaneBatch() {
      return dependencies.PlaneBatch;
    },
    get UiColors() {
      return dependencies.UiColors;
    },
    get aimGradientSegments() {
      return aimGradientSegments;
    },
    get aimSolidSegments() {
      return aimSolidSegments;
    },
    get tableUiAtlas() {
      return dependencies.tableUiAtlas;
    },
  });
  const TrackVector = dependencies.physicsApi.a.Vec3;
  const TableTrack = createTableTrack({
    get TrackVector() {
      return TrackVector;
    },
  });
  const ViewEvents = { LOADED: 'loaded', READY: 'ready' },
    ViewState = {
      ERROR: -1,
      NO_SCENE: 0,
      LOADING: 1,
      READY_TO_BUILD: 2,
      SYNCHRONIZED: 3,
      READY: 4,
    },
    ballMeshResolution = { high: 32, low: 20 };
  const PreservedGameView = createGameView({
    get AimGuide() {
      return AimGuide;
    },
    get Babylon() {
      return dependencies.Babylon;
    },
    get CueEvents() {
      return dependencies.CueEvents;
    },
    get CueMeshManager() {
      return dependencies.CueMeshManager;
    },
    get Easing() {
      return dependencies.Easing;
    },
    get EventEmitter() {
      return dependencies.EventEmitter;
    },
    get PlaneBatch() {
      return dependencies.PlaneBatch;
    },
    get PowerView() {
      return PowerView;
    },
    get TableTrack() {
      return TableTrack;
    },
    get UiColors() {
      return dependencies.UiColors;
    },
    get ValueTween() {
      return dependencies.ValueTween;
    },
    get ViewEvents() {
      return ViewEvents;
    },
    get ViewState() {
      return ViewState;
    },
    get ballMeshResolution() {
      return ballMeshResolution;
    },
    get scenes() {
      return dependencies.scenes;
    },
  });
  const GameView = createRecoveringGameView(PreservedGameView, dependencies.Babylon);

  return { ViewEvents, ViewState, GameView };
}
