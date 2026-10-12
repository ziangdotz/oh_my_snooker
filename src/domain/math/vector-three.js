export default function vectorThreeModule(module, exports) {
  function VectorThree(t, e, i) {
    ((this.x = t || 0), (this.y = e || 0), (this.z = i || 0));
  }
  ((VectorThree.ZERO = new VectorThree(0, 0, 0)),
    (VectorThree.UNIT_X = new VectorThree(1, 0, 0)),
    (VectorThree.UNIT_Y = new VectorThree(0, 1, 0)),
    (VectorThree.UNIT_Z = new VectorThree(0, 0, 1)),
    (VectorThree.EPSILON = 1e-6),
    (VectorThree.prototype.toArray = function (t, e) {
      ((t[e] = this.x), (t[e + 1] = this.y), (t[e + 2] = this.z));
    }),
    (VectorThree.prototype.fromArray = function (t, e) {
      return ((e = e || 0), (this.x = t[e]), (this.y = t[e + 1]), (this.z = t[e + 2]), 3);
    }),
    (VectorThree.prototype.set = function (t, e, i) {
      return ((this.x = t), (this.y = e), (this.z = i), this);
    }),
    (VectorThree.prototype.setZero = function () {
      return ((this.x = this.y = this.z = 0), this);
    }),
    (VectorThree.prototype.copy = function (t) {
      return ((this.x = t.x), (this.y = t.y), (this.z = t.z), this);
    }),
    (VectorThree.prototype.copyNeg = function (t) {
      return ((this.x = -t.x), (this.y = -t.y), (this.z = -t.z), this);
    }),
    (VectorThree.prototype.clone = function () {
      return new VectorThree(this.x, this.y, this.z);
    }),
    (VectorThree.prototype.lengthSq = function () {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }),
    (VectorThree.prototype.length = function () {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }),
    (VectorThree.prototype.normalize = function () {
      const t = this.length();
      if (t > 0) {
        const e = 1 / t;
        ((this.x *= e), (this.y *= e), (this.z *= e));
      } else ((this.x = 0), (this.y = 0), (this.z = 0));
      return this;
    }),
    (VectorThree.prototype.normalizeVector = function (t) {
      const e = t.length();
      if (e > 0) {
        const i = 1 / e;
        ((this.x = t.x * i), (this.y = t.y * i), (this.z = t.z * i));
      } else ((this.x = 0), (this.y = 0), (this.z = 0));
      return this;
    }),
    (VectorThree.prototype.add = function (t) {
      return ((this.x += t.x), (this.y += t.y), (this.z += t.z), this);
    }),
    (VectorThree.prototype.addScaled = function (t, e) {
      return ((this.x += t.x * e), (this.y += t.y * e), (this.z += t.z * e), this);
    }),
    (VectorThree.prototype.interpolate = function (t, e, i) {
      return ((this.x = t.x + e.x * i), (this.y = t.y + e.y * i), (this.z = t.z + e.z * i), this);
    }),
    (VectorThree.prototype.addVectors = function (t, e) {
      return ((this.x = t.x + e.x), (this.y = t.y + e.y), (this.z = t.z + e.z), this);
    }),
    (VectorThree.prototype.sub = function (t) {
      return ((this.x -= t.x), (this.y -= t.y), (this.z -= t.z), this);
    }),
    (VectorThree.prototype.subVectors = function (t, e) {
      return ((this.x = t.x - e.x), (this.y = t.y - e.y), (this.z = t.z - e.z), this);
    }),
    (VectorThree.prototype.cross = function (t) {
      let e = this.x,
        i = this.y,
        s = this.z;
      return (
        (this.x = i * t.z - s * t.y),
        (this.y = s * t.x - e * t.z),
        (this.z = e * t.y - i * t.x),
        this
      );
    }),
    (VectorThree.prototype.crossVectors = function (t, e) {
      let i = t.x,
        s = t.y,
        n = t.z,
        r = e.x,
        a = e.y,
        o = e.z;
      return ((this.x = s * o - n * a), (this.y = n * r - i * o), (this.z = i * a - s * r), this);
    }),
    (VectorThree.prototype.setCrossThenAdd = function (t, e, i) {
      let s = t.x,
        n = t.y,
        r = t.z,
        a = e.x,
        o = e.y,
        l = e.z;
      return (
        (this.x = n * l - r * o + i.x),
        (this.y = r * a - s * l + i.y),
        (this.z = s * o - n * a + i.z),
        this
      );
    }),
    (VectorThree.prototype.distanceToSq = function (t) {
      let e = this.x - t.x,
        i = this.y - t.y,
        s = this.z - t.z;
      return e * e + i * i + s * s;
    }),
    (VectorThree.prototype.distanceTo = function (t) {
      let e = this.x - t.x,
        i = this.y - t.y,
        s = this.z - t.z;
      return Math.sqrt(e * e + i * i + s * s);
    }),
    (VectorThree.prototype.scale = function (t) {
      return ((this.x *= t), (this.y *= t), (this.z *= t), this);
    }),
    (VectorThree.prototype.scaleVector = function (t, e) {
      return ((this.x = t * e.x), (this.y = t * e.y), (this.z = t * e.z), this);
    }),
    (VectorThree.prototype.multiply = function (t) {
      return ((this.x *= t.x), (this.y *= t.y), (this.z *= t.z), this);
    }),
    (VectorThree.prototype.negate = function () {
      return ((this.x = -this.x), (this.y = -this.y), (this.z = -this.z), this);
    }),
    (VectorThree.prototype.dot = function (t) {
      return this.x * t.x + this.y * t.y + this.z * t.z;
    }),
    (VectorThree.prototype.isZero = function () {
      return 0 === this.x && 0 === this.y && 0 === this.z;
    }),
    (VectorThree.prototype.almostZero = function (t) {
      return (
        void 0 === t && (t = VectorThree.EPSILON),
        !(Math.abs(this.x) > t || Math.abs(this.y) > t || Math.abs(this.z) > t)
      );
    }),
    (VectorThree.prototype.almostEquals = function (t) {
      const e = VectorThree.EPSILON,
        s = Math.abs;
      return !(s(this.x - t.x) > e || s(this.y - t.y) > e || s(this.z - t.z) > e);
    }),
    (VectorThree.prototype.toString = function () {
      return '{' + this.x + ', ' + this.y + ', ' + this.z + '}';
    }),
    (VectorThree.prototype.lerp = function (t, e) {
      return (
        (this.x += (t.x - this.x) * e),
        (this.y += (t.y - this.y) * e),
        (this.z += (t.z - this.z) * e),
        this
      );
    }),
    (VectorThree.prototype.applyQuaternion = function (t) {
      let e = this.x,
        i = this.y,
        s = this.z,
        n = t.x,
        r = t.y,
        a = t.z,
        o = t.w,
        l = o * e + r * s - a * i,
        h = o * i + a * e - n * s,
        c = o * s + n * i - r * e,
        d = -n * e - r * i - a * s;
      return (
        (this.x = l * o + d * -n + h * -a - c * -r),
        (this.y = h * o + d * -r + c * -n - l * -a),
        (this.z = c * o + d * -a + l * -r - h * -n),
        this
      );
    }),
    (VectorThree.prototype.vectorApplyQuaternion = function (t, e) {
      let i = e.x,
        s = e.y,
        n = e.z,
        r = t.x,
        a = t.y,
        o = t.z,
        l = t.w,
        h = l * i + a * n - o * s,
        c = l * s + o * i - r * n,
        d = l * n + r * s - a * i,
        u = -r * i - a * s - o * n;
      return (
        (this.x = h * l + u * -r + c * -o - d * -a),
        (this.y = c * l + u * -a + d * -r - h * -o),
        (this.z = d * l + u * -o + h * -a - c * -r),
        this
      );
    }),
    (module.exports = VectorThree));
}
