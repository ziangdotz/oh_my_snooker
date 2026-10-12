export default function geometryUtilsModule(module, exports, loadModule) {
  const s = loadModule('domain/physics/physics-api').Vec3,
    n = s.EPSILON;
  const r = new (class {
    constructor() {
      ((this._tmpSP = new s()),
        (this._tmpAB = new s()),
        (this._tmpSectionsSubCopy = []),
        (this._tmpSectionsSubResults = []),
        (this._tmpResults = []),
        (this._tmpIndices = []));
    }
    sectionSub(t, e, i, s, r) {
      const a = n;
      if (s <= t || i >= e) return ((r[0] = t), (r[1] = e), 2);
      let o = 0;
      return (
        i > t + a && ((r[o++] = t), (r[o++] = i)),
        e > s + a && ((r[o++] = s), (r[o++] = e)),
        o
      );
    }
    sectionsSub(t, e, i) {
      let s = this._tmpSectionsSubCopy,
        n = this._tmpSectionsSubResults,
        r = t.length;
      for (let e = 0, i = r; e !== i; ++e) s[e] = t[e];
      t.length = 0;
      for (let a = 0, o = r / 2; a !== o; ++a) {
        let r = this.sectionSub(s[2 * a], s[2 * a + 1], e, i, n);
        for (let e = 0; e < r; ++e) t.push(n[e]);
      }
    }
    findClosestTInSections(t, e) {
      let i = e.length;
      if (0 === i) return t;
      let s = 0,
        n = !1;
      for (; s < i && t - e[s] >= 0; ) ((n = !n), s++);
      if (n) return t;
      if (0 === s) return e[s];
      if (s === i) return e[s - 1];
      {
        let i = e[s - 1],
          n = e[s];
        return t - i > n - t ? n : i;
      }
    }
    findCenterOfLongestInSections(t, e = 0) {
      let i = NaN,
        s = t.length / 2;
      if (0 === s) return i;
      let n = 0;
      for (let r = 0; r !== s; ++r) {
        let s = t[2 * r],
          a = t[2 * r + 1],
          o = a - s;
        o - n > e && ((n = o), (i = (s + a) / 2));
      }
      return i;
    }
    intersectSphereRay(t, e, i, s, r) {
      const a = n;
      let o = this._tmpSP.subVectors(i, t),
        l = o.dot(s),
        h = o.dot(o) - e * e;
      if (h > 0 && l > 0) return 0;
      let c = l * l - h;
      if (c < -a) return 0;
      if (c > a) {
        let t = Math.sqrt(c),
          e = -l - t,
          i = -l + t;
        return ((r[0] = e < 0 ? 0 : e), (r[1] = i < 0 ? 0 : i), 2);
      }
      return ((r[0] = -l < 0 ? 0 : -l), 1);
    }
    nIntersectSphereRay(t, e, i, s) {
      return this.intersectSphereRay(t, e, i, s, this._tmpResults);
    }
    intersectSphereAB(t, e, i, s, n) {
      let r = this._tmpAB.subVectors(s, i),
        a = r.length();
      return this.intersectSphereADirLen(t, e, i, r.normalize(), a, n);
    }
    intersectSphereADirLen(t, e, i, s, n, r) {
      let a = this.intersectSphereRay(t, e, i, s, r);
      return 0 === a
        ? 0
        : 1 === a
          ? r[0] > n
            ? 0
            : 1
          : r[0] > n
            ? 0
            : (r[1] > n && (r[1] = n), 2);
    }
    nIntersectSphereADirLen(t, e, i, s, n) {
      return this.intersectSphereADirLen(t, e, i, s, n, this._tmpResults);
    }
    sectionsBallsAB(t, e, i, s, r, a, o) {
      const l = n;
      let h,
        c = this._tmpAB.subVectors(r, s),
        d = c.length(),
        u = this._tmpResults,
        _ = this._tmpIndices,
        p = 0;
      (c.normalize(), (a[0] = 0), (a[1] = d), (a.length = 2));
      for (let n = 0, r = t.length; n !== r; ++n)
        if ((h = t[n]) !== e && h.active) {
          let t = i + h.radius;
          2 === this.intersectSphereADirLen(h.position, t, s, c, d, u) &&
            u[1] - u[0] > l &&
            (this.sectionsSub(a, u[0], u[1]), (_[p++] = h.index));
        }
      if (a.length > 0) return !0;
      if (o) {
        let e = this._tmpSP,
          n = Number.MAX_VALUE;
        for (let r = 0, a = p; r !== a; ++r) {
          ((h = t[_[r]]), e.subVectors(s, h.position));
          let a = i + h.radius - e.dot(o);
          a < n && (n = a);
        }
        a[0] = n;
      }
      return !1;
    }
  })();
  module.exports = r;
}
