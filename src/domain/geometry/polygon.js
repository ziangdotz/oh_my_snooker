export default function polygonModule(module, exports, loadModule) {
  const Plane = loadModule('domain/geometry/plane'),
    n = loadModule('domain/physics/physics-api').Vec3;
  module.exports = class Polygon extends Plane {
    get geoCenter() {
      if (!this._geoCenter) {
        const t = this._ps.length;
        if (0 === t) return null;
        let e = new n();
        for (let i = 0, s = t; i !== s; ++i) e.add(this._ps[i]);
        this._geoCenter = e.scale(1 / t);
      }
      return this._geoCenter;
    }
    constructor() {
      (super(), (this._ps = []), (this._edgeXNormals = []), (this._geoCenter = null));
    }
    resetWithAtomPolygon(t) {
      const e = t.edges;
      for (let t = 0, i = e.length; t !== i; ++t) {
        let i = this._ps[t];
        i ? i.copy(e[t].va) : (this._ps[t] = e[t].va.clone());
      }
      if (((this._ps.length = e.length), this._ps.length < 3))
        throw new Error('err polygon3d, ps count < 3: "' + this._ps.length + '"');
      this.setWithPointNormal(this._ps[0], t.normal);
      for (let e = 0, i = t.edgeXNormals.length; e !== i; ++e)
        this._edgeXNormals[e]
          ? this._edgeXNormals[e].copy(t.edgeXNormals[e])
          : (this._edgeXNormals[e] = t.edgeXNormals[e].clone());
      ((this._edgeXNormals.length = t.edgeXNormals.length), (this._geoCenter = null));
    }
    projectionInside(t, e, i) {
      const n = this._ps,
        r = this._edgeXNormals;
      let a,
        o = null,
        l = Plane.TmpV;
      for (var h = 0, c = n.length; h !== c; ++h) {
        if (
          (l.set(t, e, i).sub(n[h]),
          (a = r[h].dot(l)),
          !(null === o || (a > 0 && !0 === o) || (a <= 0 && !1 === o)))
        )
          return !1;
        null === o && (o = a > 0);
      }
      return !0;
    }
  };
}
