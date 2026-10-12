/** Preserve the original definition and evaluation order. */
export default function createLocalGameSettings(dependencies) {
  return new (class {
    constructor() {
      ((this._localUser = null), (this._gameSettings = null), (this._gameDefineId = null));
    }
    getGameDefineData(t) {
      return dependencies.objectUtils.a.deepClone(
        dependencies.initialLayout.a[this._gameDefineId][t],
      );
    }
    getGameSettings(t) {
      return this._gameSettings[t];
    }
    getLocalUserInfoData(t) {
      return this._localUser.userInfo[t];
    }
    getLocalUserInfo() {
      return this._localUser.userInfo;
    }
    restore(t) {
      if (
        ((this._localUser = new dependencies.LocalUser(t)),
        (this._gameDefineId = t.gameDefineId),
        (this._gameSettings = dependencies.objectUtils.a.deepClone(
          dependencies.defaultGameSettings,
        )),
        t.settings)
      ) {
        for (const e in t.settings) {
          dependencies.objectUtils.a.politeMerge(this._gameSettings, e, t.settings[e]);
        }
      }
      return this._validate();
    }
    _validate() {
      return !0;
    }
  })();
}
