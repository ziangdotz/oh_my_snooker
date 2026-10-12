// Explicit live dependencies preserve initialization and shared state.
export default function createCueTransform(dependencies) {
  return class CueTransform {
    constructor(t, e) {
      ((this._weakParent = t),
        (this._stateIndex = e),
        (this._isDirty = !1),
        (this._personBodyX = NaN),
        (this._personBodyZ = NaN),
        (this._azimuthSideX = NaN),
        (this._azimuthSideZ = NaN),
        (this._position = new dependencies.Babylon.Vector3(NaN, 1.86, NaN)),
        (this._rotation = new dependencies.Babylon.Vector3(0, 0, 0.5 * Math.PI)));
    }
    syncPersonCtl(t) {
      const e = t.bodyPosition,
        i = t.azimuth.side;
      ((this._personBodyX === e.x && this._personBodyZ === e.z) ||
        ((this._personBodyX = e.x), (this._personBodyZ = e.z), this._markDirty()),
        (this._azimuthSideX === i.x && this._azimuthSideZ === i.z) ||
          ((this._azimuthSideX = i.x), (this._azimuthSideZ = i.z), this._markDirty()));
    }
    _markDirty() {
      ((this._isDirty = !0), this._weakParent.markStateDirty(this._stateIndex));
    }
    _update() {
      ((this._isDirty = !1),
        (this._position.x = this._personBodyX - 0.2 * this._azimuthSideX),
        (this._position.z = this._personBodyZ - 0.2 * this._azimuthSideZ));
    }
    getPosition() {
      return (this._isDirty && this._update(), this._position);
    }
    getRotation() {
      return this._rotation;
    }
  };
}
