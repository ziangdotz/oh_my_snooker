// Explicit live dependencies preserve initialization and shared state.
export default function createControllerManager(dependencies) {
  return class ControllerManager {
    constructor() {
      ((this._controllers = Object.create(null)),
        (this._pendingNextControllerName = ''),
        (this._currentController = null),
        (this._controllerLaunchOptions = Object.create(null)),
        (this._onCurrentControllerReady = () => {
          let t = this._currentController;
          (t.removeAllListeners(dependencies.ControllerEvents.READY),
            this._pendingNextControllerName && this._pendingNextControllerName.length
              ? (t.on(dependencies.ControllerEvents.EXITED, this._onCurrentControllerExited).exit(),
                this.onCurrentControllerStateChanged())
              : (t
                  .on(dependencies.ControllerEvents.ENTERED, this._onCurrentControllerEntered)
                  .enter(),
                this.onCurrentControllerStateChanged()));
        }),
        (this._onCurrentControllerEntered = () => {
          let t = this._currentController;
          (t.removeAllListeners(dependencies.ControllerEvents.ENTERED),
            this._pendingNextControllerName && this._pendingNextControllerName.length
              ? (t.on(dependencies.ControllerEvents.EXITED, this._onCurrentControllerExited).exit(),
                this.onCurrentControllerStateChanged())
              : (t.action(), this.onCurrentControllerStateChanged()));
        }),
        (this._onCurrentControllerExited = () => {
          (this._currentController.free(),
            (this._currentController = null),
            this._launchPendingController());
        }));
    }
    changeController(t) {
      let e = this._currentController;
      if (!e) return ((this._pendingNextControllerName = t), this._launchPendingController());
      switch (e.state) {
        case dependencies.ControllerState.PENDING:
        case dependencies.ControllerState.ENTERING:
          return e.name === t
            ? ((this._pendingNextControllerName = ''), !1)
            : ((this._pendingNextControllerName = t), !0);
        case dependencies.ControllerState.ACTING:
          return (
            (this._pendingNextControllerName = t),
            e.on(dependencies.ControllerEvents.EXITED, this._onCurrentControllerExited).exit(),
            this.onCurrentControllerStateChanged(),
            !0
          );
        case dependencies.ControllerState.EXITING:
          return ((this._pendingNextControllerName = t), !0);
        default:
          return !1;
      }
    }
    onCurrentControllerStateChanged() {}
    _launchPendingController() {
      let t = this._pendingNextControllerName,
        e = this._controllers[t];
      return (
        (this._pendingNextControllerName = ''),
        !!e &&
          ((this._currentController = e),
          e
            .on(dependencies.ControllerEvents.READY, this._onCurrentControllerReady)
            .launch(this._controllerLaunchOptions),
          this.onCurrentControllerStateChanged(),
          !0)
      );
    }
  };
}
