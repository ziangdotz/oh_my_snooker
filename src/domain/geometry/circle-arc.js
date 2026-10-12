export default function circleArcModule(module, exports, loadModule) {
  const s = loadModule('domain/physics/physics-api').Vec3,
    Plane = loadModule('domain/geometry/plane');
  module.exports = class CircleArc extends Plane {
    get radius() {
      return this._radius;
    }
    get center() {
      return this._center;
    }
    get arcDir() {
      return this._arcDir;
    }
    get geoCenter() {
      return (
        this._geoCenter ||
          (this._geoCenter = this._center.clone().addScaled(this._arcDir, 0.5 * this._radius)),
        this._geoCenter
      );
    }
    get diameterDir() {
      return this._diameterDir;
    }
    get diameterA() {
      return this._diameterA;
    }
    get diameterB() {
      return this._diameterB;
    }
    constructor() {
      (super(),
        (this._center = new s()),
        (this._radius = 0),
        (this._arcDir = new s()),
        (this._diameterA = new s()),
        (this._diameterB = new s()),
        (this._diameterDir = new s()),
        (this._geoCenter = null));
    }
    resetWithCenterTopNormal(t, e, i, s, n, r, a) {
      (this._center.set(t, e, i),
        this.setWithPointNormal(this._center, a),
        this._arcDir.set(s, n, r).sub(this._center),
        (this._radius = this._arcDir.length()),
        this._arcDir.normalize(),
        this._diameterDir.crossVectors(a, this._arcDir).normalize(),
        this._diameterA.interpolate(this._center, this._diameterDir, -this._radius),
        this._diameterB.interpolate(this._center, this._diameterDir, this._radius),
        (this._geoCenter = null));
    }
    projectionInside(t, e, i) {
      if (Plane.TmpV.set(t, e, i).sub(this._center).dot(this._arcDir) < 0) return !1;
      let s = Plane.TmpV.set(t, e, i),
        r = this.signedDistance(s);
      return s.addScaled(this.normal, -r).distanceToSq(this._center) <= this._radius * this._radius;
    }
    toString() {
      return (
        '{c: ' +
        this._center.toString() +
        ', n: ' +
        this.normal.toString() +
        ', radius: ' +
        this._radius +
        '}'
      );
    }
  };
}
