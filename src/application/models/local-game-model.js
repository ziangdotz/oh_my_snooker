// Explicit live dependencies preserve initialization and shared state.
export default function createLocalGameModel(dependencies) {
  return class LocalGameModel extends dependencies.BaseGameModel {
    constructor() {
      super();
    }
    get cameraSettings() {
      return dependencies.localGameSettings.getGameSettings('camera');
    }
    asyncLaunch(t, e) {
      let i = this._createLocalSessionData(t);
      setTimeout(() => {
        dependencies.localGameSettings.restore(i)
          ? e(null, 'home')
          : e(new Error('DataCenter restore failed'));
      }, 1);
    }
    _createLocalSessionData(t) {
      let e = Object.create(null);
      return (
        (e.userId = t.userId),
        (e.displayName = t.displayName),
        (e.stickName = 'stickAlpha'),
        (e.level = 1),
        (e.money = 1e3),
        (e.gameDefineId = 'default'),
        (e.settings = void 0),
        e
      );
    }
  };
}
