export default function matrixThreeModule(module, exports) {
  function MatrixThree() {
    this.data = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  }
  ((MatrixThree.prototype.toArray = function (t, e) {
    let i = this.data;
    for (let s = 0, n = i.length; s !== n; ++s) t[e + s] = i[s];
  }),
    (MatrixThree.prototype.toString = function () {
      let t = this.data;
      return (
        'Mat: [\n\t' +
        t[0] +
        ',' +
        t[1] +
        ',' +
        t[2] +
        '\n\t' +
        t[3] +
        ',' +
        t[4] +
        ',' +
        t[5] +
        '\n\t' +
        t[6] +
        ',' +
        t[7] +
        ',' +
        t[8] +
        ']'
      );
    }),
    (MatrixThree.prototype.transform = function (t, e) {
      let i = this.data,
        s = t.x * i[0] + t.y * i[1] + t.z * i[2],
        n = t.x * i[3] + t.y * i[4] + t.z * i[5],
        r = t.x * i[6] + t.y * i[7] + t.z * i[8];
      e.set(s, n, r);
    }),
    (MatrixThree.prototype.transformTranspose = function (t, e) {
      let i = this.data,
        s = t.x * i[0] + t.y * i[3] + t.z * i[6],
        n = t.x * i[1] + t.y * i[4] + t.z * i[7],
        r = t.x * i[2] + t.y * i[5] + t.z * i[8];
      e.set(s, n, r);
    }),
    (MatrixThree.prototype.set = function (t, e, i, s, n, r, a, o, l) {
      let h = this.data;
      return (
        (h[0] = t),
        (h[1] = s),
        (h[2] = a),
        (h[3] = e),
        (h[4] = n),
        (h[5] = o),
        (h[6] = i),
        (h[7] = r),
        (h[8] = l),
        this
      );
    }),
    (MatrixThree.prototype.identity = function () {
      return (this.set(1, 0, 0, 0, 1, 0, 0, 0, 1), this);
    }),
    (MatrixThree.prototype.clone = function () {
      return new MatrixThree().fromArray(this.data);
    }),
    (MatrixThree.prototype.fromArray = function (t, e) {
      void 0 === e && (e = 0);
      for (let i = 0; i < 9; i++) this.data[i] = t[i + e];
      return 9;
    }),
    (MatrixThree.prototype.copy = function (t) {
      let e = t.data;
      return (this.set(e[0], e[3], e[6], e[1], e[4], e[7], e[2], e[5], e[8]), this);
    }),
    (MatrixThree.prototype.multiplyScalar = function (t) {
      let e = this.data;
      return (
        (e[0] *= t),
        (e[3] *= t),
        (e[6] *= t),
        (e[1] *= t),
        (e[4] *= t),
        (e[7] *= t),
        (e[2] *= t),
        (e[5] *= t),
        (e[8] *= t),
        this
      );
    }),
    (MatrixThree.prototype.multiply = function (t) {
      let e = this.data,
        i = t.data,
        s = e[0] * i[0] + e[1] * i[3] + e[2] * i[6],
        n = e[0] * i[1] + e[1] * i[4] + e[2] * i[7],
        r = e[0] * i[2] + e[1] * i[5] + e[2] * i[8];
      return (
        (e[0] = s),
        (e[1] = n),
        (e[2] = r),
        (s = e[3] * i[0] + e[4] * i[3] + e[5] * i[6]),
        (n = e[3] * i[1] + e[4] * i[4] + e[5] * i[7]),
        (r = e[3] * i[2] + e[4] * i[5] + e[5] * i[8]),
        (e[3] = s),
        (e[4] = n),
        (e[5] = r),
        (s = e[6] * i[0] + e[7] * i[3] + e[8] * i[6]),
        (n = e[6] * i[1] + e[7] * i[4] + e[8] * i[7]),
        (r = e[6] * i[2] + e[7] * i[5] + e[8] * i[8]),
        (e[6] = s),
        (e[7] = n),
        (e[8] = r),
        this
      );
    }),
    (MatrixThree.prototype.add = function (t) {
      let e = this.data,
        i = t.data;
      return (
        (e[0] += i[0]),
        (e[1] += i[1]),
        (e[2] += i[2]),
        (e[3] += i[3]),
        (e[4] += i[4]),
        (e[5] += i[5]),
        (e[6] += i[6]),
        (e[7] += i[7]),
        (e[8] += i[8]),
        this
      );
    }),
    (MatrixThree.prototype.addToDiagonal = function (t) {
      let e = this.data;
      return ((e[0] += t), (e[4] += t), (e[8] += t), this);
    }),
    (MatrixThree.prototype.setInverse = function (t) {
      let e = t.data,
        i = this.data,
        s = e[0],
        n = e[1],
        r = e[2],
        a = e[3],
        o = e[4],
        l = e[5],
        h = e[6],
        c = e[7],
        d = e[8],
        u = d * o - l * c,
        _ = l * h - d * a,
        p = c * a - o * h,
        f = s * u + n * _ + r * p;
      if (0 === f)
        return (
          console.warn("setInverse(): can't invert matrix, determinant is 0"),
          this.identity()
        );
      let g = 1 / f;
      return (
        (i[0] = u * g),
        (i[1] = (r * c - d * n) * g),
        (i[2] = (l * n - r * o) * g),
        (i[3] = _ * g),
        (i[4] = (d * s - r * h) * g),
        (i[5] = (r * a - l * s) * g),
        (i[6] = p * g),
        (i[7] = (n * h - c * s) * g),
        (i[8] = (o * s - n * a) * g),
        this
      );
    }),
    (MatrixThree.prototype.setTranspose = function (t) {
      let e = this.data,
        i = t.data;
      return (
        (e[0] = i[0]),
        (e[1] = i[3]),
        (e[2] = i[6]),
        (e[3] = i[1]),
        (e[4] = i[4]),
        (e[5] = i[7]),
        (e[6] = i[2]),
        (e[7] = i[5]),
        (e[8] = i[8]),
        this
      );
    }),
    (MatrixThree.prototype.transpose = function () {
      let t,
        e = this.data;
      return (
        (t = e[1]),
        (e[1] = e[3]),
        (e[3] = t),
        (t = e[2]),
        (e[2] = e[6]),
        (e[6] = t),
        (t = e[5]),
        (e[5] = e[7]),
        (e[7] = t),
        this
      );
    }),
    (MatrixThree.prototype.setSkewSymmetric = function (t) {
      let e = this.data;
      return (
        (e[0] = e[4] = e[8] = 0),
        (e[1] = -t.z),
        (e[2] = t.y),
        (e[3] = t.z),
        (e[5] = -t.x),
        (e[6] = -t.y),
        (e[7] = t.x),
        this
      );
    }),
    (MatrixThree.prototype.setComponents = function (t, e, i) {
      let s = this.data;
      ((s[0] = t.x),
        (s[1] = e.x),
        (s[2] = i.x),
        (s[3] = t.y),
        (s[4] = e.y),
        (s[5] = i.y),
        (s[6] = t.z),
        (s[7] = e.z),
        (s[8] = i.z));
    }),
    (module.exports = MatrixThree));
}
