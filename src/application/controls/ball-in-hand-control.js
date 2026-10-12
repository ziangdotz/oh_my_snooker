// Explicit live dependencies preserve initialization and shared state.
export default function createBallInHandControl(dependencies) {
  return class BallInHandControl extends dependencies.ControlGroup {
    constructor(t, e, i) {
      (super(t, e, i),
        (this._mouseX = NaN),
        (this._mouseY = NaN),
        (this._spot = new dependencies.physicsApi.a.Vec3()),
        (this._isValidSpot = !1),
        (this._firstLookToSet = !1),
        (this._needsFirstAutoTip = !0),
        (this._tipPopped = !1),
        (this._tipMsgId = 'iht'),
        (this._autoTipTimer = 0),
        this._evtManager.initialize(
          {
            '68|39': {
              down: () => {
                this._fpc.orbit(void 0, 1);
              },
              up: () => {
                this._fpc.orbit(void 0, 0);
              },
              ss:
                dependencies.GameState.a.READY |
                dependencies.GameState.a.SIMULATING |
                dependencies.GameState.a.JUDGING,
            },
            '65|37': {
              down: () => {
                this._fpc.orbit(1, void 0);
              },
              up: () => {
                this._fpc.orbit(0, void 0);
              },
              ss:
                dependencies.GameState.a.READY |
                dependencies.GameState.a.SIMULATING |
                dependencies.GameState.a.JUDGING,
            },
            '80|27': {
              down: () => {
                this._evtBus.emit(dependencies.controlEvents.SWITCH, 'gaming');
              },
              ss: dependencies.GameState.a.READY,
            },
            '87|38': {
              down: () => {
                const t = this._fpc;
                (this._evtBus.emit(dependencies.controlEvents.SWITCH, 'gaming'),
                  t.active && t.gotoState1());
              },
              ss: dependencies.GameState.a.READY,
            },
          },
          {
            press: {
              fn: (t, e) => {
                if (isNaN(this._mouseX) || isNaN(this._mouseY))
                  return ((this._mouseX = t), (this._mouseY = e), void (this._needsUpdate = !0));
                !this._isValidSpot ||
                  this._needsUpdate ||
                  this._model.reqRespotCueball(this._spot, this._simulator);
              },
              ss: dependencies.GameState.a.READY,
            },
            drag: {
              fn: (t, e) => {
                this._fpc.moveLookAt(0.0025 * t, 0.0025 * e);
              },
              ss:
                dependencies.GameState.a.READY |
                dependencies.GameState.a.SIMULATING |
                dependencies.GameState.a.JUDGING,
            },
            move: {
              fn: (t, e) => {
                ((this._mouseX = t), (this._mouseY = e), (this._needsUpdate = !0));
              },
              ss: dependencies.GameState.a.READY,
            },
          },
        ));
    }
    activate() {
      super.activate();
      let t = this._simulator;
      return (this._gView.showRespotIcons(t.getCueBallPosition()), this);
    }
    _onActvate() {
      (super._onActvate(),
        (this._mouseX = NaN),
        (this._mouseY = NaN),
        (this._firstLookToSet = !1),
        (this._isValidSpot = !1));
      const t = this._playerCtls;
      for (let e = 0, i = t.length; e !== i; ++e) t[e] !== this._fpc && t[e].deactivate();
      (this._fpc.gotoState0(),
        (this._autoTipTimer = 0),
        this._needsFirstAutoTip && ((this._needsFirstAutoTip = !1), this._showTip(!0)),
        this._evtBus.emit(
          dependencies.controlEvents.CHANGE_CONTROL_GROUP,
          dependencies.ToolbarGroup.PAUSE,
        ));
    }
    _onDeactvate() {
      (this._gView.hideRespotIcons(), this._closeTip(), super._onDeactvate());
    }
    _showTip(t = !1) {
      ((this._tipPopped = !0),
        this._evtBus.emit(
          dependencies.controlEvents.MESSAGE,
          this._tipMsgId,
          'PLACE CUE BALL',
          'CLICK IN THE "D" AREA ON THE TABLE TO PLACE THE CUE BALL. PRESS <span class="kb">ESC</span>TO CANCEL.',
          dependencies.MessageKind.SUCCESS,
          t,
        ));
    }
    _closeTip() {
      (this._tipPopped &&
        ((this._tipPopped = !1),
        this._evtBus.emit(dependencies.controlEvents.MESSAGE, this._tipMsgId)),
        (this._autoTipTimer = 0));
    }
    _defaultUpdateHandler(t) {
      const e = this._fpc,
        i = this._gView;
      if (0 !== e.stateRatio) return this.updateGameBase(t.dt);
      if (!this._firstLookToSet) {
        this._firstLookToSet = !0;
        const t = this._model.getLocValidRegionGeoCenter();
        if (t) {
          dependencies.ballInHandVector
            .subVectors(t, e.bodyPosition)
            .normalize()
            .dot(e.azimuth.forward) < 0.84 && e.lookTo(t.x, t.z);
        }
      }
      if (!this._tipPopped && (this._autoTipTimer += t.dt) > 10) {
        this._showTip(!1);
        const t = this._model.getLocValidRegionGeoCenter();
        e.lookTo(t.x, t.z);
      }
      if (this._needsUpdate) {
        this._needsUpdate = !1;
        let e,
          s = i.respotIcon,
          n = this._spot;
        if (isNaN(this._mouseX) || isNaN(this._mouseY))
          return ((s.alpha = 0), (this._isValidSpot = !1), this.updateGameBase(t.dt));
        ((e = i.mouseCameraRay(this._mouseX, this._mouseY)),
          (s.alpha = 0.8),
          this._model.isValidInHandPositionUnderRay(e.origin, e.direction, this._simulator, n)
            ? (s.copyRGB(
                dependencies.UiColors.GREEN[0],
                dependencies.UiColors.GREEN[1],
                dependencies.UiColors.GREEN[2],
              ),
              (this._isValidSpot = !0))
            : (s.copyRGB(
                dependencies.UiColors.RED[0],
                dependencies.UiColors.RED[1],
                dependencies.UiColors.RED[2],
              ),
              (this._isValidSpot = !1)),
          s.copyPositionXYZ(n.x, 0, n.z));
      }
      return this.updateGameBase(t.dt);
    }
  };
}
