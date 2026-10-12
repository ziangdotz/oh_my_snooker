import composeReplay from './composition/compose-replay.js';
import composePlayerTurn from './composition/compose-player-turn.js';
import composePerson from './composition/compose-person.js';
import composeAimCamera from './composition/compose-aim-camera.js';
import composeCueInput from './composition/compose-cue-input.js';

import composeOrbitCamera from './composition/compose-orbit-camera.js';
import composeBallInHand from './composition/compose-ball-in-hand.js';
import composeControls from './composition/compose-controls.js';
import composeMatchModel from './composition/compose-match-model.js';
import composeAi from './composition/compose-ai.js';
import composeRouteGeometry from './composition/compose-route-geometry.js';
import composeSession from './composition/compose-session.js';
import composeMotionAnimation from './composition/compose-motion-animation.js';
import composeGameView from './composition/compose-game-view.js';
import composeDisplayPlanes from './composition/compose-display-planes.js';
import composeAnimation from './composition/compose-animation.js';
import composeScenes from './composition/compose-scenes.js';

import composeCues from './composition/compose-cues.js';

import createViewController from './controllers/view-controller.js';

import composeUi from './composition/compose-ui.js';
import installHdrCubeRecovery from '../compatibility/install-hdr-cube-recovery.js';

import createInteriorMenuController from './controllers/interior-menu-controller.js';
import createInteriorDesignSelection from './interior-selection.js';
import createAiDifficultyDialog from '../presentation/ui/ai-difficulty-dialog.js';
import createGameLoading from '../presentation/ui/game-loading.js';
import createAboutDrawer from '../presentation/ui/about-drawer.js';
import createGameDialog from '../presentation/ui/game-dialog.js';
import createGameConfirmation from '../presentation/ui/game-confirmation.js';
import createGameDialogManager from '../presentation/ui/game-dialog-manager.js';
import createGameHelp from '../presentation/ui/game-help.js';
import createGameResults from '../presentation/ui/game-results.js';
import createGameScoreboard from '../presentation/ui/game-scoreboard.js';
import createGameToolbar from '../presentation/ui/game-toolbar.js';
import createGameShortcuts from '../presentation/ui/game-shortcuts.js';

import createGameToast from '../presentation/ui/game-toast.js';
import createGameUiController from './controllers/game-ui-controller.js';
import createMenuController from './controllers/menu-controller.js';

import createToolbar from '../presentation/ui/toolbar.js';

import createShortcutBar from '../presentation/ui/shortcut-bar.js';
import createMessageDialog from '../presentation/ui/message-dialog.js';
import createControlsDialog from '../presentation/ui/controls-dialog.js';
import createVectorControlsDialog from '../presentation/ui/basic-controls-guide.js';

import createPauseDialog from '../presentation/ui/pause-dialog.js';
import createPracticeResultDialog from '../presentation/ui/practice-result-dialog.js';

