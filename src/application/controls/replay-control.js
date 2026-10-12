// Explicit live dependencies preserve initialization and shared state.
export default function createReplayControl(dependencies) {
  return class ReplayControl extends dependencies.ControlGroup {
    constructor(t, e, i, s) {
      (super(t, e, i),
        (this._displayUIGroup = i),
        (this._ui = null),
        (this._movieClip = s),
        (this._sceneId = ''),
        (this._parsedMcId = ''),
        (this._pocketCameraCtl = new dependencies.PocketCamera()),
        (this._camCtls = []));
      for (let t = 0, e = 5; t !== e; ++t)
        this._camCtls[t] = new dependencies.ReplayCameraController();
      ((this._activeCamCtlIndex = -1),
        (this._nActiveCamCtls = 0),
        (this._forceRender = !1),
        this._evtManager.initialize(
          {
            32: {
              down: () => {
                0 === this._movieClip.state ? this._play() : this._pause();
              },
              ss:
                dependencies.GameState.a.READY |
                dependencies.GameState.a.SIMULATING |
                dependencies.GameState.a.JUDGING,
            },
            83: {
              down: () => {
                (this._play(), (this._movieClip.timeScale = 0.25), this._ui.slomo(!0));
              },
              up: () => {
                ((this._movieClip.timeScale = 1), this._ui.slomo(!1));
              },
              ss:
                dependencies.GameState.a.READY |
                dependencies.GameState.a.SIMULATING |
                dependencies.GameState.a.JUDGING,
            },
            67: {
              down: () => {
                this._setCamCtlIndex(this._activeCamCtlIndex + 1);
              },
              ss:
                dependencies.GameState.a.READY |
                dependencies.GameState.a.SIMULATING |
                dependencies.GameState.a.JUDGING,
            },
            27: {
              down: () => {
                this._evtBus.emit(dependencies.controlEvents.SWITCH, 'gaming');
              },
              ss:
                dependencies.GameState.a.READY |
                dependencies.GameState.a.SIMULATING |
                dependencies.GameState.a.JUDGING,
            },
          },
          void 0,
        ),
        (this._onControlItemClick = (t, ...e) => {
          switch (t) {
            case 'close':
              this._evtBus.emit(dependencies.controlEvents.SWITCH, 'gaming');
              break;
            case 'pause':
              this._pause();
              break;
            case 'play':
              this._play();
              break;
            case 'seek':
              this._seek(...e);
          }
        }));
    }
    bind(t, e, i, s, n, r) {
      if ((super.bind(t, e, i, s, n, r), this._sceneId !== t.sceneId)) {
        this._sceneId = t.sceneId;
        let e = t.playArea.position,
          i = t.playArea.size,
          s = this._camCtls[0];
        (s.setPosition(e.x + 0.5 * i.w + 1.6, e.y + 1.2, e.z),
          s.setTargetPoint(e.x, e.y, e.z + 1e-5),
          this._pocketCameraCtl.resetWithPlayArea(t.playArea));
      }
    }
    bindUI(t, e) {
      this._ui = this._registerLocalUI('replayControl', dependencies.ReplayControlPanel, t, e);
    }
    unbind() {
      (super.unbind(), (this._ui = null));
    }
    _onActvate() {
      (super._onActvate(),
        this._evtBus.emit(
          dependencies.controlEvents.CHANGE_CONTROL_GROUP,
          dependencies.ToolbarGroup.NULL,
        ),
        this._ui.on(dependencies.dialogEvents.ITEM_CLICK, this._onControlItemClick));
      const t = this._playerCtls;
      for (let e = 0, i = t.length; e !== i; ++e) t[e].deactivate();
      this._parsedMcId !== this._movieClip.uniqueId &&
        ((this._parsedMcId = this._movieClip.uniqueId),
        this._parseMovieClip(),
        this._setCamCtlIndex(0, !0));
      let e = this._movieClip.getTrack('stick');
      if ((e.setActor(void 0), e.totalFrames > 0)) {
        let t = e.getHeader('stickName');
        t && e.setActor(this._gView.requireStick(t));
      }
      (this._play(0), (this._forceRender = !0));
    }
    _onDeactvate() {
      super._onDeactvate();
      let t = this._movieClip.getTrack('stick');
      (t.actor &&
        (this._gView.markStickAsUnused(t.actor), (t.actor.isVisible = !1), t.setActor(void 0)),
        this._fpc.markForceUpdate(),
        this._gView.syncBalls(this._simulator.getBalls(), this._simulator.evolution),
        this._ui.removeAllListeners());
    }
    _parseMovieClip() {
      let t,
        e = this._camCtls,
        i = this._pocketCameraCtl,
        s = dependencies.replayLongTracks,
        n = dependencies.replayPaths,
        r = dependencies.replayVector,
        a = this._gView.playArea,
        o = a.position.y,
        l = dependencies.replaySelection;
      ((this._nActiveCamCtls = 1), this._movieClip.getLongBTracks(2, s));
      for (let h = s.length - 1; h >= 0; --h)
        if (
          (dependencies.BallPath.bTrackToPath(s[h], n, 0.2, o),
          -1 !== (t = i.pocketCameraForPath(n, a, r)) && 0 === l[t])
        ) {
          if (
            ((l[t] = 1),
            e[this._nActiveCamCtls].setPosition(r.x, r.y, r.z).setTargetPath(n, o + 0.1),
            ++this._nActiveCamCtls >= e.length)
          )
            break;
        }
      ((s.length = 0), (n.length = 0));
      for (let t = 0, e = l.length; t !== e; ++t) l[t] = 0;
    }
    _play(t) {
      let e = this._movieClip;
      void 0 === t && e.playHead === e.duration ? this._movieClip.play(0) : this._movieClip.play(t);
    }
    _pause(t) {
      this._movieClip.pause(t);
    }
    _seek(t, e) {
      let i = this._movieClip;
      ((i.playHead = t * i.duration), 0 === i.state || e || this._pause());
    }
    _setCamCtlIndex(t, e = !1) {
      let i = this._nActiveCamCtls;
      (t >= i ? (t = -1) : t < -1 && (t = i - 1),
        (t !== this._activeCamCtlIndex || e) &&
          ((this._activeCamCtlIndex = t),
          (this._forceRender = !0),
          this._movieClip.getTrack('cam').setActor(-1 === t ? this._gView.camera : void 0)));
    }
    _defaultUpdateHandler(t) {
      let e = this._movieClip,
        i = !1,
        s = this._activeCamCtlIndex;
      if (e.needsUpdate || this._forceRender) {
        ((this._forceRender = !1), (i = !0), e.updatePlayback(t.dt));
        let n = this._ui,
          r = e.progress;
        if ((n.setProgress(r), (n.isPlaying = 0 !== e.state), -1 !== s)) {
          let t = this._gView.camera;
          this._camCtls[s].update(t, e.playHead);
        }
      }
      return i;
    }
  };
}
