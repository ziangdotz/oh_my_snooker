// Explicit live dependencies preserve initialization and shared state.
export default function createOrbitTrack(dependencies) {
  return class OrbitTrack {
    constructor() {
      ((this.center = new dependencies.VectorTwo()),
        (this.radius = 0),
        (this.scaleX = 1),
        (this._ellipse = new dependencies.EllipseTwo()),
        (this._ellipseDirty = !1),
        (this.angle = 0));
    }
    toString() {
      let t =
        '{ center: ' + this.center + ', radius: ' + this.radius + ', scaleX: ' + this.scaleX + ' }';
      return (t += '\n' + this._ellipse);
    }
    reset(t, e, i, s) {
      (this.center.set(t, e), (this.radius = i), (this.scaleX = s), (this._ellipseDirty = !0));
    }
    resetCenter(t, e) {
      (this.center.set(t, e), (this._ellipseDirty = !0));
    }
    angleToCenter(t, e) {
      return (
        this._ellipseDirty &&
          ((this._ellipseDirty = !1),
          this._ellipse.resetWithScaledCircle(
            this.scaleX,
            1,
            this.radius,
            this.center.x,
            this.center.y,
          )),
        this._ellipse.angleToCenter(t, e)
      );
    }
    getLineCrossedPoint(t, e, i, s, n, r) {
      this._ellipseDirty &&
        ((this._ellipseDirty = !1),
        this._ellipse.resetWithScaledCircle(
          this.scaleX,
          1,
          this.radius,
          this.center.x,
          this.center.y,
        ));
      let a,
        o,
        l,
        _h,
        _c,
        _d,
        _u,
        _,
        p = dependencies.orbitLine.resetWithXYXY(t, e, i, s),
        f = this._ellipse.intersectWithLine(p, dependencies.orbitPoints);
      return 0 === f.count
        ? null
        : ((a = f.points),
          (_ = 0),
          2 === f.count &&
            ((o = a[_].x),
            (l = a[_].y),
            (_h = i - t) * (_d = o - t) + (_c = s - e) * (_u = l - e) < 0 && (_ = 1),
            r && (_ = (_ + 1) % 2)),
          n ? ((n.x = a[_].x), (n.y = a[_].y), n) : a[_]);
    }
  };
}
