// Explicit live dependencies preserve initialization and shared state.
export default function createAimGuide(dependencies) {
  return class AimGuide {
    get alpha() {
      return this._globalAlpha;
    }
    set alpha(t) {
      this._globalAlpha !== t && ((this._globalAlpha = t), (this.needsUpdate = !0));
    }
    constructor(t, e = 1e-4) {
      this.radius = 0;
      const i = dependencies.UiColors.WHITE,
        s = dependencies.UiColors.YELLOW;
      let n = this.createLineSeg(e, 'gs2', !0),
        r = dependencies.PlaneBatch.createPlane('gs1', !1, 1, 1, i[0], i[1], i[2], 0, e, 0),
        a = this.createLineSeg(e, 'gs2', !1),
        o = dependencies.PlaneBatch.createPlane('gs1', !1, 1, 1, i[0], i[1], i[2], 0, e, 0),
        l = this.createLineSeg(e, 'gs3', !1);
      ((n.zIndex = -10),
        (a.zIndex = -10),
        (l.zIndex = -10),
        (r.zIndex = -10),
        (o.zIndex = 10),
        AimGuide.setAlphaMode(n, dependencies.AimAlphaMode.GRADIENT),
        AimGuide.setAlphaMode(a, dependencies.AimAlphaMode.GRADIENT),
        AimGuide.setAlphaMode(l, dependencies.AimAlphaMode.GRADIENT),
        l.copyRGB(s[0], s[1], s[2]),
        (this.segments = [n, r, a, o, l]),
        (this.needsUpdate = !1),
        (this._globalAlpha = 1),
        (this.segAlphas = [1, 0, 0, 0, 0]));
      for (let e = 0, i = this.segments.length; e !== i; ++e) t.addChildb(this.segments[e]);
      ((this.needsSync = !1), (this._isValidColor = !0));
    }
    static setAlphaMode(t, e) {
      t.alphaMode !== e &&
        ((t.alphaMode = e),
        t.setVerticesAlphas(dependencies.aimGradientSegments, dependencies.aimSolidSegments[e]));
    }
    static setPlaneSize(t, e) {
      let i = t.v32,
        s = e / 2;
      ((i[0] = -s),
        (i[2] = -s),
        (i[6] = s),
        (i[8] = -s),
        (i[12] = s),
        (i[14] = s),
        (i[18] = -s),
        (i[20] = s),
        t.markTransformDirty());
    }
    static setSegmentSize(t, e, i) {
      let s = dependencies.tableUiAtlas.getFrame('gs2'),
        n = e / 2,
        r = (s.headH * e) / s.w,
        a = t.v32;
      ((t.spacing = i),
        (t.ow = e),
        (a[2] = t.spacing),
        (a[8] = t.spacing),
        (a[14] = t.spacing + r),
        (a[20] = t.spacing + r));
      for (let t = 0, e = a.length / 6; t !== e; t += 2) ((a[6 * t] = -n), (a[6 * (t + 1)] = n));
    }
    static setSegmentDistance(t, e) {
      if (t.distance !== e) {
        t.distance = e;
        let i,
          s = t.v32,
          n = s[14] - s[2];
        switch (s.length / 6) {
          case 8:
            ((i = e - 2 * n) < 0 && (i = 0),
              (s[26] = s[14] + i),
              (s[32] = s[26]),
              (s[38] = s[26] + n),
              (s[44] = s[38]));
            break;
          case 6:
            ((i = e - n) < 0 && (i = 0), (s[26] = s[14] + i), (s[32] = s[26]));
            break;
          default:
            throw new Error('Unknown batchData');
        }
        t.markTransformDirty();
      }
    }
    static setSegmentOpen(t, e) {
      let i = t.distance,
        s = t.ow,
        n = 0.5 * s,
        r = (i - s) * e * 2.8,
        a = t.v32,
        o = a[2],
        l = 0;
      r < 0 && (r = 0);
      for (let t = 1, e = a.length / 12; t < e; ++t)
        ((l = ((a[12 * t + 2] - o) / i) * r), (a[12 * t] = -n - l), (a[12 * t + 6] = n + l));
      t.markTransformDirty();
    }
    dispose() {
      const t = this.segments;
      for (let e = 0, i = t.length; e !== i; ++e) t[e].dispose();
      t.length = 0;
    }
    setSegAlpha(t, e) {
      this.segAlphas[t] !== e && ((this.segAlphas[t] = e), (this.needsUpdate = !0));
    }
    setColorValid(t) {
      if (t !== this._isValidColor) {
        this._isValidColor = t;
        let e = t ? dependencies.UiColors.WHITE : dependencies.UiColors.RED;
        this.segments[3].copyRGB(e[0], e[1], e[2]);
      }
    }
    createLineSeg(t, e, i) {
      void 0 === e && (e = 'gs2');
      const s = dependencies.tableUiAtlas.getFrame(e);
      let n = s.h,
        r = dependencies.tableUiAtlas.getUVs(e),
        a = r[0],
        o = r[1],
        l = r[2],
        h = r[3],
        c = r[6],
        d = r[7],
        u = r[4],
        _ = r[5],
        p = s.headH / n,
        f = 1 - p,
        g = [
          0,
          t,
          0,
          a,
          o,
          1,
          0,
          t,
          0,
          l,
          h,
          1,
          0,
          t,
          0,
          a + (c - a) * p,
          o + (d - o) * p,
          1,
          0,
          t,
          0,
          l + (u - l) * p,
          h + (_ - h) * p,
          1,
          0,
          t,
          0,
          a + (c - a) * f,
          o + (d - o) * f,
          1,
          0,
          t,
          0,
          l + (u - l) * f,
          h + (_ - h) * f,
          1,
        ],
        m = [0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4];
      return (
        i && (g.push(0, t, 0, c, d, 1, 0, t, 0, u, _, 1), m.push(4, 5, 7, 4, 7, 6)),
        new dependencies.AimSegment(new Float32Array(g), new Uint16Array(m), 1, 1, 1, n)
      );
    }
    setRadius(t) {
      this.radius !== t &&
        ((this.radius = t),
        AimGuide.setPlaneSize(this.segments[1], 2 * t),
        AimGuide.setPlaneSize(this.segments[3], 2 * t),
        AimGuide.setSegmentSize(this.segments[0], t, t),
        AimGuide.setSegmentSize(this.segments[2], t, t),
        AimGuide.setSegmentSize(this.segments[4], 0.5 * t, t));
    }
    update() {
      this.needsUpdate = !1;
      let t = this.segments,
        e = this.segAlphas,
        i = this._globalAlpha;
      for (var s = 0, n = t.length; s !== n; ++s) t[s].alpha = i * e[s];
    }
    syncPrediction(t, e, i) {
      let n,
        r,
        a,
        o,
        l = this.segments[0],
        h = this.segments[1],
        c = this.segments[2],
        d = this.segments[3],
        u = this.segments[4],
        _ = t.p0;
      if (((this.needsSync = !1), l.copyPositionXYZ(_.x, 0, _.z), !t.impactOccured))
        return (
          this.setSegAlpha(1, 0),
          this.setSegAlpha(2, 0),
          this.setSegAlpha(3, 0),
          this.setSegAlpha(4, 0),
          (n = t.cue.x - _.x),
          (r = t.cue.z - _.z),
          (a = Math.sqrt(n * n + r * r)) <= (o = l.spacing)
            ? this.setSegAlpha(0, 0)
            : (this.setSegAlpha(0, 1),
              l.setOrientation2D(n / a, r / a, !0),
              AimGuide.setSegmentDistance(l, a - o)),
          void this.setColorValid(!0)
        );
      ((n = t.p1.x - _.x),
        (r = t.p1.z - _.z),
        (a = Math.sqrt(n * n + r * r)) <= (o = 2 * l.spacing)
          ? (this.setSegAlpha(0, 0), l.setOrientation2D(t.impactV1.x, t.impactV1.z))
          : (this.setSegAlpha(0, 1),
            l.setOrientation2D(n / a, r / a, !0),
            AimGuide.setSegmentDistance(l, a - o)),
        this.setSegAlpha(1, 1),
        h.copyPositionXYZ(t.p1.x, 0, t.p1.z));
      var p = 0.5 * ((n = t.cue.x - t.p1.x) * n + (r = t.cue.z - t.p1.z) * r),
        f = 0.5 * t.cueVSq;
      if (
        ((a = Math.min(p + f, i - a)) <= (o = c.spacing)
          ? this.setSegAlpha(2, 0)
          : (c.copyPositionXYZ(t.p1.x, 0, t.p1.z),
            this.setSegAlpha(2, 1),
            c.setOrientation2D(n, r),
            AimGuide.setSegmentDistance(c, a - o)),
        !t.hasImpactTarget)
      )
        return (this.setSegAlpha(3, 0), this.setSegAlpha(4, 0), void this.setColorValid(!0));
      (this.setSegAlpha(3, 1),
        d.copyPositionXYZ(t.p2.x, 0, t.p2.z),
        this.setColorValid(Math.pow(2, t.targetNumber) & e),
        (a = Math.min(0.5 * t.targetVSq, 0.4)) <= (o = u.spacing)
          ? this.setSegAlpha(4, 0)
          : (u.copyPositionXYZ(t.p2.x, 0, t.p2.z),
            this.setSegAlpha(4, 1),
            u.setOrientation2D(t.target.x - t.p2.x, t.target.z - t.p2.z),
            AimGuide.setSegmentDistance(u, a - o),
            AimGuide.setSegmentOpen(
              u,
              1 - dependencies.Babylon.Vector2.Dot(l.getOrientation2D(), u.getOrientation2D()),
            )));
    }
  };
}
