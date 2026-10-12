// Explicit live dependencies preserve initialization and shared state.
export default function createUiPlane(dependencies) {
  return class UiPlane {
    get x() {
      return this._x;
    }
    get y() {
      return this._y;
    }
    get z() {
      return this._z;
    }
    get scaling() {
      return this._scaling;
    }
    set scaling(t) {
      this._scaling !== t &&
        ((this._scaling = t),
        (this.needsUpdate |= dependencies.PlaneDirtyFlags.DF_TRANSFORM),
        this._weakParent && (this._weakParent.needsUpdate |= 1));
    }
    get r() {
      return this._r;
    }
    get g() {
      return this._g;
    }
    get b() {
      return this._b;
    }
    get alpha() {
      return this._a;
    }
    set alpha(t) {
      this._a !== t &&
        ((this._a = t),
        (this.needsUpdate |= dependencies.PlaneDirtyFlags.DF_ALPHA),
        this._weakParent && (this._weakParent.needsUpdate |= 1));
    }
    constructor(t, e, i = 1, n = 1, r = 1) {
      ((this._transform = dependencies.Babylon.Matrix.Identity()),
        (this._x = 0),
        (this._y = 0),
        (this._z = 0),
        (this._scaling = 1),
        (this._r = i),
        (this._g = n),
        (this._b = r),
        (this._a = 1),
        (this.v32 = t),
        (this.i16 = e),
        (this.nVertices = t.length / 6),
        (this._weakParent = null),
        (this._vOffset = -1),
        (this.needsUpdate = 0),
        (this.zIndex = 0));
    }
    dispose() {
      ((this._transform = null),
        (this.v32 = null),
        (this.i16 = null),
        this._weakParent && this._weakParent.removeChildb(this));
    }
    copyPosition(t) {
      (this._x === t.x && this._y === t.y && this._z === t.z) ||
        ((this._x = t.x),
        (this._y = t.y),
        (this._z = t.z),
        (this.needsUpdate |= dependencies.PlaneDirtyFlags.DF_TRANSFORM),
        this._weakParent && (this._weakParent.needsUpdate |= 1));
    }
    copyPositionXYZ(t, e, i) {
      (this._x === t && this._y === e && this._z === i) ||
        ((this._x = t),
        (this._y = e),
        (this._z = i),
        (this.needsUpdate |= dependencies.PlaneDirtyFlags.DF_TRANSFORM),
        this._weakParent && (this._weakParent.needsUpdate |= 1));
    }
    copyRGB(t, e, i) {
      (this._r === t && this._g === e && this._b === i) ||
        ((this._r = t),
        (this._g = e),
        (this._b = i),
        (this.needsUpdate |= dependencies.PlaneDirtyFlags.DF_RGB),
        this._weakParent && (this._weakParent.needsUpdate |= 1));
    }
    markTransformDirty() {
      ((this.needsUpdate |= dependencies.PlaneDirtyFlags.DF_TRANSFORM),
        this._weakParent && (this._weakParent.needsUpdate |= 1));
    }
    setVertexAlpha(t, e) {
      const i = this.v32;
      i[(t = 6 * t + 5)] !== e &&
        ((i[t] = e),
        (this.needsUpdate |= dependencies.PlaneDirtyFlags.DF_ALPHA),
        this._weakParent && (this._weakParent.needsUpdate |= 1));
    }
    setVerticesAlphas(t, e) {
      const i = this.v32,
        s = i.length;
      let n = -1,
        r = !1;
      for (let a = 0, o = t.length; a !== o; ++a)
        (n = 6 * t[a] + 5) < s && i[n] !== e && ((i[n] = e), (r = !0));
      r &&
        ((this.needsUpdate |= dependencies.PlaneDirtyFlags.DF_ALPHA),
        this._weakParent && (this._weakParent.needsUpdate |= 1));
    }
    setUI(t, e, i) {
      const s = this.v32,
        n = this.i16,
        r = this._vOffset;
      let a, o, l;
      for (o = 0, l = this.nVertices; o !== l; ++o)
        ((t[2 * (a = o + r)] = s[6 * o + 3]), (t[2 * a + 1] = s[6 * o + 4]));
      for (o = 0, l = n.length; o !== l; ++o) e[i + o] = n[o] + r;
      return i + n.length;
    }
    updateAlpha(t) {
      this.needsUpdate &= ~dependencies.PlaneDirtyFlags.DF_ALPHA;
      const e = this._a,
        i = this.v32,
        s = this._vOffset;
      for (let n = 0, r = this.nVertices; n !== r; ++n) t[s + n] = e * i[6 * n + 5];
    }
    updateRGB(t) {
      this.needsUpdate &= ~dependencies.PlaneDirtyFlags.DF_RGB;
      const e = this._r,
        i = this._g,
        s = this._b,
        n = this._vOffset;
      let r;
      for (let a = 0, o = this.nVertices; a !== o; ++a)
        ((t[(r = 3 * (n + a))] = e), (t[r + 1] = i), (t[r + 2] = s));
    }
    updateTransform(t) {
      this.needsUpdate &= ~dependencies.PlaneDirtyFlags.DF_TRANSFORM;
      const e = this.v32,
        i = this._vOffset;
      let s,
        n,
        r,
        a,
        o,
        l,
        h = this._transform.m;
      ((h[0] = h[5] = h[10] = this._scaling),
        (h[12] = this._x),
        (h[13] = this._y),
        (h[14] = this._z));
      for (let c = 0, d = this.nVertices; c !== d; ++c)
        ((l = 3 * (i + c)),
          (s = e[(o = 6 * c)]),
          (n = e[o + 1]),
          (r = e[o + 2]),
          (a = s * h[3] + n * h[7] + r * h[11] + h[15]),
          (t[l] = (s * h[0] + n * h[4] + r * h[8] + h[12]) / a),
          (t[l + 1] = (s * h[1] + n * h[5] + r * h[9] + h[13]) / a),
          (t[l + 2] = (s * h[2] + n * h[6] + r * h[10] + h[14]) / a));
    }
  };
}
