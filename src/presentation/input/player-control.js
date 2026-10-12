// Explicit live dependencies preserve initialization and shared state.
export default function createPlayerControl(dependencies) {
  return class PlayerControl extends dependencies.EventEmitter.a {
    get active() {
      return this._active;
    }
    get gPlayerIndex() {
      return this._gPlayerIndex;
    }
    get stickName() {
      return this._stickName;
    }
    get activeStickMesh() {
      return this._activeStickMesh;
    }
    constructor() {
      (super(),
        (this._gView = null),
        (this._simulator = null),
        (this._model = null),
        (this._gPlayerIndex = -1),
        (this._stickName = void 0),
        (this._active = !1),
        (this._activeStickMesh = null));
    }
    reset(t, e, i, s, n) {
      ((this._gView = t),
        (this._simulator = e),
        (this._model = i),
        (this._gPlayerIndex = s),
        (this._stickName = n),
        -1 !== s
          ? (n && this._gView.requireStick(n)) ||
            ((this._gPlayerIndex = -1), (this._stickName = void 0))
          : (this._stickName = void 0));
    }
    syncEnter() {}
    activate() {
      return (this._active || ((this._active = !0), this._onActive()), this);
    }
    deactivate() {
      return (this._active && ((this._active = !1), this._onDeactive()), this);
    }
    _onActive() {
      ((this._activeStickMesh = this._gView.requireStick(this._stickName)),
        this._activeStickMesh && (this._activeStickMesh.inUse = !0));
    }
    _onDeactive() {
      this._activeStickMesh &&
        (this._gView.markStickAsUnused(this._activeStickMesh), (this._activeStickMesh = null));
    }
    syncTipMotion(t) {
      throw new Error('override me: ' + t);
    }
    update(t) {
      throw new Error('should be overridden: ' + t);
    }
    shouldUpdate() {
      return !1;
    }
    release() {
      (this._active && this.deactivate(),
        (this._gView = null),
        (this._simulator = null),
        (this._model = null),
        (this._stickName = void 0),
        (this._gPlayerIndex = -1));
    }
  };
}
