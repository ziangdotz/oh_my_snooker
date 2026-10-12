// Explicit live dependencies preserve initialization and shared state.
export default function createSnookerGameModel(dependencies) {
  return class SnookerGameModel extends dependencies.BaseGameModel {
    get gState() {
      return this._gState;
    }
    get players() {
      return this._players;
    }
    get nPlayers() {
      return this._players.length;
    }
    constructor() {
      (super(),
        (this._players = []),
        (this._gContext = dependencies.gameRecords.a.makeGContext()),
        (this._refResult = dependencies.gameRecords.a.makeRefResult()),
        (this._gState = dependencies.GameState.a.NO_GAME),
        (this._locRef = null));
    }
    release() {
      (this.removeAllListeners()._changeState(dependencies.GameState.a.NO_GAME),
        (this._locRef = null));
      for (let t = 0, e = this._players.length; t !== e; ++t) this._players[t].dispose();
      this._players.length = 0;
    }
    asyncLaunch(t) {
      (this._gState !== dependencies.GameState.a.NO_GAME && this.release(),
        this._changeState(dependencies.GameState.a.PENDING));
      let e = Object.create(null);
      ((e.sceneId = dependencies.localGameSettings.getGameDefineData('sceneId')),
        (e.ballSet = dependencies.localGameSettings.getGameDefineData('ballSet')),
        (e.ballRadius = dependencies.localGameSettings.getGameDefineData('ballRadius')),
        (e.ballMass = dependencies.localGameSettings.getGameDefineData('ballMass')),
        (e.stickName = []));
      let i = dependencies.localGameSettings.getGameDefineData('refId'),
        s = this._players;
      s.push(
        new dependencies.Player.a(
          dependencies.localGameSettings.getLocalUserInfo(),
          dependencies.Player.a.PLAYER_TYPE_USER,
        ),
      );
      let n = dependencies.aiRegistry.getSelectedAIInfo();
      n && s.push(new dependencies.Player.a(n, dependencies.Player.a.PLAYER_TYPE_AI));
      for (let t = 0, i = s.length; t !== i; ++t) {
        let i = s[t].getInfoData('stickName');
        -1 === e.stickName.indexOf(i) && e.stickName.push(i);
      }
      ((this._locRef = dependencies.refereeRegistry.a.getInstance(i)), t(e));
    }
    getLocalAIInstance() {
      return dependencies.aiRegistry.getSelectedAIInstance();
    }
    reqReset(t) {
      if (this._gState & (dependencies.GameState.a.ERROR | dependencies.GameState.a.NO_GAME))
        return void 0;
      let e = this._gState === dependencies.GameState.a.PENDING;
      return (
        this._changeState(dependencies.GameState.a.JUDGING),
        this._onResetResponse(t, e, dependencies.nextStartingPlayer++ % this._players.length, 0)
      );
    }
    _onResetResponse(t, e, i, s) {
      for (let t = 0, e = this._players.length; t !== e; ++t) this._players[t].clearScores();
      return (
        e && this._locRef.syncAreaWithSimulator(t),
        (this._gContext.playerIndex = i),
        (this._gContext.nRounds = s),
        this._locRef.resetGContext(this._gContext),
        this._response(t.reset(!0, !0), 'restart')
      );
    }
    reqEditorReset(t, e, i) {
      if (this._gState & (dependencies.GameState.a.SIMULATING | dependencies.GameState.a.READY))
        return (
          this._changeState(dependencies.GameState.a.JUDGING),
          (this._gContext.playerIndex = void 0 !== e ? e : 0),
          (this._gContext.nRounds = 0),
          (this._gContext.inHand = 1),
          (this._gContext.ballOn = void 0 !== i ? i : this._locRef.sysReservedBallOn),
          this._response(t.reset(!1, !0))
        );
    }
    reqRespotCueball(t, e) {
      if (this._gState === dependencies.GameState.a.READY)
        return (
          this._changeState(dependencies.GameState.a.JUDGING),
          this._locRef.projectionInSideValidRegion(t.x, t.y, t.z) &&
          ((t.y = e.spotY), !e.touchBalls(0, t))
            ? this._onRespotCueballResponse(e, t.x, t.y, t.z)
            : this._response(e)
        );
    }
    _onRespotCueballResponse(t, e, i, s) {
      return (
        t.respotIndexXYZ(0, e, i, s),
        this._gContext.inHand > 1 && (this._gContext.inHand = 1),
        this._response(t)
      );
    }
    reqRoundResult(t) {
      if (this._gState === dependencies.GameState.a.SIMULATING)
        return (
          this._changeState(dependencies.GameState.a.JUDGING),
          this._locRoundResultResponse(t)
        );
    }
    _locRoundResultResponse(t) {
      let e = this._refResult;
      this._locRef.checkResult(this._gContext, t, e);
      let i = this._gContext.playerIndex;
      return (
        this._gContext.nRounds++,
        e.score > 0
          ? ((this._players[i].pts += e.score),
            this._players[i].scoreCount++,
            (this._players[i].brk += e.score))
          : ((this._players[i].penalty += e.score),
            (this._players[i].brk = 0),
            (this._gContext.playerIndex = (i + 1) % this._players.length)),
        this._response(t, e)
      );
    }
    reportPlayerStroke(t) {
      return (
        this._gState === dependencies.GameState.a.READY &&
        t === this._gContext.playerIndex &&
        (this._players[t].shootingCount++,
        this._changeState(dependencies.GameState.a.SIMULATING),
        !0)
      );
    }
    _changeState(t) {
      this._gState !== t && ((this._gState = t), this.emit('gstate_change', t));
    }
    _response(t, e) {
      let i = 0;
      for (; 0 !== t.nAwakened; ) {
        if (++i > 200) throw new Error('too much ff(>200), must be some error!');
        t.step(0.1);
      }
      (t.save(),
        this._changeState(dependencies.GameState.a.READY),
        void 0 === e ? this.emit('response') : this.emit('response', e));
    }
    isValidInHandPositionUnderRay(t, e, i, s) {
      return (
        !!this._locRef &&
        !!this._locRef.intersectionRayValidRegionPlane(t, e, s) &&
        !!this._locRef.projectionInSideValidRegion(s.x, s.y, s.z) &&
        ((s.y = i.spotY), !i.touchBalls(0, s))
      );
    }
    getLocValidRegionGeoCenter() {
      return this._locRef ? this._locRef.validRegionGeoCenter : null;
    }
    pointProjectionOnTable(t, e, i) {
      return this._locRef.projectionOnTable(t, e, i);
    }
    getContext(t) {
      return this._gContext[t];
    }
    getPlayer(t) {
      return this._players[t];
    }
  };
}
