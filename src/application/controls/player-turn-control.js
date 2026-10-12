// Explicit live dependencies preserve initialization and shared state.
export default function createPlayerTurnControl(dependencies) {
  return class PlayerTurnControl extends dependencies.ControlGroup {
    constructor(t, e, i, s) {
      (super(t, e, i),
        (this._phxStrokeDelay = -1),
        (this._strokToStandUpDelay = -1),
        (this._tipMotion = new dependencies.StrokeMotion(-0.015)),
        (this._shortcutsBar = null),
        (this._needsPopNaviBox = 1),
        (this._isRecording = !1),
        (this._movieClip = s),
        (this._camTrack = s.getTrack('cam')),
        (this._stickTrack = s.getTrack('stick')),
        (this._ballTracks = []));
      for (let t = 0, e = s.maxBallTracks; t !== e; ++t) this._ballTracks[t] = s.getTrack('b' + t);
      (this._evtManager.initialize(
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
          '87|38': {
            down: () => {
              const t = this._fpc;
              t.active && t.gotoState1();
            },
            ss: dependencies.GameState.a.READY,
          },
          '40|83': {
            down: () => {
              this._fpc.gotoState0();
            },
            ss: dependencies.GameState.a.READY | dependencies.GameState.a.SIMULATING,
          },
          88: {
            down: () => {
              this._fpc.squatDown();
            },
            up: () => {
              this._fpc.standUp();
            },
            ss:
              dependencies.GameState.a.READY |
              dependencies.GameState.a.SIMULATING |
              dependencies.GameState.a.JUDGING,
          },
          82: {
            down: () => {
              this._fpc.resetLookAt();
            },
            ss:
              dependencies.GameState.a.READY |
              dependencies.GameState.a.SIMULATING |
              dependencies.GameState.a.JUDGING,
          },
          67: {
            down: () => {
              const t = this._fpc;
              t.clearStickTip(t.state === dependencies.PersonState.STATE_AIM);
            },
            ss: dependencies.GameState.a.READY,
          },
          80: {
            down: () => {
              this._fpc.active &&
                this._model.getContext('inHand') > 0 &&
                this._evtBus.emit(dependencies.controlEvents.SWITCH, 'inHand');
            },
            ss: dependencies.GameState.a.READY,
          },
          32: {
            down: () => {
              this._launchShot(this._fpc);
            },
            ss: dependencies.GameState.a.READY,
          },
          191: {
            down: () => {
              this._evtBus.emit(dependencies.controlEvents.POP_BOX, 'controlsGuideBox');
            },
            ss:
              dependencies.GameState.a.READY |
              dependencies.GameState.a.SIMULATING |
              dependencies.GameState.a.JUDGING,
          },
        },
        {
          drag: {
            fn: (t, e, i) => {
              const s = this._fpc;
              i
                ? s.state === dependencies.PersonState.STATE_AIM && s.moveStickTip(-t, -e)
                : s.moveLookAt(0.0025 * t, 0.0025 * e);
            },
            ss:
              dependencies.GameState.a.READY |
              dependencies.GameState.a.SIMULATING |
              dependencies.GameState.a.JUDGING,
          },
          wheel: {
            fn: (t, e) => {
              const i = this._fpc;
              i.state !== dependencies.PersonState.STATE_STAND &&
                (e ? i.moveStickAngleV(2e-4 * -t) : (i.strokePower += 5e-4 * t));
            },
            ss: dependencies.GameState.a.READY,
          },
        },
      ),
        (this._onFPCStateChangeStart = () => this._shortcutsBar.deactivate()),
        (this._onFPCStateChangeEnd = () => this._politeShowShortCuts()),
        (this._onShortCutsClick = () => {
          this._evtBus.emit(dependencies.controlEvents.POP_BOX, 'controlsGuideBox');
        }),
        (this._onAIShot = (t) => {
          this._launchShot(t);
        }));
    }
    setGState(t) {
      (super.setGState(t), t !== dependencies.GameState.a.READY && this._shortcutsBar.deactivate());
    }
    bindUI(t, e) {
      ((this._shortcutsBar = this._registerLocalUI(
        'shortcutsBar',
        dependencies.ShortcutBar,
        t,
        e,
        0,
      )),
        this._needsPopNaviBox > 0 &&
          !t.hasRegisteredBox('controlsNaviBox') &&
          t.registerBox(new dependencies.MessageDialog('controlsNaviBox')),
        t.hasRegisteredBox('controlsGuideBox') ||
          t.registerBox(new dependencies.ControlsDialog('controlsGuideBox')));
    }
    unbind() {
      (super.unbind(), (this._shortcutsBar = null));
    }
    _onModelResponseHandler(t) {
      let e = t.getContext('playerIndex') === this._fpc.gPlayerIndex,
        i = t.getContext('inHand');
      this._shortcutsBar.allowAim(e).allowPickUp(e && i > 0);
    }
    activate() {
      super.activate();
      const t = this._playerCtls,
        e = this._model.getContext('playerIndex');
      (this._tipMotion.reset(),
        (this.update = this._defaultUpdateHandler),
        (this._isRecording = !1));
      let i = null;
      for (let s = 0, n = t.length; s !== n; ++s)
        (t[s].gPlayerIndex === e ? (i = t[s]) : t[s].deactivate(),
          t[s].syncTipMotion(this._tipMotion));
      return (
        i && i.activate(),
        this._politeShowShortCuts(),
        this._movieClip.duration > 0.5
          ? this._evtBus.emit(
              dependencies.controlEvents.CHANGE_CONTROL_GROUP,
              dependencies.ToolbarGroup.PAUSE | dependencies.ToolbarGroup.REPLAY,
            )
          : this._evtBus.emit(
              dependencies.controlEvents.CHANGE_CONTROL_GROUP,
              dependencies.ToolbarGroup.PAUSE,
            ),
        this
      );
    }
    _onActvate() {
      super._onActvate();
      let t = this._fpc;
      (t.on(dependencies.PersonEvents.STATE_CHANGE_START, this._onFPCStateChangeStart),
        t.on(dependencies.PersonEvents.STATE_CHANGE_END, this._onFPCStateChangeEnd));
      let e = this._playerCtls;
      for (let i = 0, s = e.length; i !== s; ++i)
        e[i] !== t && e[i].on(dependencies.PersonEvents.AI_SHOT, this._onAIShot);
      (this._shortcutsBar.moreBn.addEventListener('click', this._onShortCutsClick, !1),
        (this._evtManager.enabled = !0),
        this._needsPopNaviBox > 0 &&
          (this._needsPopNaviBox--,
          setTimeout(() => {
            this._isActive
              ? this._evtBus.emit(dependencies.controlEvents.POP_BOX, 'controlsNaviBox')
              : this._needsPopNaviBox < 1 && (this._needsPopNaviBox = 1);
          }, 500)));
    }
    _onDeactvate() {
      super._onDeactvate();
      let t = this._fpc;
      (t.removeAllListeners(dependencies.PersonEvents.STATE_CHANGE_START),
        t.removeAllListeners(dependencies.PersonEvents.STATE_CHANGE_END));
      let e = this._playerCtls;
      for (let i = 0, s = e.length; i !== s; ++i)
        e[i] !== t && e[i].removeAllListeners(dependencies.PersonEvents.AI_SHOT);
      (this._shortcutsBar.moreBn.removeEventListener('click', this._onShortCutsClick, !1),
        (this._isRecording = !1),
        this._tipMotion.cancel());
    }
    _politeShowShortCuts() {
      let t = this._fpc;
      (this._shortcutsBar.setGroup(t.state),
        !this._isActive ||
          this._evtManager.state !== dependencies.GameState.a.READY ||
          (0 !== t.stateRatio && 1 !== t.stateRatio) ||
          this._shortcutsBar.activate());
    }
    _startRecording(t) {
      (this._movieClip.erase(),
        t.active && t.activeStickMesh
          ? this._stickTrack.setSource(t.stickCtl, t.activeStickMesh.stickName)
          : this._stickTrack.setSource(void 0),
        (this._isRecording = !0),
        this._recordBase(0),
        this._recordBalls(0));
    }
    _recordBase(t, e = !1) {
      let i = this._camTrack,
        s = this._stickTrack;
      (i.recordable && !i.record(t) && (this._isRecording = !1),
        s.recordable && !s.record(t, e) && (this._isRecording = !1));
    }
    _recordBalls(t) {
      let e,
        i = this._ballTracks;
      if (t > 0.1) this._isRecording = !1;
      else
        for (let s = 0, n = i.length; s !== n; ++s)
          (e = i[s]).recordable && !e.record(t) && (this._isRecording = !1);
    }
    _extendsBalls(t) {
      let e = this._ballTracks;
      for (let i = 0, s = e.length; i !== s; ++i) e[i].recordable && e[i].extendsLife(t);
      return this;
    }
    _launchShot(t) {
      const e = this._tipMotion;
      t.isReadyToStroke() &&
        e.isReady() &&
        this._model.reportPlayerStroke(t.gPlayerIndex) &&
        (this._evtBus.emit(dependencies.controlEvents.SHOTTING_START),
        t === this._fpc &&
          ((this._evtManager.enabled = !1), t.follow(this._simulator.getBallAtIndex(0))),
        (this._strokToStandUpDelay = 0.5),
        (this._phxStrokeDelay = e.launch(t)),
        (this.update = this._updateWithTipMotion),
        this._startRecording(t));
    }
    _updateWithTipMotion(t) {
      const e = this._gView,
        i = this._simulator,
        s = this._tipMotion;
      let n = t.dt;
      for (; s.needsUpdate; ) {
        let t = s.tick(n);
        n -= t;
        let r = !1;
        if (
          (-1 !== this._phxStrokeDelay &&
            (this._phxStrokeDelay <= t
              ? ((n += t - this._phxStrokeDelay),
                (s._tick -= t - this._phxStrokeDelay),
                (t = this._phxStrokeDelay),
                (r = !0),
                i.stroke(s.launchingController.getStrokeVars()),
                (this._evtManager.enabled = !0),
                (this._phxStrokeDelay = -1))
              : (this._phxStrokeDelay -= t),
            this._extendsBalls(t)),
          0 !== i.nAwakened)
        ) {
          let s = i.step(t);
          (this._isRecording && this._recordBalls(s), e.syncBalls(i.getBalls(), i.evolution));
        }
        if (
          (s.updateLength(i.getBallAtIndex(0)),
          s.launchingController.syncTipMotion(s),
          this.updateGameBase(t),
          this._isRecording && this._recordBase(t, r),
          n < 1e-6)
        )
          return !0;
      }
      if (0 !== i.nAwakened) {
        let t = i.step(n);
        (this._isRecording && this._recordBalls(t), e.syncBalls(i.getBalls(), i.evolution));
      }
      return (
        (this._strokToStandUpDelay -= n) < 0 &&
          (s.launchingController.gotoState0(), (this.update = this._defaultUpdateHandler)),
        this.updateGameBase(n),
        this._isRecording && this._recordBase(n),
        !0
      );
    }
    _defaultUpdateHandler(t) {
      const e = this._gView,
        i = this._simulator,
        s = this._fpc,
        n = t.dt;
      let r = !1,
        a = !1,
        o = this._tipMotion;
      if (0 !== i.nAwakened) {
        let t = i.step(n);
        (this._isRecording && this._recordBalls(t),
          e.syncBalls(i.getBalls(), i.evolution),
          (r = !0));
      }
      if ((this.updateGameBase(n) && (this._isRecording && this._recordBase(n), (a = !0)), !r)) {
        if (
          s.state === dependencies.PersonState.STATE_AIM &&
          0 !== s.nPhysicsChanged &&
          this._tipMotion.isReady()
        ) {
          s.nPhysicsChanged = 0;
          let t = i.predict(s.getStrokeVars(), 1.6);
          e.gunsight.syncPrediction(t, this._model.getContext('ballOn'), 1.6);
        }
        o.launchingController &&
          0 === o.launchingController.stateRatio &&
          (o.cancel(),
          s.unfollow(),
          (this._isRecording = !1),
          this._movieClip.saveRecording(),
          this._model.reqRoundResult(i));
      }
      return a;
    }
  };
}
