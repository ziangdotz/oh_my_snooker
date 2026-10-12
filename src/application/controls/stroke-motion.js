// Explicit live dependencies preserve initialization and shared state.
export default function createStrokeMotion(dependencies) {
  return class StrokeMotion {
    get maxPullbackLen() {
      return dependencies.maxPullbackLength;
    }
    get needsUpdate() {
      return this._needsUpdate;
    }
    get gap() {
      return this._gap;
    }
    get length() {
      return this._length;
    }
    get pullbackProgress() {
      return this._pullbackProgress;
    }
    constructor(t = -0.015) {
      ((this._gap = t),
        (this._length = t),
        (this._pullbackProgress = 0),
        (this._tick = 0),
        (this._duration = 0),
        (this._needsUpdate = !1),
        (this._distance_s1 = 0),
        (this._dura_s1 = 0),
        (this._dura_s2 = 0),
        (this._acc_s2 = 0),
        (this._dura_s3 = 0),
        (this._distance_s3 = 0),
        (this._tipRadius = 0),
        (this._kissDir = new dependencies.StrokeVector()),
        (this._kissPoint = new dependencies.StrokeVector()),
        (this._tmpSp = new dependencies.StrokeVector()),
        (this.launchingController = null));
    }
    reset() {
      ((this._needsUpdate = !1),
        (this._length = this._gap),
        (this._pullbackProgress = 0),
        (this.launchingController = null));
    }
    cancel() {
      this.launchingController = null;
    }
    isReady() {
      return !this._needsUpdate && 0 === this._pullbackProgress;
    }
    launch(t) {
      let e = t.getStickTouchSpd(),
        i = t.strokePower,
        s = t.getStickSlowDownDistance(this.maxPullbackLen);
      ((this._tipRadius = t.getTipRadius()),
        this._kissDir.copy(t.getKissDir()),
        this._kissPoint.copy(t.getKissPoint()),
        (this.launchingController = t),
        (this._distance_s1 =
          dependencies.Easing.Power1.easeOut(i) * dependencies.maxPullbackLength),
        (this._dura_s1 = 0.3 + 0.3 * dependencies.Easing.Power1.easeOut(i)));
      let n = this._distance_s1 - this._gap;
      ((this._dura_s2 = (2 * n) / e), (this._acc_s2 = e / this._dura_s2));
      let r = 0.92 * e,
        a = (0.5 * r * r) / s;
      return (
        (this._dura_s3 = r / a),
        (this._distance_s3 = s),
        (this._tick = 0),
        (this._duration = this._dura_s1 + this._dura_s2 + this._dura_s3),
        (this._needsUpdate = !0),
        this._dura_s1 + this._dura_s2
      );
    }
    tick(t) {
      let e = this._tick;
      return (
        t > 0.02 && (t = 0.02),
        (this._tick += t),
        this._tick >= this._duration
          ? ((this._tick = this._duration), (this._needsUpdate = !1), this._duration - e)
          : t
      );
    }
    updateLength(t) {
      let e = this._tick;
      if (e <= this._dura_s1)
        return (
          (this._pullbackProgress = e / this._dura_s1),
          void (this._length =
            this._gap - dependencies.strokeEase(this._pullbackProgress) * this._distance_s1)
        );
      if (((this._pullbackProgress = 1), (e -= this._dura_s1) < this._dura_s2))
        return void (this._length = this._gap - this._distance_s1 + this._acc_s2 * e * e * 0.5);
      let i =
          dependencies.Easing.Power2.easeOut((e - this._dura_s2) / this._dura_s3) *
          this._distance_s3,
        s = t.radius + this._tipRadius,
        n = this._tmpSp.subVectors(this._kissPoint, t.position),
        r = dependencies.Ji(this._kissDir, 1, n, n.lengthSq(), s * s);
      this._length = Math.min(i, r);
    }
  };
}
