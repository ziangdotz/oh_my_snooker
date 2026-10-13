// Explicit live dependencies preserve initialization and shared state.
export default function createMatchController(dependencies) {
  return class MatchController extends dependencies.ViewController {
    constructor(t) {
      (super(t),
        (this._model = new dependencies.SnookerGameModel()),
        (this._simulator = dependencies.localSimulator),
        (this._enterAnimation = null),
        (this._fpc = new dependencies.PassivePersonController()),
        (this._playerCtls = []),
        (this._movieClip = dependencies.localMovieClip),
        (this.selfUIGroup = 1),
        (this._subControl = Object.create(null)),
        (this._subControl.gaming = new dependencies.PlayerTurnControl(
          'gaming',
          this.selfUIGroup,
          this.selfUIGroup << 1,
          this._movieClip,
        )),
        (this._subControl.inHand = new dependencies.BallInHandControl(
          'inHand',
          this.selfUIGroup,
          this.selfUIGroup << 2,
        )),
        (this._subControl.replay = new dependencies.ReplayControl(
          'replay',
          this.selfUIGroup,
          this.selfUIGroup << 3,
          this._movieClip,
        )),
        (this._activeSubControl = null),
        (this._holdingSubControlName = void 0),
        (this._subControlEvtBus = new dependencies.EventEmitter.a()),
        (this._localUIInstances = []),
        (this._gameTime = 0),
        (this._paused = !1),
        (this._onSubControlSwitch = (t) => this._activateSubControl(t)),
        (this._onSubControlPopBox = (t) => this._uiLayer.popBox(t)),
        (this._onSubControlMessage = (t, ...e) => {
          0 === e.length
            ? this._uiLayer.closeMessage(t)
            : this._uiLayer.message(e[0], e[1], e[2], e[3], t);
        }),
        (this._onSubControlChangeControlGroup = (t) => {
          this._uiLayer.getRegisteredUI('gControl').setGroup(t);
        }),
        (this._onSubControlShottingStart = () => {
          this._uiLayer.getRegisteredUI('gControl').setGroup(dependencies.ToolbarGroup.PAUSE);
        }),
        (this._onInGameControlClick = (t) => {
          switch (t) {
            case 'pause':
              return (
                (this._paused = !0),
                void this._uiLayer
                  .popBox('pauseBox')
                  .on(dependencies.dialogEvents.ITEM_CLICK, this._onPauseItemClick)
                  .on(dependencies.dialogEvents.CLOSE, this._onPauseBoxClosed)
              );
            case 'replay':
              return void this._activateSubControl('replay');
          }
        }),
        (this._onPauseBoxClosed = () => {
          this._paused = !1;
        }),
        (this._onPauseItemClick = (t) => {
          switch (t) {
            case 'resume':
              return void this._uiLayer.closeBox('pauseBox');
            case 'restart':
              return void this._uiLayer.confirm(
                'Are you sure to restart the game?',
                this._onRestartConfirm,
              );
            case 'quit':
              return void this._uiLayer.confirm(
                'Are you sure to quit the game?',
                this._onQuitConfirm,
              );
            case 'controls_guide':
              return void this._uiLayer.popBox('controlsGuideBox');
            default:
              return;
          }
        }),
        (this._onRestartConfirm = () => {
          (this._paused &&
            dependencies.matchTelemetry('event', 'give_up', {
              event_category: 'ai',
              event_label: 'restart',
              value: 0,
            }),
            this._uiLayer.closeBox('pauseBox'),
            this._uiLayer.closeBox('singleResultBox'),
            this._uiLayer.closeBox('duoResultBox'),
            this._model.reqReset(this._simulator));
        }),
        (this._onQuitConfirm = () => {
          (this._paused &&
            dependencies.matchTelemetry('event', 'give_up', {
              event_category: 'ai',
              event_label: 'quit',
              value: 0,
            }),
            this._uiLayer.closeBox('pauseBox'),
            this.emit(dependencies.ApplicationEvents.CHANGE_CONTROLLER, 'home'));
        }),
        (this._onSimFirstKiss = (t) => {
          let e = this._fpc;
          e.isFollowing && e.follow(this._simulator.getBallAtIndex(t));
        }),
        (this._onSimPrepot = (t) => {
          let e = this._fpc;
          e.followingTarget === this._simulator.getBallAtIndex(t) && e.unfollow();
        }));
    }
    _registerUI() {
      let t = this._uiLayer;
      (t.hasRegisteredUI('gControl') || t.registerUI(new dependencies.Toolbar('gControl')),
        t.hasRegisteredUI('scoreBar') || t.registerUI(new dependencies.Scoreboard('scoreBar')),
        t.hasRegisteredBox('pauseBox') || t.registerBox(new dependencies.PauseDialog('pauseBox')),
        t.hasRegisteredBox('controlsGuideBox') ||
          t.registerBox(new dependencies.ControlsDialog('controlsGuideBox')),
        t.hasRegisteredBox('singleResultBox') ||
          t.registerBox(new dependencies.PracticeResultDialog('singleResultBox')),
        t.hasRegisteredBox('duoResultBox') ||
          t.registerBox(new dependencies.MatchResultDialog('duoResultBox')));
    }
    _bindUI() {
      let t = this._localUIInstances,
        e = this._uiLayer;
      (t.push(e.getRegisteredUI('scoreBar')), t.push(e.getRegisteredUI('gControl')));
      for (let e = 0, i = t.length; e !== i; ++e)
        'gControl' === t[e].id ? (t[e].group = 255) : (t[e].group = this.selfUIGroup);
      let i = this._subControl;
      for (let s in i) i[s].bindUI(e, t);
    }
    _unbindUI() {
      this._localUIInstances.length = 0;
    }
    _onModelLaunched(t) {
      super._onModelLaunched(t);
      let e = this._uiLayer.getRegisteredUI('scoreBar'),
        i = this._uiLayer.getRegisteredUI('gControl');
      (e.resetPlayers(this._model.players),
        i.setLocationLower(e.playerCount > 1),
        this._simulator
          .on(dependencies.SimulationEvents.a.SYNCHRONIZED, () => {
            this._onItemsReady();
          })
          .sync(t));
    }
    _onItemsReady() {
      if (
        this._gView.state !== dependencies.ViewState.READY ||
        this._simulator.state !== dependencies.SimulationState.a.SYNCHRONIZED
      )
        return;
      this._enterAnimation ||
        (this._enterAnimation = new dependencies.PropertyTween((t) => {
          var e = this._gView.camera;
          ((e.position.x = t.x),
            (e.position.y = t.y),
            (e.position.z = t.z),
            (e.lockedTarget.x = t.lookAtX),
            (e.lockedTarget.y = t.lookAtY),
            (e.lockedTarget.z = t.lookAtZ),
            this._gView.requireRender());
        }));
      this._createPlayerControllers();
      let s = this._movieClip;
      (s.getTrack('cam').setSource(this._gView.camera).setActor(this._gView.camera),
        s.syncBallTracks(this._simulator, this._gView.ballMeshes),
        this._gView.removeAllListeners(dependencies.ViewEvents.READY),
        this._simulator.removeAllListeners(dependencies.SimulationEvents.a.SYNCHRONIZED),
        this._model
          .on('response', (t) => {
            (this._onModelResponse(t),
              this._state === dependencies.ControllerState.PENDING &&
                this.emit(dependencies.ControllerEvents.READY));
          })
          .on('gstate_change', (t) => {
            this._onModelGStateChanged(t);
          })
          .reqReset(this._simulator));
    }
    _createPlayerControllers() {
      let t,
        e = this._model.players,
        i = this._playerCtls;
      for (let s = 0, n = e.length; s !== n; ++s) {
        let n = e[s];
        switch (n.type) {
          case dependencies.Player.a.PLAYER_TYPE_USER:
            (this._fpc.reset(
              this._gView,
              this._simulator,
              this._model,
              s,
              n.getInfoData('stickName'),
            ),
              i.push(this._fpc));
            break;
          case dependencies.Player.a.PLAYER_TYPE_AI:
            ((t = new dependencies.AiPersonController(this._model.getLocalAIInstance())).reset(
              this._gView,
              this._simulator,
              this._model,
              s,
              n.getInfoData('stickName'),
            ),
              i.push(t));
            break;
          default:
            throw new Error('Unhandled GPlayerType: ' + n.type);
        }
      }
      -1 === i.indexOf(this._fpc) &&
        (this._fpc.reset(this._gView, this._simulator, this._model, -1, void 0), i.push(this._fpc));
    }
    enter() {
      const t = this._gView.camera,
        e = this._model.getControllerSetting(),
        i = this._fpc,
        s = this._playerCtls;
      let n,
        r = {
          x: t.position.x,
          y: t.position.y,
          z: t.position.z,
          lookAtX: t.lockedTarget.x,
          lookAtY: t.lockedTarget.y,
          lookAtZ: t.lockedTarget.z,
        },
        a = this._model.getContext('playerIndex');
      for (let i = 0, n = s.length; i !== n; ++i)
        s[i].gPlayerIndex === a ? s[i].syncEnter(e, Math.PI) : s[i].syncEnter(e, t.position);
      for (let t in this._subControl)
        this._subControl[t].bind(
          this._gView,
          this._model,
          this._simulator,
          i,
          this._playerCtls,
          this._subControlEvtBus,
        );
      (((n = Object.create(null)).x = i.bodyPosition.x),
        (n.y = i.bodyPosition.y),
        (n.z = i.bodyPosition.z),
        (n.lookAtX = i.lockedTarget.x),
        (n.lookAtY = i.lockedTarget.y),
        (n.lookAtZ = i.lockedTarget.z));
      let o = r.x - n.x,
        l = r.y - n.y,
        h = r.z - n.z,
        c = Math.sqrt(o * o + l * l + h * h),
        d = Math.min(2, c / 3 + 0.8);
      (this._enterAnimation.reset(r, n, dependencies.Easing.Power1.easeInOut, d, 0.1).play(),
        this._simulator.evolution !== this._gView.ballSyncEvolution &&
          this._gView.syncBalls(this._simulator.getBalls(), this._simulator.evolution),
        super.enter());
    }
    updateEntering(t) {
      let e = this._enterAnimation;
      e.needsUpdate
        ? e.update(t.dt)
        : e.isComplete() && this.emit(dependencies.ControllerEvents.ENTERED);
    }
    action() {
      (super.action(),
        this._holdingSubControlName && this._activateSubControl(this._holdingSubControlName));
    }
    updateActing(t) {
      const e = this._localUIInstances;
      for (let i = 0, s = e.length; i !== s; ++i) e[i].needsUpdate && e[i].update(t.dt);
      this._paused ||
        ((this._gameTime += t.dt), this._activeSubControl.update(t) && this._gView.requireRender());
    }
    _bindEvents() {
      (super._bindEvents(),
        this._subControlEvtBus.on(dependencies.controlEvents.SWITCH, this._onSubControlSwitch),
        this._subControlEvtBus.on(dependencies.controlEvents.POP_BOX, this._onSubControlPopBox),
        this._subControlEvtBus.on(dependencies.controlEvents.MESSAGE, this._onSubControlMessage),
        this._subControlEvtBus.on(
          dependencies.controlEvents.CHANGE_CONTROL_GROUP,
          this._onSubControlChangeControlGroup,
        ),
        this._subControlEvtBus.on(
          dependencies.controlEvents.SHOTTING_START,
          this._onSubControlShottingStart,
        ));
      let t = this._simulator;
      (t.on(dependencies.CollisionEvents.a.FIRST_KISS, this._onSimFirstKiss),
        t.on(dependencies.CollisionEvents.a.PREPOT, this._onSimPrepot),
        this._uiLayer
          .getRegisteredUI('gControl')
          .on(dependencies.dialogEvents.ITEM_CLICK, this._onInGameControlClick));
    }
    _unbindEvents() {
      this._subControlEvtBus.removeAllListeners();
      let t = this._simulator;
      (t.removeAllListeners(dependencies.CollisionEvents.a.FIRST_KISS),
        t.removeAllListeners(dependencies.CollisionEvents.a.PREPOT),
        super._unbindEvents(),
        this._uiLayer
          .getRegisteredUI('gControl')
          .removeAllListeners(dependencies.dialogEvents.ITEM_CLICK));
    }
    _onModelGStateChanged(t) {
      for (let e in this._subControl) this._subControl[e].setGState(t);
    }
    _onModelResponse(t) {
      let e = this._model,
        i = this._simulator,
        s = this._gView,
        n = this._fpc;
      n.unfollow();
      let r = this._uiLayer,
        a = e.getContext('playerIndex'),
        o = e.getContext('ballOn'),
        l = e.getContext('inHand');
      r.getRegisteredUI('scoreBar').syncResults(e.players, a, o);
      let h = this._subControl;
      for (let t in h) h[t].onModelResponse(e);
      if ((i.evolution !== s.ballSyncEvolution && s.syncBalls(i.getBalls(), i.evolution), 0 === o))
        this._showResult();
      else {
        if (t)
          if (t.foulCode) {
            let e = dependencies.foulCodes.a.getFoulDescription(t.foulCode);
            this._uiLayer.message('FOUL', t.score + ': ' + e, dependencies.MessageKind.ERROR);
          } else if ('string' == typeof t)
            switch (t) {
              case 'restart':
                ((this._gameTime = 0), n.gotoState0());
                break;
              default:
                throw (console.error(t), new Error('unhandled ResponseMessage: '));
            }
        a === n.gPlayerIndex && 2 === l
          ? this._activateSubControl('inHand')
          : this._activateSubControl('gaming');
      }
    }
    _activateSubControl(t) {
      let e = !1;
      if (
        (!this._activeSubControl || this._activeSubControl.name !== t) &&
        ((e = !0),
        this._activeSubControl && this._activeSubControl.deactivate(),
        this._state !== dependencies.ControllerState.ACTING)
      )
        return ((this._holdingSubControlName = t), void (this._activeSubControl = null));
      if (
        ((this._holdingSubControlName = void 0), (this._activeSubControl = this._subControl[t]), e)
      ) {
        let t = this._localUIInstances,
          e = this._activeSubControl.displayUIGroup;
        for (let i = 0, s = t.length; i !== s; ++i)
          t[i].group & e ? t[i].activate() : t[i].deactivate();
      }
      this._activeSubControl.activate();
    }
    _showResult() {
      let t = Object.create(null);
      if (((t.time = this._gameTime), (t.players = this._model.players), t.players.length > 1)) {
        this._uiLayer
          .popBox('duoResultBox', t)
          .on(dependencies.dialogEvents.USER_CLOSE, this._onQuitConfirm)
          .on('retry', this._onRestartConfirm);
        let e = t.players[1];
        if (e.type === dependencies.Player.a.PLAYER_TYPE_AI) {
          let i = t.players[0],
            s = i.pts - e.penalty,
            n = e.pts - i.penalty > s ? 1 : 0;
          (dependencies.matchTelemetry('event', 'result', {
            event_category: 'ai',
            event_label: e.id,
            value: n,
          }),
            dependencies.matchTelemetry('event', 'timing_complete', {
              name: 'frame_time',
              value: Math.round(1e3 * this._gameTime),
              event_label: e.id,
            }));
        }
      } else
        (this._uiLayer
          .popBox('singleResultBox', t)
          .on(dependencies.dialogEvents.USER_CLOSE, this._onQuitConfirm)
          .on('retry', this._onRestartConfirm),
          dependencies.matchTelemetry('event', 'result', {
            event_category: 'ai',
            event_label: 'practice',
            value: 0,
          }),
          dependencies.matchTelemetry('event', 'timing_complete', {
            name: 'frame_time',
            value: Math.round(1e3 * this._gameTime),
            event_label: 'practice',
          }));
    }
    exit() {
      this._gView.cancelStickPendingCheck();
      const t = this._localUIInstances;
      for (let e = 0, i = t.length; e !== i; ++e) t[e].deactivate(!0);
      for (let t in this._subControl) this._subControl[t].unbind();
      this._activeSubControl = null;
      for (let t = 0, e = this._playerCtls.length; t !== e; ++t) this._playerCtls[t].deactivate();
      (this._model.release(), this._movieClip.releaseAllTargets().erase(), super.exit());
    }
    updateExiting(t) {
      const e = this._localUIInstances;
      let i = !0;
      for (let s = 0, n = e.length; s !== n; ++s)
        (e[s].isActive && e[s].deactivate(), e[s].needsUpdate && ((i = !1), e[s].update(t.dt)));
      i && this.emit(dependencies.ControllerEvents.EXITED);
    }
    free() {
      for (let t = 0, e = this._playerCtls.length; t !== e; ++t) this._playerCtls[t].release();
      ((this._playerCtls.length = 0), super.free());
    }
  };
}
