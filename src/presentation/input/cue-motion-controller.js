// Explicit live dependencies preserve initialization and shared state.
export default function createCueMotionController(dependencies) {
  return class CueMotionController {
    get stateRatio() {
      return this._stateRatio;
    }
    get needsUpdate() {
      return this._needsUpdate;
    }
    get rotationZ1() {
      return this._state1.animatedRotation.z;
    }
    get angleH1() {
      return this._state1._angleH;
    }
    get kissDir() {
      return this._state1.getKissDir();
    }
    get kissPoint() {
      return this._state1.getKissPoint();
    }
    get composedPosition() {
      return this._composedPosition;
    }
    get composedRotation() {
      return this._composedRotation;
    }
    get leadingSpace() {
      return this._state1.leadingSpace;
    }
    set leadingSpace(t) {
      this._state1.leadingSpace = t;
    }
    constructor() {
      ((this._stateRatio = 0),
        (this._needsUpdate = !1),
        (this._state0 = new dependencies.CueTransform(this, 0)),
        (this._state1 = new dependencies.CueContactController(this, 1)),
        (this._slerpedS1Position = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._slerpedS1Rotation = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._composedPosition = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._composedRotation = new dependencies.Babylon.Vector3(0, 0, 0)));
    }
    markStateDirty(t) {
      !this._needsUpdate &&
        0 !== this._stateRatio &&
        Math.abs(t - this._stateRatio) < 0.999999 &&
        (this._needsUpdate = !0);
    }
    onKissPropsChanged(t) {
      this._state1.onKissPropsChanged = t;
    }
    reset(t, e, i = null) {
      this._state1.bind(t, e, i);
    }
    release() {
      this._state1.unbind();
    }
    resetAimPoint(t) {
      this._state1.resetAimPoint(t);
    }
    syncPersonCtl(t) {
      (this._stateRatio !== t.stateRatio &&
        ((this._stateRatio = t.stateRatio), (this._needsUpdate = !0)),
        this._state0.syncPersonCtl(t),
        this._state1.setCtlPoint(t.bodyPosition.x, t.bodyPosition.z));
    }
    setAngleV(t) {
      return this._state1.setAngleV(t);
    }
    moveAngleV(t) {
      return this._state1.moveAngleV(t);
    }
    moveLocTip(t, e) {
      let i = Math.abs(t / e);
      return (
        i > 1.5 ? (e = 0) : i < 1 / 1.5 && (t = 0),
        this._state1.moveLocTip(8e-5 * t, 8e-5 * e)
      );
    }
    clearTip(t) {
      return this._state1.setLocTip(0, 0, t);
    }
    setTipPercent(t, e) {
      let i = this._state1.maxTipOffset;
      return this._state1.setLocTip(t * i, e * i, !1);
    }
    update() {
      const t = this._stateRatio,
        e = this._composedPosition,
        i = this._composedRotation;
      let s = this._state0,
        n = this._state1;
      if (((this._needsUpdate = !1), 0 === t))
        (e.copyFrom(s.getPosition()), i.copyFrom(s.getRotation()));
      else {
        n.needsUpdate && 0 !== n.updateAnimation(t) && (this._needsUpdate = !0);
        let r = n.animatedPosition,
          a = n.animatedRotation;
        if (1 === t) (e.copyFrom(r), i.copyFrom(a));
        else {
          let n = s.getPosition(),
            o = s.getRotation(),
            l = Math.min(1, t / 0.9),
            h = Math.min(1, t / 0.7),
            c = dependencies.cueStateEase(l),
            d = dependencies.cueContactEase(l),
            u = dependencies.cueReleaseEase(h);
          ((e.x = n.x + (r.x - n.x) * c),
            (e.z = n.z + (r.z - n.z) * c),
            (e.y = n.y + (r.y - n.y) * d),
            (i.x = a.x),
            (i.y = a.y),
            (i.z = o.z + (a.z - o.z) * u));
        }
      }
    }
    isReadyToStroke() {
      return 1 === this._stateRatio && this._state1.isReadyToStroke();
    }
    getSlowDownDistance(t, e) {
      let i = 0.015 + t * e * 0.9,
        s = this._state1.kissToTable;
      return i > s ? s : i;
    }
    getStrokeSpdWithPower(t) {
      return this.getTouchSpdWithPower(t) * this.getKissSpdMulWithPower(t);
    }
    getTouchSpdWithPower(t) {
      return 0.5 + 11 * t;
    }
    getKissSpdMulWithPower(t) {
      return 3.2 + 6 * t;
    }
    render(t) {
      if (0 === this._stateRatio) t.isVisible = !1;
      else {
        t.isVisible = !0;
        const e = t._worldMatrix.m,
          i = this._composedPosition,
          s = this._composedRotation;
        t._isWorldMatrixFrozen = !0;
        let n = Math.cos(s.y),
          r = Math.sin(s.y),
          a = Math.cos(s.z),
          o = Math.sin(s.z);
        ((e[0] = n * a),
          (e[1] = o),
          (e[2] = -a * r),
          (e[3] = 0),
          (e[4] = -n * o),
          (e[5] = a),
          (e[6] = o * r),
          (e[7] = 0),
          (e[8] = r),
          (e[9] = 0),
          (e[10] = n),
          (e[11] = 0),
          (e[12] = i.x),
          (e[13] = i.y),
          (e[14] = i.z),
          (e[15] = 1),
          t._worldMatrix._markAsUpdated(),
          t._updateBoundingInfo(),
          t.material._lightProbeManager._onMeshTransformDirty(t));
      }
    }
  };
}
