export default function rollingAverageModule(module, exports) {
  module.exports = class RollingAverage {
    get avg() {
      return this.counter
        ? this.counter > this.length
          ? this.sum / this.length
          : this.sum / this.counter
        : 0;
    }
    constructor(t) {
      ((this.a = new Float32Array(t)),
        (this.counter = 0),
        (this.length = t),
        (this.sum = 0),
        (this.current = 0),
        (this.peak = 0));
    }
    push(t) {
      this.sum += t;
      let e = this.counter++ % this.length,
        i = this.a[e];
      ((this.sum -= i),
        (this.a[e] = t),
        (this.current = t),
        i >= this.peak - 1e-5 && (this.peak = this.updatePeak()),
        t > this.peak && (this.peak = t));
    }
    updatePeak() {
      let t = this.a,
        e = Number.NEGATIVE_INFINITY;
      for (let i = 0, s = t.length; i !== s; ++i) t[i] > e && (e = t[i]);
      return e;
    }
  };
}
