/** Own this type family and its shared state once per game composition. */
export default function createCueContactState(dependencies) {
  const ci = dependencies.physicsApi.a.Vec3.EPSILON,
    di = (t, e, i, n, r) => {
      const a = dependencies.Babylon.Vector3.Dot(i, t),
        o = n - r;
      if (o > 0 && a > 0) {
        return Number.MAX_VALUE;
      }
      const l = e,
        h = a * a - l * o;
      if (h <= 0) {
        return Number.MAX_VALUE;
      }
      let c = (-a - Math.sqrt(h)) / l;
      return (c < ci && (c = 0), c);
    },
    ui = new dependencies.physicsApi.a.Vec3(),
    _i = (t, e, i, s, n, r, a, o) => {
      const l = a.length;
      if (0 === l) {
        return;
      }
      const h = n + r,
        c = h * h;
      let d;
      let u;
      let _;
      const p = ui;
      const f = ci;
      for (let n = 0, r = l; n !== r; ++n) {
        if (
          ((u = a[n].position),
          p.subVectors(t, u),
          !(p.dot(e) > 0) && ((d = i.signedDistance(u)), Math.abs(d) - h < -f))
        ) {
          (_ = o.next()).reset(
            u.x - i.normal.x * d,
            u.y - i.normal.y * d,
            u.z - i.normal.z * d,
            Math.sqrt(c - d * d),
          );
          const e = ui.subVectors(_.center, t);
          _.escape = _.radius + e.dot(s);
        }
      }
    },
    pi = (t, e, i) => {
      const s = t.x * e[0] + t.y * e[4] + t.z * e[8] + e[12],
        n = t.x * e[1] + t.y * e[5] + t.z * e[9] + e[13],
        r = t.x * e[2] + t.y * e[6] + t.z * e[10] + e[14],
        a = t.x * e[3] + t.y * e[7] + t.z * e[11] + e[15];
      ((i.x = s / a), (i.y = n / a), (i.z = r / a));
    },
    fi = new dependencies.Plane.a(),
    gi = dependencies.physicsApi.a.Vec3.UNIT_Y,
    mi = new dependencies.physicsApi.a.Vec3(0, 0, 0),
    yi = new dependencies.physicsApi.a.Vec3(0, 0, 0),
    vi = new dependencies.physicsApi.a.Quaternion(0, 0, 0, 1),
    bi = new (class {
      get length() {
        return this._length;
      }
      get array() {
        return this._array;
      }
      constructor(t, e = 3) {
        ((this._itemClass = t), (this._length = 0), (this._array = []));
        for (let t = 0, i = e; t !== i; ++t) {
          this._array.push(new this._itemClass());
        }
      }
      empty() {
        return ((this._length = 0), this);
      }
      next() {
        let t = this._array[this._length++];
        return (t || ((t = new this._itemClass()), this._array.push(t)), t);
      }
    })(
      class {
        constructor() {
          ((this.center = new dependencies.physicsApi.a.Vec3(0, 0, 0)),
            (this.radius = 0),
            (this.escape = 0));
        }
        reset(t, e, i, s) {
          (this.center.set(t, e, i), (this.radius = s));
        }
      },
      6,
    ),
    xi = Object.create(null);
  ((xi.ANGLE_H = 1),
    (xi.WOR_TRANSFORM = 2),
    (xi.LOC_TIP = 4),
    (xi.WOR_PROJECTION = 8),
    (xi.POTENTIAL_TOUCHES = 16),
    (xi.CORRECTION = 32));
  const Si = () => {
    const t = Object.create(null);
    return (
      (t.ballRadius = NaN),
      (t.stickName = void 0),
      (t.tipRadius = NaN),
      (t.midRadius = NaN),
      (t.stickLen = NaN),
      (t.ballNTipRadiusSq = NaN),
      (t.maxTipOffset = NaN),
      (t.maxTipOffsetSq = NaN),
      t
    );
  };

  return { ci, di, _i, pi, fi, gi, mi, yi, vi, bi, xi, Si };
}
