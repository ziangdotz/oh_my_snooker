// Explicit live dependencies preserve initialization and shared state.
export default function createVectorTwo(dependencies) {
  return class VectorTwo {
    constructor(t = 0, e = 0) {
      ((this.x = t), (this.y = e));
    }
    set(t, e) {
      return ((this.x = t), (this.y = e), this);
    }
    copy(t) {
      return ((this.x = t.x), (this.y = t.y), this);
    }
    clone() {
      return new VectorTwo(this.x, this.y);
    }
    toString() {
      return '{' + this.x + ', ' + this.y + '}';
    }
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    normalize() {
      const t = this.length();
      if (t > 0) {
        const e = 1 / t;
        ((this.x *= e), (this.y *= e));
      } else ((this.x = 0), (this.y = 0));
      return this;
    }
    normalizeVector(t) {
      const e = t.length();
      if (e > 0) {
        const i = 1 / e;
        ((this.x = t.x * i), (this.y = t.y * i));
      } else ((this.x = 0), (this.y = 0));
      return this;
    }
    add(t) {
      return ((this.x += t.x), (this.y += t.y), this);
    }
    addVectors(t, e) {
      return ((this.x = t.x + e.x), (this.y = t.y + e.y), this);
    }
    addScaled(t, e) {
      ((this.x += t.x * e), (this.y += t.y * e));
    }
    interpolate(t, e, i) {
      return ((this.x = t.x + e.x * i), (this.y = t.y + e.y * i), this);
    }
    sub(t) {
      return ((this.x -= t.x), (this.y -= t.y), this);
    }
    subVectors(t, e) {
      return ((this.x = t.x - e.x), (this.y = t.y - e.y), this);
    }
    dot(t) {
      return this.x * t.x + this.y * t.y;
    }
    distanceToSq(t) {
      let e = this.x - t.x,
        i = this.y - t.y;
      return e * e + i * i;
    }
    distanceTo(t) {
      let e = this.x - t.x,
        i = this.y - t.y;
      return Math.sqrt(e * e + i * i);
    }
    scale(t) {
      return ((this.x *= t), (this.y *= t), this);
    }
    scaleVector(t, e) {
      return ((this.x = t * e.x), (this.y = t * e.y), this);
    }
    isZero() {
      return 0 === this.x && 0 === this.y;
    }
    almostZero() {
      const t = dependencies.geometryPrecision;
      return !(Math.abs(this.x) > t || Math.abs(this.y) > t);
    }
    almostEquals(t) {
      const e = dependencies.geometryPrecision;
      return !(Math.abs(this.x - t.x) > e || Math.abs(this.y - t.y) > e);
    }
    lerp(t, e) {
      return ((this.x += (t.x - this.x) * e), (this.y += (t.y - this.y) * e), this);
    }
  };
}
