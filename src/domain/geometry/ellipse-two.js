// Explicit live dependencies preserve initialization and shared state.
export default function createEllipseTwo(dependencies) {
  return class EllipseTwo {
    constructor(t = 1, e = 1, i = 0, s = 0) {
      ((this.cx = i),
        (this.cy = s),
        (this.a = t),
        (this.b = e),
        (this.aa = t * t),
        (this.bb = e * e),
        (this.aabb = this.aa * this.bb));
    }
    static createWithScaledCircle(t, e, i, s, n) {
      return new EllipseTwo(t * i, e * i, s, n);
    }
    resetWithScaledCircle(t, e, i, s = 0, n = 0) {
      ((this.cx = s),
        (this.cy = n),
        (this.a = t * i),
        (this.b = e * i),
        (this.aa = this.a * this.a),
        (this.bb = this.b * this.b),
        (this.aabb = this.aa * this.bb));
    }
    hasXY(t, e, i) {
      void 0 === i && (i = dependencies.geometryPrecision);
      let s = t - this.cx,
        n = e - this.cy;
      return Math.abs((s * s) / this.aa + (n * n) / this.bb - 1) <= i;
    }
    angleToCenter(t, e) {
      return Math.atan2((e - this.cy) * this.a, (t - this.cx) * this.b);
    }
    intersectWithLine(t, e) {
      e.clear();
      const i = dependencies.geometryPrecision;
      let s, n, r, a, o, l;
      if (Math.abs(t.k) < i) {
        if (
          ((n = t.b),
          ((r = dependencies.ellipseIntersections).length = 0),
          this.getXs(n, r),
          0 === r.length)
        )
          return e;
        for (o = 0, l = r.length; o < l; ++o) e.add(r[o], n);
        return e;
      }
      if (isFinite(t.k)) {
        let n = this.aa * t.b,
          r = this.cx * this.bb,
          a = this.cy * this.aa,
          o = this.bb + this.aa * t.k * t.k,
          l = t.k * n - r - t.k * a,
          h =
            l * l -
            o * (this.cx * r + this.aa * t.b * t.b + this.cy * a - this.aabb - 2 * this.cy * n);
        return (
          h > i
            ? ((h = Math.sqrt(h)),
              (s = (-l + h) / o),
              e.add(s, t.getY(s)),
              (s = (-l - h) / o),
              e.add(s, t.getY(s)))
            : h > -i && ((s = -l / o), e.add(s, t.getY(s))),
          e
        );
      }
      if (
        ((s = t.b),
        ((a = dependencies.ellipseIntersections).length = 0),
        this.getYs(s, a),
        0 === a.length)
      )
        return e;
      for (o = 0, l = a.length; o < l; ++o) e.add(s, a[o]);
      return e;
    }
    getXs(t, e) {
      const i = dependencies.geometryPrecision;
      let s,
        n = (t - this.cy) * (t - this.cy);
      n > this.bb + i ||
        (n > this.bb - i
          ? e.push(this.cx)
          : ((s = Math.sqrt(1 - n / this.bb)),
            e.push(this.a * s + this.cx, -this.a * s + this.cx)));
    }
    getYs(t, e) {
      const i = dependencies.geometryPrecision;
      let s,
        n = (t - this.cx) * (t - this.cx);
      n > this.aa + i ||
        (n >= this.aa - i
          ? e.push(this.cy)
          : ((s = Math.sqrt(1 - n / this.aa)),
            e.push(this.b * s + this.cy, -this.b * s + this.cy)));
    }
    toString() {
      return (
        '(x - ' + this.cx + ')^2 / ' + this.a + '^2 + (y-' + this.cy + ')^2 / ' + this.b + '^2 = 1'
      );
    }
  };
}
