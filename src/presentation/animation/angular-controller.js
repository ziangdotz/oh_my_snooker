// Explicit live dependencies preserve initialization and shared state.
export default function createAngularController(dependencies) {
  return class AngularController extends dependencies.NumberController {
    constructor(t, e) {
      (super(e), (this.step = t || 9), (this.maxSpeed = 0));
    }
    update() {
      let t,
        e,
        i = this.tgt - this.crt;
      return (
        (this.needsUpdate = !1),
        Math.abs(i) < this.eps
          ? (this.crt = this.tgt)
          : ((t = i / this.step),
            0 !== (e = this.maxSpeed) && (t > e ? (t = e) : t < -e && (t = -e)),
            (this.crt += t),
            (this.needsUpdate = !0)),
        this.needsUpdate
      );
    }
  };
}