import createScoreboard from '../presentation/ui/scoreboard.js';
import createAiPersonController from '../presentation/input/ai-person-controller.js';
import createPassivePersonController from '../presentation/input/passive-person-controller.js';
import createMatchResultDialog from '../presentation/ui/match-result-dialog.js';
import createMatchController from './controllers/match-controller.js';
import createToastDialog from '../presentation/ui/toast-dialog.js';
import createConfirmationDialog from '../presentation/ui/confirmation-dialog.js';
import createDialogManager from '../presentation/ui/dialog-manager.js';
import createFrameClock from './time/frame-clock.js';
import createSnookerApplication from './snooker-application.js';
import createSmoothSnookerApplication from './smooth-snooker-application.js';
export default function composeGameModule(module, exports, loadModule) {
  'use strict';
  loadModule.r(exports);
  var Babylon = loadModule('adapters/rendering/babylon-engine'),
    eventEmitterModule = loadModule('shared/events/event-emitter'),
    EventEmitter = loadModule.n(eventEmitterModule),
    gameRecordsModule = loadModule('domain/game/game-records'),
    gameRecords = loadModule.n(gameRecordsModule);
  const {
    objectUtils,
    localGameSettings,
    BaseGameModel,
    LocalGameModel,
    ControllerEvents,
    ApplicationEvents,
    ControllerState,
    ControllerManager,
    BaseController,
  } = composeSession({
    get loadModule() {
      return loadModule;
    },
    get EventEmitter() {
      return EventEmitter;
    },
    get gameRecords() {
      return gameRecords;
    },
    get moduleDomainSceneInitialLayout() {
      return loadModule('domain/scene/initial-layout');
    },
    get moduleSharedDataObjectUtils() {
      return loadModule('shared/data/object-utils');
    },
  });
  const physicsMonitor = loadModule('shared/diagnostics/physics-monitor');
  const MonitorView = loadModule('presentation/diagnostics/monitor-view');
  physicsMonitor.setViewerFactory(() => new MonitorView());
  var planeModule = loadModule('domain/geometry/plane'),
    Plane = loadModule.n(planeModule),
    physicsApiModule = loadModule('domain/physics/physics-api'),
    physicsApi = loadModule.n(physicsApiModule);
  const CushionBody = function (t, e) {
    ((this.id = t),
      (this.boundsY = e.y),
      this.createCushionData(e.bounds),
      (this.crtCushion = null),
      (this.actives = []));
  };
  CushionBody.prototype = {
    constructor: CushionBody,
    createCushionData: function (t) {
      let e = 0;
      ((this.head = this.createCushionWithPts(e++, t[0], t[1], t[2], t[3])),
        (this.tail = this.head),
        (this.totalCushions = 1));
      for (let i = 1, s = t.length / 2; i !== s; ++i) {
        let n = (i + 1) % s;
        ((this.tail = this.createCushionWithPts(
          e++,
          t[2 * i],
          t[2 * i + 1],
          t[2 * n],
          t[2 * n + 1],
          this.tail,
        )),
          this.totalCushions++);
      }
    },
    createCushionWithPts: (function () {
      let t = new physicsApi.a.Vec3(0, 1, 0);
      return function (e, i, s, n, r, a) {
        let o = new physicsApi.a.Vec3(i, 0, s),
          l = new physicsApi.a.Vec3(n, 0, r),
          h = new physicsApi.a.Vec3(0, 0, 0).subVectors(l, o),
          c = {
            index: e,
            prev: a,
            next: null,
            plane: new Plane.a().setWithPointAnd2Dirs(o, h, t),
            a: o,
            b: l,
            ab: h,
            tp: new physicsApi.a.Vec3(),
            toi: 0,
          };
        return (a && (a.next = c), c);
      };
    })(),
    filter: function (t, e) {
      let i,
        s,
        n = this.head,
        r = e * e,
        a = this.actives;
      for (a.length = 0, this.crtCushion = null; n; ) {
        if (Math.abs(n.plane.signedDistance(t)) < e) {
          let e = this.pointOnside(t, n);
          if (0 === e) a.push(n);
          else if (-1 === e) {
            (i = t.x - n.a.x) * i + (s = t.z - n.a.z) * s < r && a.push(n);
          } else {
            (i = t.x - n.b.x) * i + (s = t.z - n.b.z) * s < r && a.push(n);
          }
        }
        n = n.next;
      }
    },
    pointOnside: (function () {
      let t = new physicsApi.a.Vec3(0, 0, 0);
      return function (e, i) {
        return (
          t.subVectors(e, i.a),
          t.dot(i.ab) < 0 ? -1 : (t.subVectors(e, i.b), t.dot(i.ab) >= 0 ? 1 : 0)
        );
      };
    })(),
    detect: function (t, e, i, s) {
      let n = this.crtCushion;
      if (((n && this.__detectCushion(t, e, n)) || (n = this.__crtCushionFromScratch(t, e)), !n))
        return;
      let r = n.tp,
        a = this.boundsY + i;
      if (r.y < a) {
        let t = s.next();
        (t.reset(r.x, a, r.z, 0), (t.escape = a - r.y));
      }
    },
    __crtCushionFromScratch: function (t, e) {
      let i = this.actives,
        s = this.crtCushion;
      this.crtCushion = null;
      for (let n = 0, r = i.length; n !== r; ++n) {
        let r = i[n];
        r != s &&
          this.__detectCushion(t, e, r) &&
          (!this.crtCushion || r.toi < this.crtCushion.toi) &&
          (this.crtCushion = r);
      }
      return this.crtCushion;
    },
    __detectCushion: function (t, e, i) {
      let s = i.plane,
        n = i.tp,
        r = s.signedDistance(t);
      if (Math.abs(r) < 1e-5) return ((i.toi = 0), n.copyFrom(t), 0 === this.pointOnside(n, i));
      let a = e.dot(s.normal);
      return (
        !(Math.abs(a) < 1e-5) &&
        ((i.toi = -r / a),
        !(i.toi < 0) && (n.scaleVector(i.toi, e).add(t), 0 === this.pointOnside(n, i)))
      );
    },
  };
  var CushionBodyType = CushionBody;
  (loadModule('adapters/rendering/light-probe-material'),
    loadModule('adapters/rendering/dynamic-lighting-material'));
  installHdrCubeRecovery(Babylon);
  const Texture = Babylon.Texture,
    ColorThree = Babylon.Color3,
    LightProbeManager = Babylon.PcolLightProbeManager,
    DynamicLightingMaterial = Babylon.PcolDyIBLMaterial,
    PcolHdrCubeTexture = Babylon.PcolHdrCubeTexture;
  const sceneParameters = new URL(window.location.href).searchParams;
  const interiorDesignRegistry = loadModule('presentation/scenes/interior-design-registry');
  const originalInterior = loadModule('presentation/scenes/interior-design-original');
  const requestedInterior = interiorDesignRegistry.get(sceneParameters.get('interior'));
  const wallStudyEnabled = !requestedInterior && sceneParameters.get('wall-study') === 'modern';
  const interiorDesign =
    requestedInterior ||
    (wallStudyEnabled ? null : interiorDesignRegistry.get('interior-design-original'));
  const applyModernWallStudy = wallStudyEnabled
    ? loadModule('presentation/scenes/modern-wall-study')
    : null;
  const { scenes } = composeScenes({
    get CushionBodyType() {
      return CushionBodyType;
    },
    get Texture() {
      return Texture;
    },
    get ColorThree() {
      return ColorThree;
    },
    get LightProbeManager() {
      return LightProbeManager;
    },
    get DynamicLightingMaterial() {
      return DynamicLightingMaterial;
    },
    get PcolHdrCubeTexture() {
      return PcolHdrCubeTexture;
    },
    get originalInterior() {
      return originalInterior;
    },
    get interiorDesign() {
      return interiorDesign;
    },
    get interiorDesignRegistry() {
      return interiorDesignRegistry;
    },
    get applyModernWallStudy() {
      return applyModernWallStudy;
    },
    get moduleAssetsTexturesTableBallAmbientOcclusion() {
      return loadModule('assets/textures-table-ball-ambient-occlusion');
    },
    get moduleAssetsEnvironmentsBallReflection() {
      return loadModule('assets/environments-ball-reflection');
    },
    get moduleAssetsTexturesTableCarpetLightmap() {
      return loadModule('assets/textures-table-carpet-lightmap');
    },
    get moduleAssetsTexturesTableCarpetNormal() {
      return loadModule('assets/textures-table-carpet-normal');
    },
    get moduleAssetsTexturesTableCarpetOverlay() {
      return loadModule('assets/textures-table-carpet-overlay');
    },
    get moduleAssetsTexturesTableCarpetTile() {
      return loadModule('assets/textures-table-carpet-tile');
    },
    get moduleAssetsEnvironmentsRoomIrradiancePrimary() {
      return loadModule('assets/environments-room-irradiance-primary');
    },
    get moduleAssetsEnvironmentsRoomIrradianceSecondary() {
      return loadModule('assets/environments-room-irradiance-secondary');
    },
    get moduleAssetsTexturesTableFrameDiffuse() {
      return loadModule('assets/textures-table-frame-diffuse');
    },
    get moduleAssetsTexturesTableFrameLightmap() {
      return loadModule('assets/textures-table-frame-lightmap');
    },
    get moduleAssetsTexturesTableFrameNormal() {
      return loadModule('assets/textures-table-frame-normal');
    },
    get moduleAssetsEnvironmentsFrameReflection() {
      return loadModule('assets/environments-frame-reflection');
    },
    get moduleAssetsTexturesTableFrameRoughness() {
      return loadModule('assets/textures-table-frame-roughness');
    },
    get moduleAssetsTexturesRoomInteriorDesignOriginalFloorTile() {
      return loadModule('assets/textures-room-interior-design-original-floor-tile');
    },
    get moduleAssetsTexturesTableTableMask() {
      return loadModule('assets/textures-table-table-mask');
    },
    get moduleAssetsModelsInteriorDesignOriginalRoom() {
      return loadModule('assets/models-interior-design-original-room');
    },
    get moduleAssetsTexturesTablePocketGloss() {
      return loadModule('assets/textures-table-pocket-gloss');
    },
    get moduleAssetsTexturesTableTableUiAtlas() {
      return loadModule('assets/textures-table-table-ui-atlas');
    },
  });
  const UiColors = Object.create(null);
  ((UiColors.RED = [1, 80 / 255, 15 / 255]),
    (UiColors.BLUE = [32 / 255, 179 / 255, 1]),
    (UiColors.YELLOW = [237 / 255, 181 / 255, 30 / 255]),
    (UiColors.GREEN = [25 / 255, 205 / 255, 84 / 255]),
    (UiColors.WHITE = [218 / 255, 218 / 255, 218 / 255]));
  const { Easing, Tween, ValueTween, PropertyTween, TweenGroup } = composeAnimation({
    get EventEmitter() {
      return EventEmitter;
    },
  });
  const { UiShaderMaterial, tableUiAtlas, OrientedUiPlane, PlaneBatch } = composeDisplayPlanes({
    get Babylon() {
      return Babylon;
    },
  });
  loadModule('adapters/rendering/dynamic-lighting-material');
  const { CueEvents, CueMeshManager } = composeCues({
    Babylon,
    EventEmitter,
    CueMaterial: Babylon.PcolDyIBLMaterial,
    CueTexture: Babylon.Texture,
    manifest: {
      model: loadModule('assets/models-alpha-cue'),
      glossy: loadModule('assets/textures-cue-cue-gloss'),
      color: loadModule('assets/textures-cue-cue-color'),
    },
  });
  const { ViewEvents, ViewState, GameView } = composeGameView({
    get Babylon() {
      return Babylon;
    },
    get EventEmitter() {
      return EventEmitter;
    },
    get physicsApi() {
      return physicsApi;
    },
    get scenes() {
      return scenes;
    },
    get UiColors() {
      return UiColors;
    },
    get Easing() {
      return Easing;
    },
    get ValueTween() {
      return ValueTween;
    },
    get UiShaderMaterial() {
      return UiShaderMaterial;
    },
    get tableUiAtlas() {
      return tableUiAtlas;
    },
    get OrientedUiPlane() {
      return OrientedUiPlane;
    },
    get PlaneBatch() {
      return PlaneBatch;
    },
    get CueEvents() {
      return CueEvents;
    },
    get CueMeshManager() {
      return CueMeshManager;
    },
  });
  const ViewController = createViewController({
    get BaseController() {
      return BaseController;
    },
    get ControllerEvents() {
      return ControllerEvents;
    },
    get ViewEvents() {
      return ViewEvents;
    },
  });
  var geometryUtilsModule = loadModule('domain/geometry/geometry-utils'),
    geometryUtils = loadModule.n(geometryUtilsModule);
  const { VectorTwo, LineTwo, EllipseTwo } = composeRouteGeometry({});
  const { aiRegistry, AiGameModel } = composeAi({
    get gameRecords() {
      return gameRecords;
    },
    get localGameSettings() {
      return localGameSettings;
    },
    get BaseGameModel() {
      return BaseGameModel;
    },
    get physicsApi() {
      return physicsApi;
    },
    get geometryUtils() {
      return geometryUtils;
    },
    get VectorTwo() {
      return VectorTwo;
    },
  });
  const {
    UiComponent,
    SideMenu,
    InteriorDesignDialog,
    MoreThingsDialog,
    MessageKind,
    ContentPanel,
    dialogEvents,
    BaseDialog,
    PreservedActionDialog,
  } = composeUi({
    get EventEmitter() {
      return EventEmitter;
    },
    get Easing() {
      return Easing;
    },
    get PropertyTween() {
      return PropertyTween;
    },
    get TweenGroup() {
      return TweenGroup;
    },
    get ValueTween() {
      return ValueTween;
    },
  });
  const aiDifficultyTemplate = loadModule('presentation/templates/ai-difficulty');
  const ActionDialog = createGameDialog({
    ActionDialog: PreservedActionDialog,
    UiComponent,
    PropertyTween,
    Easing,
    dialogEvents,
  });
  const AiDifficultyDialog = createAiDifficultyDialog({
    get ActionDialog() {
      return ActionDialog;
    },
    get aiDifficultyTemplate() {
      return aiDifficultyTemplate;
    },
    get aiRegistry() {
      return aiRegistry;
    },
  });
  const aboutTemplate = loadModule('presentation/templates/about-game');
  const menuTelemetry = window.gtag || null;
  const AboutDrawer = createAboutDrawer({ InteriorDesignDialog, aboutTemplate });
  const PreservedMenuController = createMenuController({
    get AboutDialog() {
      return AboutDrawer;
    },
    get AiDifficultyDialog() {
      return AiDifficultyDialog;
    },
    get AiGameModel() {
      return AiGameModel;
    },
    get ApplicationEvents() {
      return ApplicationEvents;
    },
    get ControllerEvents() {
      return ControllerEvents;
    },
    get Easing() {
      return Easing;
    },
    get PropertyTween() {
      return PropertyTween;
    },
    get SideMenu() {
      return SideMenu;
    },
    get ViewController() {
      return ViewController;
    },
    get dialogEvents() {
      return dialogEvents;
    },
    get menuTelemetry() {
      return menuTelemetry;
    },
  });
  const MenuController = createInteriorMenuController({
    MenuController: PreservedMenuController,
    InteriorDesignDialog,
    MoreThingsDialog,
    registry: interiorDesignRegistry,
    selection: createInteriorDesignSelection(interiorDesignRegistry),
    transition: loadModule('application/interior-transition'),
    dialogEvents,
  });
  var playerModule = loadModule('domain/game/player'),
    Player = loadModule.n(playerModule),
    refereeRegistryModule = loadModule('domain/rules/referee-registry'),
    refereeRegistry = loadModule.n(refereeRegistryModule),
    gameStateModule = loadModule('domain/game/game-state'),
    GameState = loadModule.n(gameStateModule);
  const { SnookerGameModel } = composeMatchModel({
    get gameRecords() {
      return gameRecords;
    },
    get localGameSettings() {
      return localGameSettings;
    },
    get BaseGameModel() {
      return BaseGameModel;
    },
    get aiRegistry() {
      return aiRegistry;
    },
    get Player() {
      return Player;
    },
    get refereeRegistry() {
      return refereeRegistry;
    },
    get GameState() {
      return GameState;
    },
  });
  var simulatorModule = loadModule('domain/simulation/simulator'),
    Simulator = loadModule.n(simulatorModule),
    simulationEventsModule = loadModule('domain/simulation/simulation-events'),
    SimulationEvents = loadModule.n(simulationEventsModule),
    simulationStateModule = loadModule('domain/simulation/simulation-state'),
    SimulationState = loadModule.n(simulationStateModule),
    collisionEventsModule = loadModule('domain/physics/collision-events'),
    CollisionEvents = loadModule.n(collisionEventsModule),
    meshLoaderModule = loadModule('infrastructure/assets/collision-mesh-loader'),
    collisionMeshLoader = loadModule.n(meshLoaderModule),
    foulCodesModule = loadModule('domain/rules/foul-codes'),
    foulCodes = loadModule.n(foulCodesModule);
  const { ControlGroup, controlEvents, ToolbarGroup } = composeControls({});
  const Toolbar = createGameToolbar(
    createToolbar({
      get ToolbarGroup() {
        return ToolbarGroup;
      },
      get UiComponent() {
        return UiComponent;
      },
      get dialogEvents() {
        return dialogEvents;
      },
    }),
  );
  const { BallInHandControl } = composeBallInHand({
    get physicsApi() {
      return physicsApi;
    },
    get UiColors() {
      return UiColors;
    },
    get MessageKind() {
      return MessageKind;
    },
    get GameState() {
      return GameState;
    },
    get ControlGroup() {
      return ControlGroup;
    },
    get controlEvents() {
      return controlEvents;
    },
    get ToolbarGroup() {
      return ToolbarGroup;
    },
  });
  const { AngularController, LinearController } = composeMotionAnimation({
    get EventEmitter() {
      return EventEmitter;
    },
  });
  const { OrbitController, StanceController, LookController, HeadingController } =
    composeOrbitCamera({
      get Babylon() {
        return Babylon;
      },
      get Easing() {
        return Easing;
      },
      get Tween() {
        return Tween;
      },
      get PropertyTween() {
        return PropertyTween;
      },
      get VectorTwo() {
        return VectorTwo;
      },
      get LineTwo() {
        return LineTwo;
      },
      get EllipseTwo() {
        return EllipseTwo;
      },
      get AngularController() {
        return AngularController;
      },
      get LinearController() {
        return LinearController;
      },
    });
  const { PlayerControl, CueMotionController } = composeCueInput({
    get Babylon() {
      return Babylon;
    },
    get EventEmitter() {
      return EventEmitter;
    },
    get Plane() {
      return Plane;
    },
    get physicsApi() {
      return physicsApi;
    },
    get Easing() {
      return Easing;
    },
  });
  const { AimCameraController } = composeAimCamera({
    get Babylon() {
      return Babylon;
    },
    get Easing() {
      return Easing;
    },
    get PropertyTween() {
      return PropertyTween;
    },
    get LinearController() {
      return LinearController;
    },
  });
  const { PersonState, PersonEvents, PersonController } = composePerson({
    get Babylon() {
      return Babylon;
    },
    get Easing() {
      return Easing;
    },
    get Tween() {
      return Tween;
    },
    get OrbitController() {
      return OrbitController;
    },
    get StanceController() {
      return StanceController;
    },
    get LookController() {
      return LookController;
    },
    get HeadingController() {
      return HeadingController;
    },
    get PlayerControl() {
      return PlayerControl;
    },
    get CueMotionController() {
      return CueMotionController;
    },
    get AimCameraController() {
      return AimCameraController;
    },
  });
  var browserDetectorModule = loadModule('adapters/browser/browser-detector'),
    browserDetector = loadModule.n(browserDetectorModule);
  const shortcutsTemplate = loadModule('presentation/templates/keyboard-shortcuts');
  const PreservedShortcutBar = createShortcutBar({
    get Easing() {
      return Easing;
    },
    get PropertyTween() {
      return PropertyTween;
    },
    get UiComponent() {
      return UiComponent;
    },
    get browserDetector() {
      return browserDetector;
    },
    get shortcutsTemplate() {
      return shortcutsTemplate;
    },
  });
  const ShortcutBar = createGameShortcuts({
    ShortcutBar: PreservedShortcutBar,
    PropertyTween,
    Easing,
  });
  const MessageDialog = createGameHelp(
    createVectorControlsDialog(
      createMessageDialog({
        get ActionDialog() {
          return ActionDialog;
        },
      }),
    ),
  );
  let controlsTemplate = loadModule('presentation/templates/controls-guide');
  const ControlsDialog = createGameHelp(
    createVectorControlsDialog(
      createControlsDialog({
        get ActionDialog() {
          return ActionDialog;
        },
        get browserDetector() {
          return browserDetector;
        },
        get controlsTemplate() {
          return controlsTemplate;
        },
        set controlsTemplate(value) {
          controlsTemplate = value;
        },
      }),
    ),
  );
  const { PlayerTurnControl } = composePlayerTurn({
    get physicsApi() {
      return physicsApi;
    },
    get Easing() {
      return Easing;
    },
    get GameState() {
      return GameState;
    },
    get ControlGroup() {
      return ControlGroup;
    },
    get controlEvents() {
      return controlEvents;
    },
    get ToolbarGroup() {
      return ToolbarGroup;
    },
    get PersonState() {
      return PersonState;
    },
    get PersonEvents() {
      return PersonEvents;
    },
    get ShortcutBar() {
      return ShortcutBar;
    },
    get MessageDialog() {
      return MessageDialog;
    },
    get ControlsDialog() {
      return ControlsDialog;
    },
  });
  const PauseDialog = createPauseDialog({
    get ActionDialog() {
      return ActionDialog;
    },
  });
  let practiceResultTemplate = loadModule('presentation/templates/practice-result');
  const PracticeResultDialog = createGameResults(
    createPracticeResultDialog({
      get ActionDialog() {
        return ActionDialog;
      },
      get objectUtils() {
        return objectUtils;
      },
      get practiceResultTemplate() {
        return practiceResultTemplate;
      },
      set practiceResultTemplate(value) {
        practiceResultTemplate = value;
      },
    }),
    true,
  );
  const { ReplayControl, MovieClip } = composeReplay({
    get physicsApi() {
      return physicsApi;
    },
    get Easing() {
      return Easing;
    },
    get PropertyTween() {
      return PropertyTween;
    },
    get UiComponent() {
      return UiComponent;
    },
    get dialogEvents() {
      return dialogEvents;
    },
    get GameState() {
      return GameState;
    },
    get ControlGroup() {
      return ControlGroup;
    },
    get controlEvents() {
      return controlEvents;
    },
    get ToolbarGroup() {
      return ToolbarGroup;
    },
    get modulePresentationTemplatesReplayControls() {
      return loadModule('presentation/templates/replay-controls');
    },
  });
  const scoreboardTemplate = loadModule('presentation/templates/scoreboard');
  const Scoreboard = createGameScoreboard(
    createScoreboard({
      get UiComponent() {
        return UiComponent;
      },
      get scoreboardTemplate() {
        return scoreboardTemplate;
      },
    }),
  );
  const AiPersonController = createAiPersonController({
    get GameState() {
      return GameState;
    },
    get PersonController() {
      return PersonController;
    },
    get PersonEvents() {
      return PersonEvents;
    },
    get PersonState() {
      return PersonState;
    },
  });
  const PassivePersonController = createPassivePersonController({
    get Babylon() {
      return Babylon;
    },
    get PersonController() {
      return PersonController;
    },
  });
  let matchResultTemplate = loadModule('presentation/templates/match-result');
  const MatchResultDialog = createGameResults(
    createMatchResultDialog({
      get ActionDialog() {
        return ActionDialog;
      },
      get matchResultTemplate() {
        return matchResultTemplate;
      },
      set matchResultTemplate(value) {
        matchResultTemplate = value;
      },
      get objectUtils() {
        return objectUtils;
      },
    }),
    false,
  );
  const matchTelemetry = window.gtag || null,
    localSimulator = new Simulator.a(
      'local',
      new physicsApi.a.WorldClient(),
      collisionMeshLoader.a,
    ),
    localMovieClip = new MovieClip();
  const MatchController = createGameUiController(
    createMatchController({
      get AiPersonController() {
        return AiPersonController;
      },
      get ApplicationEvents() {
        return ApplicationEvents;
      },
      get BallInHandControl() {
        return BallInHandControl;
      },
      get CollisionEvents() {
        return CollisionEvents;
      },
      get ControllerEvents() {
        return ControllerEvents;
      },
      get ControllerState() {
        return ControllerState;
      },
      get ControlsDialog() {
        return ControlsDialog;
      },
      get Easing() {
        return Easing;
      },
      get EventEmitter() {
        return EventEmitter;
      },
      get MatchResultDialog() {
        return MatchResultDialog;
      },
      get MessageKind() {
        return MessageKind;
      },
      get PassivePersonController() {
        return PassivePersonController;
      },
      get PauseDialog() {
        return PauseDialog;
      },
      get Player() {
        return Player;
      },
      get PlayerTurnControl() {
        return PlayerTurnControl;
      },
      get PracticeResultDialog() {
        return PracticeResultDialog;
      },
      get PropertyTween() {
        return PropertyTween;
      },
      get ReplayControl() {
        return ReplayControl;
      },
      get Scoreboard() {
        return Scoreboard;
      },
      get SimulationEvents() {
        return SimulationEvents;
      },
      get SimulationState() {
        return SimulationState;
      },
      get SnookerGameModel() {
        return SnookerGameModel;
      },
      get Toolbar() {
        return Toolbar;
      },
      get ToolbarGroup() {
        return ToolbarGroup;
      },
      get ViewController() {
        return ViewController;
      },
      get ViewEvents() {
        return ViewEvents;
      },
      get ViewState() {
        return ViewState;
      },
      get controlEvents() {
        return controlEvents;
      },
      get dialogEvents() {
        return dialogEvents;
      },
      get foulCodes() {
        return foulCodes;
      },
      get localMovieClip() {
        return localMovieClip;
      },
      get localSimulator() {
        return localSimulator;
      },
      get matchTelemetry() {
        return matchTelemetry;
      },
    }),
    GameState.a,
  );
  const ToastDialog = createGameToast(
    createToastDialog({
      get BaseDialog() {
        return BaseDialog;
      },
      get ContentPanel() {
        return ContentPanel;
      },
    }),
  );
  const ConfirmationDialog = createGameConfirmation(
    createConfirmationDialog({
      get ActionDialog() {
        return ActionDialog;
      },
      get dialogEvents() {
        return dialogEvents;
      },
    }),
  );
  const DialogZIndex = Object.create(null);
  ((DialogZIndex.MESSAGE_BOX = 10), (DialogZIndex.GAME_BOX = 20));
  const DialogDirtyFlags = Object.create(null);
  ((DialogDirtyFlags.MESSAGE_AUTO_CLOSE = 1), (DialogDirtyFlags.ACTIVE_BOX_DIRTY = 2));
  const PreservedDialogManager = createDialogManager({
    get ConfirmationDialog() {
      return ConfirmationDialog;
    },
    get DialogDirtyFlags() {
      return DialogDirtyFlags;
    },
    get DialogZIndex() {
      return DialogZIndex;
    },
    get ToastDialog() {
      return ToastDialog;
    },
    get dialogEvents() {
      return dialogEvents;
    },
  });
  const DialogManager = createGameDialogManager({
    DialogManager: PreservedDialogManager,
    ToastDialog,
    dialogEvents,
  });
  var resourcePathsModule = loadModule('infrastructure/assets/resource-paths'),
    resourcePaths = loadModule.n(resourcePathsModule);
  loadModule.d(exports, 'default', function () {
    return SmoothSnookerApplication;
  });
  const applicationTelemetry = window.gtag || null;
  const FrameClock = createFrameClock({});
  const SnookerApplication = createSnookerApplication({
    loading: createGameLoading(),
    get ApplicationEvents() {
      return ApplicationEvents;
    },
    get Babylon() {
      return Babylon;
    },
    get ControllerManager() {
      return ControllerManager;
    },
    get ControllerState() {
      return ControllerState;
    },
    get DialogManager() {
      return DialogManager;
    },
    get FrameClock() {
      return FrameClock;
    },
    get GameView() {
      return GameView;
    },
    get LocalGameModel() {
      return LocalGameModel;
    },
    get MatchController() {
      return MatchController;
    },
    get MenuController() {
      return MenuController;
    },
    get MessageKind() {
      return MessageKind;
    },
    get ViewEvents() {
      return ViewEvents;
    },
    get applicationTelemetry() {
      return applicationTelemetry;
    },
    get resourcePaths() {
      return resourcePaths;
    },
  });
  const SmoothSnookerApplication = createSmoothSnookerApplication(SnookerApplication);
  SmoothSnookerApplication.VERSION = '0.1.0.03152018';
}
