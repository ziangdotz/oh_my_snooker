import createLocalGameSettings from '../settings/local-game-settings.js';
import createLocalUser from '../models/local-user.js';
import createBaseGameModel from '../models/base-game-model.js';
import createLocalGameModel from '../models/local-game-model.js';
import createControllerManager from '../controllers/controller-manager.js';
import createBaseController from '../controllers/base-controller.js';
/** Own this type family and its shared state once per game composition. */
export default function composeSession(dependencies) {
  const loadModule = dependencies.loadModule;
  const LocalUser = createLocalUser({
    get gameRecords() {
      return dependencies.gameRecords;
    },
  });
  const initialLayoutModule = dependencies.moduleDomainSceneInitialLayout,
    initialLayout = loadModule.n(initialLayoutModule),
    objectUtilsModule = dependencies.moduleSharedDataObjectUtils,
    objectUtils = loadModule.n(objectUtilsModule);
  const defaultGameSettings = {
    camera: { fov: 0.88, minZ: 0.01 },
    personController: { eyeStandHeight: 1.7, eyeSquatHeight: 1, innerTrackRadius: 0.38 },
  };
  const localGameSettings = createLocalGameSettings({
    get LocalUser() {
      return LocalUser;
    },
    get initialLayout() {
      return initialLayout;
    },
    get objectUtils() {
      return objectUtils;
    },
    get defaultGameSettings() {
      return defaultGameSettings;
    },
  });
  const BaseGameModel = createBaseGameModel({
    get EventEmitter() {
      return dependencies.EventEmitter;
    },
    get localGameSettings() {
      return localGameSettings;
    },
  });
  const LocalGameModel = createLocalGameModel({
    get BaseGameModel() {
      return BaseGameModel;
    },
    get localGameSettings() {
      return localGameSettings;
    },
  });
  const ControllerEvents = { READY: 'ready', ENTERED: 'entered', EXITED: 'exited' },
    ApplicationEvents = Object.create(null);
  ApplicationEvents.CHANGE_CONTROLLER = 'change_ctlr';
  const ControllerState = { IDLE: 0, PENDING: 1, ENTERING: 2, ACTING: 3, EXITING: 4 };
  const ControllerManager = createControllerManager({
    get ControllerEvents() {
      return ControllerEvents;
    },
    get ControllerState() {
      return ControllerState;
    },
  });
  let nextControllerId = 0;
  const BaseController = createBaseController({
    get ControllerState() {
      return ControllerState;
    },
    get EventEmitter() {
      return dependencies.EventEmitter;
    },
    get nextControllerId() {
      return nextControllerId;
    },
    set nextControllerId(value) {
      nextControllerId = value;
    },
  });

  return {
    objectUtils,
    localGameSettings,
    BaseGameModel,
    LocalGameModel,
    ControllerEvents,
    ApplicationEvents,
    ControllerState,
    ControllerManager,
    BaseController,
  };
}
