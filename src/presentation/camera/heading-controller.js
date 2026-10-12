// Explicit live dependencies preserve initialization and shared state.
export default function createHeadingController(dependencies) {
  return class HeadingController {
    get isDirty() {
      return this._isDirty;
    }
    get angle() {
      return (this._isDirty && this.update(), this._angle);
    }
    get forward() {
      return (this._isDirty && this.update(), this._forward);
    }
    get side() {
      return (this._isDirty && this.update(), this._side);
    }
    constructor() {
      ((this._angle = 0),
        (this._forward = new dependencies.Babylon.Vector3(1, 0, 0)),
        (this._side = new dependencies.Babylon.Vector3(0, 0, 1)),
        (this._dx = 0),
        (this._dz = 0),
        (this._cachedSlope = 0),
        (this._isDirty = !1));
    }
    setSlope(t, e) {
      let i = e / t;
      (this._isDirty || Math.abs(i - this._cachedSlope) > 1e-6) &&
        ((this._isDirty = !0), (this._cachedSlope = i), (this._dx = t), (this._dz = e));
    }
    update() {
      ((this._isDirty = !1), (this._angle = Math.atan2(this._dz, this._dx)));
      let t = Math.cos(this._angle),
        e = Math.sin(this._angle);
      (this._forward.copyFromFloats(t, 0, e), this._side.copyFromFloats(-e, 0, t));
    }
  };
}
