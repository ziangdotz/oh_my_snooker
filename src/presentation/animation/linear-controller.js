// Explicit live dependencies preserve initialization and shared state.
export default function createLinearController(dependencies) {
  return class LinearController extends dependencies.NumberController {
    constructor(t, e, i, s) {
      (super(s),
        (this.bias = t || 0.5),
        (this.gain = e || 0.2),
        (this.damping = i || 0.45),
        (this._v = 0));
    }
    update() {
      this.needsUpdate = !1;
      let t = this.tgt - this.crt;
      return (
        Math.abs(t) < this.eps
          ? ((this._v = 0), (this.crt = this.tgt))
          : ((this._v = this.bias * this._v + (1 - this.bias) * (this._v + t * this.gain)),
            (this.crt += this._v *= this.damping),
            (this.needsUpdate = !0)),
        this.needsUpdate
      );
    }
  };
}
