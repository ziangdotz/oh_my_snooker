export default function ballContactModule(module, exports, loadModule) {
  const Contact = loadModule('domain/physics/contact'),
    VectorThree = loadModule('domain/math/vector-three'),
    r = VectorThree.EPSILON;
  module.exports = class BallContact extends Contact {
    constructor(t, e) {
      (super(t, e),
        (this.contactPoint = new VectorThree(0, 0, 0)),
        (this.normalUpdateCP = () => {
          if (((this.normalDirty = !1), this.bj.hasCustomNormalHandler))
            this.bj.customNormalHandler(this.contactPoint, this._normal);
          else {
            this._normal.subVectors(this.bi.position, this.contactPoint);
            let t = this._normal.length();
            t < r ? this._normal.copy(this.bj.normal) : this._normal.scale(1 / t);
          }
        }));
    }
    resetRestingWithPeneCP(t, e) {
      ((this._penetration = t > -r ? 0 : t),
        this.restingCheckPosI.copy(this.bi.position),
        this.contactPoint.copy(e),
        (this.normalUpdateHandler = this.normalUpdateCP),
        this.markNormalDirty());
    }
    updateRelVelocity() {
      ((this.vChangedCountI = this.bi.vChangedCount),
        (this.relVelDirty = !1),
        this.relativeVelW.setCrossThenAdd(this.bi.w, this.armI, this.bi.v),
        (this._closeSpeed = this.relativeVelW.dot(this.normal)));
    }
    resetPendingWithToiPeneNormal(t, e, i, s, n) {
      (this.resetWithBiBj(t, e),
        (this.toi = i),
        (this._penetration = s > -r ? 0 : s),
        (this.cdRoundI = t.cdRound),
        (this.life = 0),
        (this.normalDirty = !1),
        this._normal.almostEquals(n) || (this._normal.copy(n), this.markNormalRelatedDirty()));
    }
    resetPendingWithToiPeneCP(t, e, i, s, n) {
      (this.resetWithBiBj(t, e),
        (this.toi = i),
        (this._penetration = s > -r ? 0 : s),
        (this.cdRoundI = t.cdRound),
        (this.life = 0),
        this.contactPoint.copy(n),
        (this.normalUpdateHandler = this.normalUpdateCP),
        this.markNormalDirty());
    }
    updateForceArm() {
      ((this.armDirty = !1),
        (this._armLenI = this.bi.radius),
        this._armI.scaleVector(-this._armLenI, this.normal));
    }
  };
}
