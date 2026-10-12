export default function worldClientModule(module, exports, loadModule) {
  const World = loadModule('domain/physics/world'),
    n = (loadModule('domain/physics/ball-motion'), loadModule('domain/physics/contact-solver')),
    PredictionSolver = loadModule('domain/physics/prediction-solver'),
    VectorThree = loadModule('domain/math/vector-three'),
    o = () => {},
    l = function (t) {
      let e,
        i,
        s = this.predictionCtx;
      if (s.impactOccured || t.bj.ground) return !1;
      (t.idi === s._b1.uid ? ((e = t.bi), (i = t.bj)) : ((e = t.bj), (i = t.bi)),
        (this.meshBody = this.simplifiedMeshBody),
        s.onImpact(t.isSS ? i : null));
      let n = this.balls;
      for (let t = 0, s = n.length; t !== s; ++t)
        n[t] != e && n[t] != i && this.inactivateBall(n[t]);
      return !0;
    };
  class h {
    constructor() {
      ((this.p0 = new VectorThree(0, 0, 0)),
        (this.p1 = new VectorThree(0, 0, 0)),
        (this.cue = new VectorThree(0, 0, 0)),
        (this.cueVSq = 0),
        (this.impactV1 = new VectorThree(0, 0, 0)),
        (this.targetNumber = 0),
        (this.p2 = new VectorThree(0, 0, 0)),
        (this.target = new VectorThree(0, 0, 0)),
        (this.targetVSq = 0),
        (this._b1 = null),
        (this._b2 = null),
        (this.impactOccured = !1),
        (this.hasImpactTarget = !1));
    }
    onPredictionStart(t) {
      ((this._b1 = t),
        (this._b2 = null),
        (this.impactOccured = !1),
        (this.hasImpactTarget = !1),
        this.p0.copy(this._b1.position),
        this.cue.copy(this.p0));
    }
    onStepped() {
      let t = this.cue.distanceTo(this._b1.position);
      return (this.cue.copy(this._b1.position), t);
    }
    onImpact(t) {
      ((this.impactOccured = !0),
        this.p1.copy(this._b1.position),
        (this._b1.collisionMask = 12),
        t &&
          ((this.hasImpactTarget = !0),
          (this._b2 = t),
          this.p2.copy(t.position),
          (t.collisionMask = 12),
          (this.targetNumber = t.number)));
    }
    onPredictionEnd() {
      ((this.cueVSq = this._b1.vSq),
        (this._b1.collisionMask = 0),
        (this._b1 = null),
        this._b2 &&
          (this.target.copy(this._b2.position),
          (this.targetVSq = this._b2.vSq),
          (this._b2.collisionMask = 0),
          (this._b2 = null)));
    }
  }
  module.exports = class WorldClient extends World {
    constructor() {
      (super(),
        (this.predictionCtx = new h()),
        (this.predictorSolver = PredictionSolver.sharedInstance),
        (this._serialData = World.makeSerialData()),
        (this.predictorCallback = l.bind(this)),
        (this.simplifiedMeshBody = null));
    }
    setMeshBody(t) {
      (super.setMeshBody(t),
        (this.originMeshBody = t),
        (this.simplifiedMeshBody = t.slice('ground')));
    }
    emptyMeshBody() {
      ((this.simplifiedMeshBody = null), (this.originMeshBody = null), super.emptyMeshBody());
    }
    save() {
      this.serialize(this._serialData);
    }
    restore(t) {
      (this._environmentReady || this._rebuildEnvironment(),
        void 0 !== t && World.copySerialDataAToB(t, this._serialData),
        this.deserialize(this._serialData));
    }
    step(t) {
      let e = super.step(t),
        i = this.balls,
        s = this.accumulator;
      s > this._stepSize && (s = 0);
      for (let t = 0, e = i.length; t !== e; ++t) i[t].syncStates(s);
      return e;
    }
    predict(t, e, i) {
      let s = this.touchPresolveHandler,
        r = this.outOfBoundsHandler,
        a = this.predictionCtx,
        l = 0,
        h = 0;
      for (
        this.solver = this.predictorSolver,
          this.touchPresolveHandler = o,
          this.outOfBoundsHandler = o,
          this.useStrictMode = !1,
          this.predictorSolver.reset(this.predictorCallback),
          a.onPredictionStart(t),
          this.shoot(t, e),
          a.impactV1.copy(t.v);
        h < i &&
        ++l < 70 &&
        ((this.predictorSolver.interrupt = !1),
        this.internalStep(),
        (h += a.onStepped()),
        a.impactOccured || a.impactV1.copy(t.v),
        !(t.getMotion() < 1));

      );
      return (
        (this.meshBody = this.originMeshBody),
        (this.touchPresolveHandler = s),
        (this.outOfBoundsHandler = r),
        this.predictorSolver.reset(null),
        (this.solver = n.sharedInstance),
        (this.useStrictMode = !0),
        a.onPredictionEnd(),
        this.restore(),
        a
      );
    }
  };
}
