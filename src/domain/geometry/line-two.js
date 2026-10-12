// Explicit live dependencies preserve initialization and shared state.
export default function createLineTwo(dependencies) {
  return class LineTwo {
    constructor(t = 0, e = 0) {
      ((this.k = t), (this.b = e));
    }
    static createWithXYXY(t, e, i, s) {
      return new LineTwo().resetWithXYXY(t, e, i, s);
    }
    static createWithKXY(t, e, i) {
      return t === 1 / 0 || t === -1 / 0 ? new LineTwo(1 / 0, e) : new LineTwo(t, i - t * e);
    }
    static createWithX(t) {
      return new LineTwo(1 / 0, t);
    }
    static createWithY(t) {
      return new LineTwo(0, t);
    }
    resetWithXYXY(t, e, i, s) {
      if (t === i) {
        if (e === s) throw new Error('GEO2D.Line.resetWithXYXY: same points');
        ((this.k = 1 / 0), (this.b = t));
      } else ((this.k = (e - s) / (t - i)), (this.b = e - this.k * t));
      return this;
    }
    toString() {
      return isFinite(this.k)
        ? 0 == this.k
          ? 'y = ' + this.b
          : 'y = ' + this.k + ' * x + (' + this.b + ')'
        : 'x = ' + this.b;
    }
    hasXY(t, e, i) {
      return (
        void 0 === i && (i = dependencies.geometryPrecision),
        isFinite(this.k) ? Math.abs(e - (this.k * t + this.b)) <= i : Math.abs(t - this.b) <= i
      );
    }
    getX(t) {
      return isFinite(this.k) ? (0 === this.k ? NaN : (t - this.b) / this.k) : this.b;
    }
    getY(t) {
      return isFinite(this.k) ? this.k * t + this.b : NaN;
    }
    intersectWithLine(t, e) {
      if ((e.clear(), isFinite(this.k) || isFinite(t.k))) {
        if (isFinite(this.k)) {
          if (isFinite(t.k)) {
            let i = (t.b - this.b) / (this.k - t.k);
            return isNaN(i) ? e.setInfinity() : isFinite(i) ? e.add(i, this.getY(i)) : e;
          }
          return e.add(t.b, this.getY(t.b));
        }
        return e.add(this.b, t.getY(this.b));
      }
      return this.b === t.b ? e.setInfinity() : e;
    }
  };
}
