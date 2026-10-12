// Explicit live dependencies preserve initialization and shared state.
export default function createOrientedUiPlane(dependencies) {
  return class OrientedUiPlane extends dependencies.UiPlane {
    constructor(t, e, i, n, r) {
      (super(t, e, i, n, r),
        (this._orientationDirty = !1),
        (this._orientation2D = new dependencies.Babylon.Vector2(0, 0)),
        (this._rotationMat = dependencies.Babylon.Matrix.Identity()),
        (this._mOutput = new Float32Array(16)));
    }
    dispose() {
      ((this._orientation2D = null),
        (this._rotationMat = null),
        (this._mOutput = null),
        super.dispose());
    }
    setOrientation2D(t, e, i) {
      if ((this._orientation2D.copyFromFloats(t, e), i)) {
        let i = this._rotationMat.m;
        ((i[0] = e), (i[2] = -t), (i[8] = t), (i[10] = e), (this._orientationDirty = !1));
      } else this._orientationDirty = !0;
      ((this.needsUpdate |= dependencies.PlaneDirtyFlags.DF_TRANSFORM),
        this._weakParent && (this._weakParent.needsUpdate |= 1));
    }
    getOrientation2D() {
      return (this._orientationDirty && this._updateOrientation(), this._orientation2D);
    }
    _updateOrientation() {
      this._orientationDirty = !1;
      let t = this._orientation2D.normalize(),
        e = t.x,
        i = t.y,
        s = this._rotationMat.m;
      ((s[0] = i), (s[2] = -e), (s[8] = e), (s[10] = i));
    }
    updateTransform(t) {
      this.needsUpdate &= ~dependencies.PlaneDirtyFlags.DF_TRANSFORM;
      const e = this.v32,
        i = this._vOffset,
        s = this._transform;
      let n,
        r,
        a,
        o,
        l,
        h,
        c = s.m,
        d = this._mOutput,
        u = this._rotationMat;
      (this._orientationDirty && this._updateOrientation(),
        (c[0] = c[5] = c[10] = this._scaling),
        (c[12] = this._x),
        (c[13] = this._y),
        (c[14] = this._z),
        u.multiplyToArray(s, d, 0));
      for (let s = 0, c = this.nVertices; s !== c; ++s)
        ((h = 3 * (i + s)),
          (n = e[(l = 6 * s)]),
          (r = e[l + 1]),
          (a = e[l + 2]),
          (o = n * d[3] + r * d[7] + a * d[11] + d[15]),
          (t[h] = (n * d[0] + r * d[4] + a * d[8] + d[12]) / o),
          (t[h + 1] = (n * d[1] + r * d[5] + a * d[9] + d[13]) / o),
          (t[h + 2] = (n * d[2] + r * d[6] + a * d[10] + d[14]) / o));
    }
  };
}
