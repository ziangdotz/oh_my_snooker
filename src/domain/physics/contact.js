export default function contactModule(module, exports, loadModule) {
  'use strict';
  const VectorThree = loadModule('domain/math/vector-three'),
    MatrixThree = loadModule('domain/math/matrix-three'),
    r = VectorThree.EPSILON,
    a = new VectorThree(),
    o = new VectorThree();
  class Contact {
    get label() {
      return this.idi + '->' + this.idj;
    }
    get penetration() {
      return this._penetration;
    }
    get normal() {
      return (this.normalDirty && this.normalUpdateHandler(), this._normal);
    }
    get bounceThreshold() {
      return (
        this.bounceThresholdDirty &&
          ((this.bounceThresholdDirty = !1), (this._bounceThreshold = Contact.gt.dot(this.normal))),
        this._bounceThreshold
      );
    }
    get armI() {
      return (this.armDirty && this.updateForceArm(), this._armI);
    }
    get armLenI() {
      return (this.armDirty && this.updateForceArm(), this._armLenI);
    }
    get spaceTransformL2W() {
      return (this.spaceTransformDirty && this.updateSpaceTransform(), this._m_loc2Wor);
    }
    get spaceTransformW2L() {
      return (this.spaceTransformDirty && this.updateSpaceTransform(), this._m_wor2Loc);
    }
    get transformImp2LocVel() {
      return (this.impulseTransformDirty && this.updateImpulseTransform(), this._m_imp2LocVel);
    }
    get transformLocVel2Imp() {
      return (this.impulseTransformDirty && this.updateImpulseTransform(), this._m_locVel2Imp);
    }
    constructor(t, e) {
      ((this.__weakParent = t),
        (this.poolIndex = t ? e : -1),
        (this.inUse = !1),
        (this.next = null),
        (this.prev = null),
        (this.isSS = !1),
        (this.markedAsKilled = !1),
        (this.bi = null),
        (this.bj = null),
        (this.idi = NaN),
        (this.idj = NaN),
        (this.cdRoundI = NaN),
        (this.restitution = 0),
        (this.friction = 0),
        (this.toi = 0),
        (this.life = 0),
        (this._penetration = 0),
        (this.restingCheckPosI = new VectorThree(0, 0, 0)),
        (this.normalUpdateHandler = null),
        (this.armDirty = !1),
        (this._armI = new VectorThree(0, 0, 0)),
        (this._armLenI = 0),
        (this.bounceThresholdDirty = !1),
        (this._bounceThreshold = 0),
        (this.relVelDirty = !1),
        (this._closeSpeed = 0),
        (this.relativeVelW = new VectorThree()),
        (this.vChangedCountI = -1),
        (this.spaceTransformDirty = !1),
        (this._m_loc2Wor = new MatrixThree()),
        (this._m_wor2Loc = new MatrixThree()),
        (this.impulseTransformDirty = !1),
        (this._m_locVel2Imp = new MatrixThree()),
        (this._m_imp2LocVel = new MatrixThree()),
        (this.m_imp2WorVel = new MatrixThree()),
        (this.skewSymmetric = new MatrixThree()),
        (this.normalDirty = !1),
        (this._normal = new VectorThree(0, 0, 0)),
        (this.rollingFriction = 0.013));
    }
    toString() {
      return (
        this.label +
        ': {toi:' +
        this.toi +
        ', life:' +
        this.life +
        ', outdated:' +
        this.isOutdated() +
        ', isSS:' +
        this.isSS +
        '}'
      );
    }
    free() {
      ((this.bi = null),
        (this.bj = null),
        (this.inUse = !1),
        this.__weakParent.freeIndex(this.poolIndex));
    }
    dispose() {
      ((this.bi = null), (this.bj = null), (this.inUse = !1), (this.__weakParent = null));
    }
    activate() {
      return (
        (this.inUse = !0),
        (this.life = 0),
        (this.toi = Number.MAX_VALUE),
        (this._penetration = 0),
        this
      );
    }
    isOutdated() {
      return this.cdRoundI !== this.bi.cdRound || this.markedAsKilled;
    }
    startResting() {
      let t = this.bi,
        e = this.bj;
      (this.restingCheckPosI.copy(t.position),
        (this.restitution = t.restitution > e.restitution ? e.restitution : t.restitution),
        (this.friction = t.friction > e.friction ? t.friction : e.friction));
    }
    needsUpdateResting() {
      return !this.restingCheckPosI.almostEquals(this.bi.position);
    }
    resetRestingWithPeneNormal(t, e) {
      ((this._penetration = t > -r ? 0 : t),
        this.restingCheckPosI.copy(this.bi.position),
        (this.normalDirty = !1),
        this._normal.almostEquals(e) || (this._normal.copy(e), this.markNormalRelatedDirty()));
    }
    stopResting() {
      this.bi.wakeUp();
    }
    resetWithBiBj(t, e) {
      (this.bi === t && this.bj === e) ||
        ((this.bi = t),
        (this.idi = t.uid),
        (this.bj = e),
        (this.idj = e.uid),
        this.markObjectChanged());
    }
    getCloseSpeed() {
      return (
        (this.relVelDirty || this.vChangedCountI !== this.bi.vChangedCount) &&
          this.updateRelVelocity(),
        this._closeSpeed
      );
    }
    getRelativeVelocity() {
      return (
        (this.relVelDirty || this.vChangedCountI !== this.bi.vChangedCount) &&
          this.updateRelVelocity(),
        this.relativeVelW
      );
    }
    updateRelVelocity() {
      ((this.vChangedCountI = this.bi.vChangedCount),
        (this.relVelDirty = !1),
        this.relativeVelW.setCrossThenAdd(this.bi.w, this.armI, this.bi.v),
        (this._closeSpeed = this.relativeVelW.dot(this.normal)));
    }
    markNormalRelatedDirty() {
      ((this.bounceThresholdDirty = !0),
        (this.spaceTransformDirty = !0),
        (this.armDirty = !0),
        (this.relVelDirty = !0),
        (this.impulseTransformDirty = !0));
    }
    markNormalDirty() {
      ((this.normalDirty = !0), this.markNormalRelatedDirty());
    }
    markObjectChanged() {
      ((this.armDirty = !0), (this.relVelDirty = !0), (this.impulseTransformDirty = !0));
    }
    updateForceArm() {
      ((this.armDirty = !1), console.log('BaseContact.updateForceArm: Overwrite me!!!'));
    }
    updateSpaceTransform() {
      this.spaceTransformDirty = !1;
      let t = this.normal;
      if (Math.abs(t.x) > Math.abs(t.y)) {
        let e = 1 / Math.sqrt(t.z * t.z + t.x * t.x);
        ((a.x = t.z * e),
          (a.y = 0),
          (a.z = -t.x * e),
          (o.x = t.y * a.z),
          (o.y = t.z * a.x - t.x * a.z),
          (o.z = -t.y * a.x));
      } else {
        let e = 1 / Math.sqrt(t.z * t.z + t.y * t.y);
        ((a.x = 0),
          (a.y = -t.z * e),
          (a.z = t.y * e),
          (o.x = t.y * a.z - t.z * a.y),
          (o.y = -t.x * a.z),
          (o.z = t.x * a.y));
      }
      (this._m_loc2Wor.setComponents(t, a, o), this._m_wor2Loc.setTranspose(this._m_loc2Wor));
    }
    updateImpulseTransform() {
      this.impulseTransformDirty = !1;
      let t = this._m_imp2LocVel,
        e = this.skewSymmetric.setSkewSymmetric(this.armI),
        i = this.m_imp2WorVel.copy(e);
      (i.multiply(this.bi.invInertia),
        i.multiply(e),
        i.multiplyScalar(-1),
        t.copy(this.spaceTransformW2L),
        t.multiply(i),
        t.multiply(this.spaceTransformL2W),
        t.addToDiagonal(this.bi.invMass),
        this._m_locVel2Imp.setInverse(t));
    }
  }
  ((Contact.gt = new VectorThree()), (module.exports = Contact));
}
