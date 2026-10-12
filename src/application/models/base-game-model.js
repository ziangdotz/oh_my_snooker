// Explicit live dependencies preserve initialization and shared state.
export default function createBaseGameModel(dependencies) {
  return class BaseGameModel extends dependencies.EventEmitter.a {
    constructor() {
      super();
    }
    asyncLaunch(t) {
      t();
    }
    getControllerSetting() {
      return dependencies.localGameSettings.getGameSettings('personController');
    }
  };
}
