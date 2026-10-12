export default function quaternionModule(module, exports) {
  function Quaternion(t, e, i, s) {
    ((this.x = t || 0), (this.y = e || 0), (this.z = i || 0), (this.w = void 0 !== s ? s : 1));
  }
  ((Quaternion.prototype.toArray = function (t, e) {
    ((t[e] = this.x), (t[e + 1] = this.y), (t[e + 2] = this.z), (t[e + 3] = this.w));
  }),
    (Quaternion.prototype.fromArray = function (t, e) {
      return (
        (e = e || 0),
        (this.x = t[e]),
        (this.y = t[e + 1]),
        (this.z = t[e + 2]),
        (this.w = t[e + 3]),
        4
      );
    }),
    (Quaternion.prototype.toString = function () {
      return '{x:' + this.x + ',y:' + this.y + ',z:' + this.z + ',w:' + this.w;
    }),
    (Quaternion.prototype.set = function (t, e, i, s) {
      return ((this.x = t), (this.y = e), (this.z = i), (this.w = s), this);
    }),
    (Quaternion.prototype.setFromAngleAxis = function (t, e) {
      let i = Math.sin(e / 2);
      return (
        (this.w = Math.cos(e / 2)),
        (this.x = t.x * i),
        (this.y = t.y * i),
        (this.z = t.z * i),
        this
      );
    }),
    (Quaternion.prototype.setFromEuler = function (t, e, i, s) {
      let n = Math.cos(t / 2),
        r = Math.cos(e / 2),
        a = Math.cos(i / 2),
        o = Math.sin(t / 2),
        l = Math.sin(e / 2),
        h = Math.sin(i / 2);
      if (void 0 === s)
        return (
          (this.x = o * r * a + n * l * h),
          (this.y = n * l * a - o * r * h),
          (this.z = n * r * h + o * l * a),
          (this.w = n * r * a - o * l * h),
          this
        );
      switch (s) {
        case 'XYZ':
          return (
            (this.x = o * r * a + n * l * h),
            (this.y = n * l * a - o * r * h),
            (this.z = n * r * h + o * l * a),
            (this.w = n * r * a - o * l * h),
            this
          );
        case 'YXZ':
          return (
            (this.x = o * r * a + n * l * h),
            (this.y = n * l * a - o * r * h),
            (this.z = n * r * h - o * l * a),
            (this.w = n * r * a + o * l * h),
            this
          );
        case 'ZXY':
          return (
            (this.x = o * r * a - n * l * h),
            (this.y = n * l * a + o * r * h),
            (this.z = n * r * h + o * l * a),
            (this.w = n * r * a - o * l * h),
            this
          );
        case 'ZYX':
          return (
            (this.x = o * r * a - n * l * h),
            (this.y = n * l * a + o * r * h),
            (this.z = n * r * h - o * l * a),
            (this.w = n * r * a + o * l * h),
            this
          );
        case 'YZX':
          return (
            (this.x = o * r * a + n * l * h),
            (this.y = n * l * a + o * r * h),
            (this.z = n * r * h - o * l * a),
            (this.w = n * r * a - o * l * h),
            this
          );
        case 'XZY':
          return (
            (this.x = o * r * a - n * l * h),
            (this.y = n * l * a - o * r * h),
            (this.z = n * r * h + o * l * a),
            (this.w = n * r * a + o * l * h),
            this
          );
        default:
          throw new Error('Unknown order');
      }
    }),
    (Quaternion.prototype.clone = function () {
      return new Quaternion(this.x, this.y, this.z, this.w);
    }),
    (Quaternion.prototype.copy = function (t) {
      return ((this.x = t.x), (this.y = t.y), (this.z = t.z), (this.w = t.w), this);
    }),
    (Quaternion.prototype.normalize = function () {
      let t = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
      return (
        0 === t
          ? ((this.x = 0), (this.y = 0), (this.z = 0), (this.w = 1))
          : ((t = 1 / t),
            (this.x = this.x * t),
            (this.y = this.y * t),
            (this.z = this.z * t),
            (this.w = this.w * t)),
        this
      );
    }),
    (Quaternion.prototype.integrate = function (t, e) {
      e *= 0.5;
      let i = t.x,
        s = t.y,
        n = t.z,
        r = this.w,
        a = this.x,
        o = this.y,
        l = this.z,
        h = (-i * a - s * o - n * l) * e + r,
        c = (i * r + s * l - n * o) * e + a,
        d = (-i * l + s * r + n * a) * e + o,
        u = (i * o - s * a + n * r) * e + l,
        _ = 1 / Math.sqrt(h * h + c * c + d * d + u * u);
      return ((this.w = h * _), (this.x = c * _), (this.y = d * _), (this.z = u * _), this);
    }),
    (Quaternion.prototype.integrateQuad = function (t, e, i) {
      i *= 0.5;
      let s = e.x,
        n = e.y,
        r = e.z,
        a = t.w,
        o = t.x,
        l = t.y,
        h = t.z,
        c = (-s * o - n * l - r * h) * i + a,
        d = (s * a + n * h - r * l) * i + o,
        u = (-s * h + n * a + r * o) * i + l,
        _ = (s * l - n * o + r * a) * i + h,
        p = 1 / Math.sqrt(c * c + d * d + u * u + _ * _);
      return ((this.w = c * p), (this.x = d * p), (this.y = u * p), (this.z = _ * p), this);
    }),
    (Quaternion.prototype.slerpQuaternions = function (t, e, i) {
      let s,
        n,
        r = i,
        a = t.x * e.x + t.y * e.y + t.z * e.z + t.w * e.w,
        o = !1;
      if ((a < 0 && ((o = !0), (a = -a)), a > 0.999999)) ((n = 1 - r), (s = o ? -r : r));
      else {
        let t = Math.acos(a),
          e = 1 / Math.sin(t);
        ((n = Math.sin((1 - r) * t) * e), (s = o ? -Math.sin(r * t) * e : Math.sin(r * t) * e));
      }
      ((this.x = n * t.x + s * e.x),
        (this.y = n * t.y + s * e.y),
        (this.z = n * t.z + s * e.z),
        (this.w = n * t.w + s * e.w));
    }),
    (Quaternion.prototype.multiply = function (t) {
      let e = this.x,
        i = this.y,
        s = this.z,
        n = this.w,
        r = t.x,
        a = t.y,
        o = t.z,
        l = t.w;
      return (
        (this.x = e * l + n * r + i * o - s * a),
        (this.y = i * l + n * a + s * r - e * o),
        (this.z = s * l + n * o + e * a - i * r),
        (this.w = n * l - e * r - i * a - s * o),
        this
      );
    }),
    (module.exports = Quaternion));
}
