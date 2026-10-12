export default function ballSurfaceContactModule(module, exports, loadModule) {
  const Contact = loadModule('domain/physics/contact'),
    MatrixThree = loadModule('domain/math/matrix-three'),
    VectorThree = loadModule('domain/math/vector-three'),
    a = VectorThree.EPSILON;
  module.exports = class BallSurfaceContact extends Contact {
    get armJ() {
      return (this.armDirty && this.updateForceArm(), this._armJ);
    }
    get armLenJ() {
      return (this.armDirty && this.updateForceArm(), this._armLenJ);
    }
    constructor(t, e) {
      (super(t, e),
        (this.isSS = !0),
        (this.cdRoundJ = NaN),
        (this.vChangedCountJ = -1),
        (this._armJ = new VectorThree(0, 0, 0)),
        (this._armLenJ = 0),
        (this.restingCheckPosJ = new VectorThree(0, 0, 0)),
        (this.relVelWJ = new VectorThree()),
        (this.m_imp2LocVel2 = new MatrixThree()),
        (this.normalUpdateHandler = () => {
          ((this.normalDirty = !1), this._normal.subVectors(this.bi.position, this.bj.position));
          let t = this._normal.length();
          t < a ? this._normal.set(0, 1, 0) : this._normal.scale(1 / t);
        }),
        (this.rollingFriction = 0));
    }
    isOutdated() {
      return (
        this.cdRoundI !== this.bi.cdRound ||
        this.cdRoundJ !== this.bj.cdRound ||
        this.markedAsKilled
      );
    }
    startResting() {
      (this.restingCheckPosJ.copy(this.bj.position), super.startResting());
    }
    needsUpdateResting() {
      return (
        !this.restingCheckPosI.almostEquals(this.bi.position) ||
        !this.restingCheckPosJ.almostEquals(this.bj.position)
      );
    }
    resetRestingWithPeneNormal(t, e) {
      (this.restingCheckPosJ.copy(this.bj.position), super.resetRestingWithPeneNormal(t, e));
    }
    resetPendingWithToiPene(t, e, i, s) {
      (this.resetWithBiBj(t, e),
        (this.toi = i),
        (this._penetration = s > -a ? 0 : s),
        (this.cdRoundI = t.cdRound),
        (this.cdRoundJ = e.cdRound),
        (this.life = 0),
        this.markNormalDirty());
    }
    stopResting() {
      (this.bi.wakeUp(), this.bj.wakeUp());
    }
    updateForceArm() {
      ((this.armDirty = !1),
        (this._armLenI = this.bi.radius),
        (this._armLenJ = this.bj.radius),
        this._armI.scaleVector(-this._armLenI, this.normal),
        this._armJ.scaleVector(this._armLenJ, this.normal));
    }
    getCloseSpeed() {
      return (
        (this.relVelDirty ||
          this.vChangedCountI !== this.bi.vChangedCount ||
          this.vChangedCountJ !== this.bj.vChangedCount) &&
          this.updateRelVelocity(),
        this._closeSpeed
      );
    }
    getRelativeVelocity() {
      return (
        (this.relVelDirty ||
          this.vChangedCountI !== this.bi.vChangedCount ||
          this.vChangedCountJ !== this.bj.vChangedCount) &&
          this.updateRelVelocity(),
        this.relativeVelW
      );
    }
    updateRelVelocity() {
      ((this.vChangedCountI = this.bi.vChangedCount),
        (this.vChangedCountJ = this.bj.vChangedCount),
        (this.relVelDirty = !1),
        this.relativeVelW.setCrossThenAdd(this.bi.w, this.armI, this.bi.v),
        this.relativeVelW.sub(this.relVelWJ.setCrossThenAdd(this.bj.w, this.armJ, this.bj.v)),
        (this._closeSpeed = this.relativeVelW.dot(this.normal)));
    }
    updateImpulseTransform() {
      this.impulseTransformDirty = !1;
      let t = this._m_imp2LocVel,
        e = this.skewSymmetric.setSkewSymmetric(this.armI),
        i = this.m_imp2WorVel.copy(e);
      (i.multiply(this.bi.invInertia),
        i.multiply(e),
        i.multiplyScalar(-1),
        e.setSkewSymmetric(this.armJ));
      let s = this.m_imp2LocVel2.copy(e);
      (s.multiply(this.bj.invInertia),
        s.multiply(e),
        s.multiplyScalar(-1),
        i.add(s),
        t.copy(this.spaceTransformW2L),
        t.multiply(i),
        t.multiply(this.spaceTransformL2W),
        t.addToDiagonal(this.bi.invMass + this.bj.invMass),
        this._m_locVel2Imp.setInverse(t));
    }
  };
}
