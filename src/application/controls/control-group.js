// Explicit live dependencies preserve initialization and shared state.
export default function createControlGroup(dependencies) {
  return class ControlGroup {
    get active() {
      throw new Error('use isActive instead!');
    }
    get isActive() {
      return this._isActive;
    }
    get name() {
      return this._name;
    }
    get displayUIGroup() {
      return this._displayUIGroup;
    }
    constructor(t, e, i) {
      ((this._name = t),
        (this._binded = !1),
        (this._isActive = !1),
        (this._gView = null),
        (this._model = null),
        (this._simulator = null),
        (this._evtBus = null),
        (this._fpc = null),
        (this._playerCtls = null),
        (this._localUIGroup = i),
        (this._displayUIGroup = e | i),
        (this._evtManager = new dependencies.InputState()),
        (this.update = this._defaultUpdateHandler));
    }
    bindUI() {}
    onModelResponse(t) {
      this._binded && this._onModelResponseHandler(t);
    }
    _onModelResponseHandler() {}
    _registerLocalUI(t, e, i, s, n) {
      let r = i.getRegisteredUI(t);
      return (
        r || (r = i.registerUI(new e(t))),
        -1 === s.indexOf(r) && s.push(r),
        (r.group = void 0 === n ? this._localUIGroup : n),
        r
      );
    }
    bind(t, e, i, s, n, r) {
      ((this._gView = t),
        (this._model = e),
        (this._simulator = i),
        (this._evtBus = r),
        (this._fpc = s),
        (this._playerCtls = n),
        (this._binded = !0),
        this.onModelResponse(this._model));
    }
    unbind() {
      (this.deactivate(),
        (this._gView = null),
        (this._model = null),
        (this._simulator = null),
        (this._evtBus = null),
        (this._fpc = null),
        (this._playerCtls = null),
        (this._binded = !1));
    }
    activate() {
      return (this._isActive || ((this._isActive = !0), this._onActvate()), this);
    }
    deactivate() {
      return (this._isActive && ((this._isActive = !1), this._onDeactvate()), this);
    }
    setGState(t) {
      this._evtManager.state = t;
    }
    _onActvate() {
      this._evtManager.bindEvents(this._gView.canvas);
    }
    _onDeactvate() {
      this._evtManager.unbindEvents(this._gView.canvas);
    }
    _defaultUpdateHandler() {
      return !1;
    }
    updateGameBase(t) {
      const e = this._playerCtls;
      let i = !1;
      for (let s = 0, n = e.length; s !== n; ++s) e[s].shouldUpdate() && e[s].update(t) && (i = !0);
      return i;
    }
  };
}
