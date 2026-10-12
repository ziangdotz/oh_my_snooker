// Explicit live dependencies preserve initialization and shared state.
export default function createOrbitController(dependencies) {
  return class OrbitController {
    constructor(t, e) {
      ((this._dirtyFlag = e),
        (this._weakParent = t),
        (this._angularSpd = 0),
        (this._inertia = 0.82),
        (this._orbitDirs = [0, 0]),
        (this._orbitSpd = new dependencies.AngularController(15, 0.001)),
        this._orbitSpd.onUpdateRequired(() => (this._weakParent.needsUpdate |= this._dirtyFlag)),
        (this._tracks = [new dependencies.OrbitTrack(), new dependencies.OrbitTrack()]),
        (this._activeTrackIndex = -1),
        (this._ctlPoint = new dependencies.VectorTwo()),
        (this._ctlChange = new dependencies.VectorTwo()),
        (this._ctlPointsDirty = !1));
    }
    orbit(t, e) {
      let i = this._orbitDirs;
      return (
        void 0 !== t && (i[0] = t ? 1 : 0),
        void 0 !== e && (i[1] = e ? 1 : 0),
        this._orbitSpd.to(0.0018 * (i[1] - i[0])),
        this
      );
    }
    applyAngularSpeed(t) {
      ((this._angularSpd += t), (this._weakParent.needsUpdate |= this._dirtyFlag));
    }
    reset(t, e, i, s, n, r, a) {
      (this._tracks[0].reset(t, e, i, s),
        this._tracks[1].reset(t, e, n, 1),
        (this._ctlPointsDirty = !0),
        (this._angularSpd = 0),
        this._orbitSpd.reset(0),
        (this._activeTrackIndex = r),
        (this._tracks[this._activeTrackIndex].angle =
          'number' == typeof a ? a : this._tracks[this._activeTrackIndex].angleToCenter(a.x, a.z)),
        (this._weakParent.needsUpdate |= this._dirtyFlag));
    }
    resetInnerCenter(t, e) {
      return (
        this._tracks[1].resetCenter(t, e),
        (this._ctlPointsDirty = !0),
        (this._weakParent.needsUpdate |= this._dirtyFlag),
        this
      );
    }
    getAimPoint() {
      return this._tracks[1].center;
    }
    resetWithKissDir(t, e, i, s) {
      let n = this._tracks[1],
        r = this._tracks[0];
      n.angle = Math.atan2(-e, -t);
      let a = n.center.x,
        o = n.center.y;
      dependencies.ei(a, o, a - t, o - e, r);
      let l = this._ctlPoint,
        h = this._ctlChange;
      (dependencies.ii(r, n, l, h),
        (i.x = l.x + h.x * s.renderedRatio),
        (i.z = l.y + h.y * s.renderedRatio),
        (this._angularSpd = 0),
        this._orbitSpd.reset(0),
        (this._weakParent.needsUpdate |= this._dirtyFlag));
    }
    update(t, e, i) {
      let s = !1,
        n = this._tracks[t],
        r = this._orbitSpd;
      if (
        (r.needsUpdate && r.update() && (s = !0),
        (this._angularSpd += r.crt),
        this._activeTrackIndex !== t)
      ) {
        ((this._activeTrackIndex = t), (this._ctlPointsDirty = !0));
        const e = this._tracks[1].center;
        1 === t ? dependencies.ti(e.x, e.y, i.x, i.z, n) : dependencies.ei(e.x, e.y, i.x, i.z, n);
      }
      if (0 !== this._angularSpd) {
        this._ctlPointsDirty = !0;
        let t = 1 - Math.abs(Math.sin(n.angle)),
          i = 0.2 * e.renderedRatio + 0.8;
        (Math.abs((this._angularSpd *= this._inertia)) < 1e-4 ? (this._angularSpd = 0) : (s = !0),
          (n.angle += (1 + n.scaleX * t - t) * this._angularSpd * i));
      }
      if (0 === e.renderedRatio || 1 === e.renderedRatio)
        ((i.x = n.center.x + Math.cos(n.angle) * n.radius * n.scaleX),
          (i.z = n.center.y + Math.sin(n.angle) * n.radius));
      else {
        let s = this._ctlPoint,
          n = this._ctlChange;
        if (this._ctlPointsDirty) {
          ((this._ctlPointsDirty = !1),
            0 === t
              ? dependencies.ii(this._tracks[0], this._tracks[1], s, n)
              : dependencies.si(this._tracks[0], this._tracks[1], s, n));
          let i = n.x * n.x + n.y * n.y;
          i < 4 ? (e.timeScale = 1) : (i > 16 && (i = 16), (e.timeScale = 1 - 0.0125 * (i - 4)));
        }
        ((i.x = s.x + n.x * e.renderedRatio), (i.z = s.y + n.y * e.renderedRatio));
      }
      return s;
    }
  };
}
