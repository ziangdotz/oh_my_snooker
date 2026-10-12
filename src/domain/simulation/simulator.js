export default function simulatorModule(module, exports, loadModule) {
  const EventEmitter = loadModule('shared/events/event-emitter'),
    SimulationState = loadModule('domain/simulation/simulation-state'),
    SimulationEvents = loadModule('domain/simulation/simulation-events'),
    CollisionEvents = loadModule('domain/physics/collision-events'),
    SnookerBall = loadModule('domain/simulation/snooker-ball'),
    SceneDefinitions = loadModule('domain/scene/scene-definitions'),
    h = loadModule('domain/physics/physics-api').Vec3.EPSILON,
    GameRecords = loadModule('domain/game/game-records');
  module.exports = class Simulator extends EventEmitter {
    get sceneId() {
      return this._sceneId;
    }
    get id() {
      return this._id;
    }
    get state() {
      return this._state;
    }
    get nAwakened() {
      return this._nPhxAwakened;
    }
    get ground() {
      return this._world.meshBody.ground;
    }
    get sidePolyGroups() {
      return this._world.meshBody.getGroupByName('side');
    }
    get ballRadius() {
      return this._syncList.ballRadius;
    }
    get spotY() {
      return this._spotY;
    }
    get evolution() {
      return this._world.evolution;
    }
    get stepSize() {
      return this._world.stepSize;
    }
    get result() {
      return this._result;
    }
    constructor(t, e, i) {
      (super(),
        (this._id = t + ''),
        (this._world = e),
        (this._sceneId = ''),
        (this._mbCache = i),
        (this._spotY = NaN),
        (this._syncList = Object.create(null)),
        (this._syncList.ballSet = []),
        (this._syncList.ballRadius = 0),
        (this._syncList.ballMass = 0),
        (this._syncList.sceneId = ''),
        (this._nPhxAwakened = 0),
        (this._state = NaN),
        this._setState(SimulationState.NO_SCENE),
        (this._result = GameRecords.makeSimulatorResult()),
        (this._onTouch = (t) => {
          const e = this._result;
          if (t.isSS) {
            let i = null;
            (0 === t.bi.number
              ? (e.nKissed++, (i = t.bj))
              : 0 === t.bj.number && (e.nKissed++, (i = t.bi)),
              1 === e.nKissed &&
                null !== i &&
                ((e.firstKissIndex = i.index),
                this.emit(CollisionEvents.FIRST_KISS, e.firstKissIndex)));
          } else if (t.bj.end) {
            let i = t.bi;
            (this._world.inactivateBall(i),
              e.pottedIndices.push(i.index),
              this.emit(CollisionEvents.POTTED, i.index));
          } else t.bj.tunnel && this.emit(CollisionEvents.PREPOT, t.bi.index);
        }),
        (this._onOutOfBounds = (t) => {
          (this._result.outOfBoundsIndices.push(t.index),
            this.emit(CollisionEvents.OUT_OF_BOUNDS, t.index));
        }),
        (this._checkSyncTimerId = -1),
        (this._onCheckSyncTimeout = () => {
          ((this._checkSyncTimerId = -1), this._checkSyncList());
        }),
        this._world.onTouchPresolve(this._onTouch),
        this._world.onOutOfBounds(this._onOutOfBounds));
    }
    sync(t) {
      this._setState(SimulationState.LOADING);
      let e = this._syncList;
      if ((void 0 !== t.sceneId && (e.sceneId = t.sceneId), void 0 !== t.ballSet)) {
        for (let i = 0, s = t.ballSet.length; i !== s; ++i) e.ballSet[i] = t.ballSet[i];
        e.ballSet.length = t.ballSet.length;
      }
      (void 0 !== t.ballRadius && (e.ballRadius = t.ballRadius),
        void 0 !== t.ballMass && (e.ballMass = t.ballMass),
        -1 === this._checkSyncTimerId && this._checkSyncList());
    }
    _checkSyncList() {
      const t = this._syncList;
      if (t.sceneId !== this._sceneId) {
        const e = SceneDefinitions[t.sceneId];
        if (!e) return this._err('env not found: "' + t.sceneId + '"');
        const i = e.rgb;
        if (!i || 0 === i.length) return this._err('rgb not found in env: "' + t.sceneId + '"');
        const s = this._mbCache.getCache(i);
        if (!s) return void (this._checkSyncTimerId = setTimeout(this._onCheckSyncTimeout, 100));
        if (s.isError) return this._err(s.message);
        (this._world.emptyMeshBody(), this._world.setMeshBody(s), (this._sceneId = t.sceneId));
      }
      const e = t.ballSet;
      let i = this._world.balls;
      if (
        0 === i.length ||
        i.length !== e.length / 3 ||
        i[0].radius !== t.ballRadius ||
        i[0].mass !== t.ballMass
      ) {
        if ((this._world.emptyBalls(), t.ballRadius <= 0 || t.ballMass <= 0))
          return this._err(
            'invalid simulator sync opts: mass, radius: ' + t.ballMass + ', ' + t.ballRadius,
          );
        if (0 === e.length || e.length % 3 != 0)
          return this._err('invalid simulator sync opts: ballSet.length: ' + e.length);
        let i = this._world.meshBody.ground;
        this._spotY = i.centerPosition.y + t.ballRadius;
        for (let i = 0, s = e.length / 3; i !== s; ++i) {
          let s = new SnookerBall(
            e[3 * i],
            t.ballRadius,
            t.ballMass,
            e[3 * i + 1],
            this._spotY,
            e[3 * i + 2],
            i,
          );
          this._world.addBall(s);
        }
      }
      (this._setState(SimulationState.SYNCHRONIZED), this.emit(SimulationEvents.SYNCHRONIZED));
    }
    reset(t, e) {
      if (t) {
        let t = this._world.balls;
        for (let e = 0, i = t.length; e !== i; ++e) this.resetBallPosition(t[e], t[e].spot);
      }
      return (e && this.clearResult(), this._world.reset(), this);
    }
    getBalls() {
      return this._world.balls;
    }
    getBallAtIndex(t) {
      return this._world.balls[t];
    }
    getCueBallPosition() {
      return this._world.balls[0].position;
    }
    respotIndexDefault(t) {
      const e = this._world.balls;
      this.resetBallPosition(e[t], e[t].spot);
    }
    respotIndexXYZ(t, e, i, s) {
      const n = this._world.balls;
      this.resetBallXYZ(n[t], e, i, s);
    }
    resetBallPosition(t, e) {
      e
        ? this.resetBallXYZ(t, e.x, e.y, e.z)
        : (this._world.inactivateBall(t), this._nPhxAwakened++);
    }
    step(t) {
      let e = this._world.step(t);
      return ((this._nPhxAwakened = this._world.nAwakened), e);
    }
    save() {
      this._world.save();
    }
    predict(t, e) {
      return this._world.predict(this._world.balls[0], t, e);
    }
    getPredictionCtx() {
      return this._world.predictionCtx;
    }
    stroke(t) {
      (this.clearResult(), this._world.shoot(this._world.balls[0], t), this._nPhxAwakened++);
    }
    clearResult() {
      const t = this._result;
      ((t.nKissed = 0),
        (t.firstKissIndex = 0),
        (t.pottedIndices.length = 0),
        (t.outOfBoundsIndices.length = 0));
    }
    touchBalls(t, e, i) {
      void 0 === i && (i = 1.02 * this.ballRadius);
      const s = i + this.ballRadius,
        n = s * s,
        r = this._world.balls,
        a = h;
      let o;
      for (let i = 0, s = r.length; i !== s; ++i)
        if (((o = r[i]), i !== t && o.active && o.position.distanceToSq(e) < n - a)) return !0;
      return !1;
    }
    _setState(t) {
      this._state !== t && (this._state = t);
    }
    _err(t) {
      (this._setState(SimulationState.ERROR), this.emit(SimulationEvents.ERROR, new Error(t)));
    }
    resetBallXYZ(t, e, i, s) {
      (t.reset(e, i, s), (t.active = !0), this._nPhxAwakened++);
    }
  };
}
