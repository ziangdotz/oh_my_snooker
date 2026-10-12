export default function planeModule(module, exports, loadModule) {
  const s = loadModule('domain/physics/physics-api').Vec3,
    n = s.EPSILON;
  class Plane {
    get geoCenter() {
      return null;
    }
    constructor() {
      ((this.normal = new s(0, 0, 0)), (this.d = 0));
    }
    isZeroNormal() {
      const t = n,
        e = this.normal;
      return !(Math.abs(e.x) > t || Math.abs(e.y) > t || Math.abs(e.z) > t);
    }
    setWithPointNormal(t, e) {
      return (this.normal.copy(e), (this.d = -e.x * t.x - e.y * t.y - e.z * t.z), this);
    }
    setWithPointAnd2Dirs(t, e, i) {
      let s = this.normal;
      return (
        s.crossVectors(e, i).normalize(),
        (this.d = -s.x * t.x - s.y * t.y - s.z * t.z),
        this
      );
    }
    setWithPoint(t, e, i) {
      let s = e.x - t.x,
        n = e.y - t.y,
        r = e.z - t.z,
        a = i.x - t.x,
        o = i.y - t.y,
        l = i.z - t.z,
        h = n * l - r * o,
        c = r * a - s * l,
        d = s * o - n * a,
        u = Math.sqrt(h * h + c * c + d * d),
        _ = 0 !== u ? 1 / u : 0,
        p = this.normal;
      return (
        (p.x = h * _),
        (p.y = c * _),
        (p.z = d * _),
        (this.d = -(p.x * t.x + p.y * t.y + p.z * t.z)),
        this
      );
    }
    signedDistance(t) {
      let e = this.normal;
      return e.x * t.x + e.y * t.y + e.z * t.z + this.d;
    }
    intersectionWithRay(t, e, i, s = 9999) {
      const r = t,
        a = e,
        o = this.signedDistance(r),
        l = n;
      let h = o / -this.normal.dot(a);
      return !(h < -l || h > s) && (h < 0 && (h = 0), i.copy(r).addScaled(a, h), !0);
    }
    projectionInside() {
      return !0;
    }
  }
  ((Plane.TmpV = new s()), (module.exports = Plane));
}
