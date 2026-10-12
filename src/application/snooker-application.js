// Explicit live dependencies preserve initialization and shared state.
export default function createSnookerApplication(dependencies) {
  return class SnookerApplication extends dependencies.ControllerManager {
    showLoading() {
      if (!this._loadingIsOn) {
        dependencies.loading.show();
        this._loadingIsOn = true;
      }
    }
    hideLoading() {
      if (this._loadingIsOn) {
        dependencies.loading.hide();
        this._loadingIsOn = false;
      }
    }
    constructor() {
      (super(),
        (this._initialLoadingTime = Date.now()),
        (this._tipBadBrowser = !1),
        (dependencies.Babylon.Engine.ShadersRepository = dependencies.resourcePaths.a.shaders),
        (dependencies.Babylon.SceneLoader.ShowLoadingScreen = !1));
      const t = document.getElementById('game-view');
      (t.addEventListener('contextmenu', (t) => (t.preventDefault(), !1), !1),
        (this._engine = new dependencies.Babylon.Engine(t, !0, void 0, !0)),
        (this._engine.enableOfflineSupport = !1),
        (this._engine.disablePerformanceMonitorInBackground = !0),
        this._engine.getHardwareScalingLevel() < 0.5 && this._engine.setHardwareScalingLevel(0.5),
        this._customizeBJSBuiltinEvents(t, this._engine),
        (this._loadingIsOn = !1),
        (this._gView = new dependencies.GameView(this._engine, t)),
        (this._model = new dependencies.LocalGameModel()),
        (this._controllers.home = new dependencies.MenuController('home')),
        (this._controllers.game = new dependencies.MatchController('game')),
        (this._uiLayer = new dependencies.DialogManager(
          document.getElementById('game-container'),
          t,
        )),
        (this._controllerLaunchOptions.gView = this._gView),
        (this._controllerLaunchOptions.uiLayer = this._uiLayer),
        (this._gTimer = new dependencies.FrameClock()),
        (this._updateHandler = null),
        (this._onModelRestored = (t, e) => {
          if (t) throw t;
          (this._engine.runRenderLoop(() => {
            let t = this._gTimer.tick();
            (this._uiLayer.needsUpdate && this._uiLayer.update(t), this._updateHandler());
          }),
            this.changeController(e));
        }),
        (this._onChangeController = (t) => {
          this.changeController(t);
        }),
        this._engine.resize(),
        window.addEventListener('resize', () => {
          (this._engine.resize(), this._gView.requireRender());
        }),
        this._gView.on(dependencies.ViewEvents.LOADED, () => {
          const t = this._model.cameraSettings;
          for (const e in t) this._gView.camera[e] = t[e];
        }));
    }
    launch(t) {
      (this.showLoading(), this._model.asyncLaunch(t, this._onModelRestored));
    }
    onCurrentControllerStateChanged() {
      this._gTimer.reset();
      let t = this._currentController;
      if (t)
        switch (t.state) {
          case dependencies.ControllerState.PENDING:
            return (
              (this._updateHandler = this._updatePending),
              void t.on(dependencies.ApplicationEvents.CHANGE_CONTROLLER, this._onChangeController)
            );
          case dependencies.ControllerState.ENTERING:
            if (
              (this.hideLoading(),
              this._gView.show(),
              (this._updateHandler = this._updateEntering),
              this._initialLoadingTime > 0)
            ) {
              let t = Date.now() - this._initialLoadingTime;
              ((this._initialLoadingTime = -1),
                dependencies.applicationTelemetry('event', 'timing_complete', {
                  name: 'initial_load',
                  value: t,
                }),
                dependencies.applicationTelemetry('event', 'loaded', {
                  event_category: 'game_page',
                  value: 1,
                }));
            }
            return;
          case dependencies.ControllerState.ACTING:
            return (
              this._tipBadBrowser &&
                ((this._tipBadBrowser = !1),
                this._uiLayer.message(
                  'PERFORMANCE TIP',
                  'The WebGL version of the current browser is low. For better performance, please consider playing this game in a WebGL 2.0 supported browser like the latest version of <b class="bright-copy">Firefox</b> or <b class="bright-copy">Google Chrome</b>.',
                  dependencies.MessageKind.WARNING,
                  !1,
                  void 0,
                  40,
                )),
              this.hideLoading(),
              this._gView.show(),
              this._uiLayer.isBlocked || this._gView.canvas.focus(),
              void (this._updateHandler = this._updateActing)
            );
          case dependencies.ControllerState.EXITING:
            return (
              (this._updateHandler = this._updateExiting),
              void t.removeAllListeners(dependencies.ApplicationEvents.CHANGE_CONTROLLER)
            );
          default:
            return void (this._updateHandler = this._updateNone);
        }
      else this._updateHandler = this._updateNone;
    }
    _updateNone() {}
    _updatePending() {
      (10 === this._gTimer.frames && this.showLoading(), this._gView.update());
    }
    _updateEntering() {
      (this._currentController.updateEntering(this._gTimer), this._gView.update());
    }
    _updateActing() {
      (this._currentController.updateActing(this._gTimer), this._gView.update());
    }
    _updateExiting() {
      (this._currentController.updateExiting(this._gTimer), this._gView.update());
    }
    _customizeBJSBuiltinEvents(t, e) {
      (t.removeEventListener('focus', e._onCanvasFocus),
        t.removeEventListener('blur', e._onCanvasBlur),
        t.removeEventListener('pointerout', e._onCanvasBlur),
        t.removeEventListener('pointerout', e._onCanvasPointerOut),
        document.removeEventListener('pointerlockchange', e._onPointerLockChange),
        document.removeEventListener('mspointerlockchange', e._onPointerLockChange),
        document.removeEventListener('mozpointerlockchange', e._onPointerLockChange),
        document.removeEventListener('webkitpointerlockchange', e._onPointerLockChange),
        document.removeEventListener('fullscreenchange', e._onFullscreenChange),
        document.removeEventListener('mozfullscreenchange', e._onFullscreenChange),
        document.removeEventListener('webkitfullscreenchange', e._onFullscreenChange),
        document.removeEventListener('msfullscreenchange', e._onFullscreenChange),
        window.removeEventListener('vrdisplaypointerrestricted', e._onVRDisplayPointerRestricted),
        window.removeEventListener(
          'vrdisplaypointerunrestricted',
          e._onVRDisplayPointerUnrestricted,
        ),
        document.addEventListener(
          'mouseup',
          () => {
            this._uiLayer.isBlocked || document.activeElement !== document.body || t.focus();
          },
          !1,
        ));
    }
    _checkEvents(t, e) {
      throw new Error('debug function called: checkEvents');
    }
  };
}
