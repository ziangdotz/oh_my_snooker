// Explicit live dependencies preserve initialization and shared state.
export default function createViewController(dependencies) {
  return class ViewController extends dependencies.BaseController {
    _logSelfAPI(t, e, i = '') {
      throw new Error('debug function called: logSelfAPI');
    }
    _logMV(t, e, i) {
      throw new Error('debug function called: logMV');
    }
    constructor(t) {
      (super(t),
        (this._gView = null),
        (this._uiLayer = null),
        (this._uiRegistered = !1),
        (this._model = null));
    }
    launch(t) {
      (super.launch(),
        (this._gView = t.gView),
        (this._uiLayer = t.uiLayer),
        this._uiRegistered || (this._registerUI(), (this._uiRegistered = !0)),
        this._bindUI(),
        this._model.asyncLaunch((t) => {
          this._onModelLaunched(t);
        }));
    }
    _registerUI() {
      0;
    }
    _bindUI() {}
    _unbindUI() {}
    _onModelLaunched(t) {
      this._gView
        .on(dependencies.ViewEvents.READY, () => {
          this._onItemsReady();
        })
        .sync(t);
    }
    _onItemsReady() {
      (this._gView.removeAllListeners(dependencies.ViewEvents.READY),
        this.emit(dependencies.ControllerEvents.READY));
    }
    enter() {
      (this._gView.requireRender(), super.enter());
    }
    updateEntering(t) {
      t.duration > 0 && this.emit(dependencies.ControllerEvents.ENTERED);
    }
    action() {
      (super.action(), this._bindEvents(), this._gView.freezeMaterials());
    }
    updateActing() {}
    _bindEvents() {
      0;
    }
    _unbindEvents() {
      0;
    }
    block() {}
    unblock() {}
    exit() {
      (super.exit(), this._unbindEvents());
    }
    updateExiting(t) {
      t.duration > 0 && this.emit(dependencies.ControllerEvents.EXITED);
    }
    free() {
      (this._unbindUI(), (this._gView = null), (this._uiLayer = null), super.free());
    }
  };
}
