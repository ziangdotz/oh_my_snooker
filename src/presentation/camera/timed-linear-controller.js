// Fractional powers of the original 60 Hz spring preserve its response at any frame rate.
export default function createTimedLinearController(LinearController) {
  return class TimedLinearController extends LinearController {
    constructor(...args) {
      super(...args);
      this.frameDelta = 1 / 60;
    }

    update() {
      const frames = Math.max(0, Math.min(this.frameDelta, 0.1)) * 60;
      if (frames === 0) {
        return this.needsUpdate;
      }
      const error = this.tgt - this.crt;
      if (Math.abs(error) < this.eps && Math.abs(this._v) < this.eps) {
        this.crt = this.tgt;
        this._v = 0;
        this.needsUpdate = false;
        return false;
      }
      const spring = (1 - this.bias) * this.gain;
      const damping = this.damping;
      const halfTrace = (1 - damping * spring + damping) / 2;
      const discriminant = halfTrace * halfTrace - damping;
      let alpha;
      let beta;
      if (discriminant > 1e-12) {
        const root = Math.sqrt(discriminant);
        const high = halfTrace + root;
        const low = halfTrace - root;
        const highPower = Math.pow(high, frames);
        const lowPower = Math.pow(low, frames);
        alpha = (highPower - lowPower) / (high - low);
        beta = (high * lowPower - low * highPower) / (high - low);
      } else if (discriminant < -1e-12) {
        const radius = Math.sqrt(damping);
        const angle = Math.acos(halfTrace / radius);
        const scale = Math.pow(radius, frames);
        alpha = (scale * Math.sin(frames * angle)) / (radius * Math.sin(angle));
        beta = scale * Math.cos(frames * angle) - alpha * halfTrace;
      } else {
        alpha = frames * Math.pow(halfTrace, frames - 1);
        beta = (1 - frames) * Math.pow(halfTrace, frames);
      }
      const nextError = (alpha * (1 - damping * spring) + beta) * error - alpha * damping * this._v;
      this._v = alpha * damping * spring * error + (alpha * damping + beta) * this._v;
      this.crt = this.tgt - nextError;
      this.needsUpdate = true;
      return true;
    }
  };
}
