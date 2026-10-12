// Integrate the 60 Hz input filter and inertia in elapsed seconds; geometry stays inherited.
export default function createTimedOrbitController(OrbitController) {
  return class TimedOrbitController extends OrbitController {
    constructor(...args) {
      super(...args);
      this.frameDelta = 1 / 60;
    }

    update(state, transition, position) {
      const delta = Math.max(0, Math.min(this.frameDelta, 0.1));
      const steps = Math.max(1, Math.ceil(delta * 120));
      const frames = (delta * 60) / steps;
      const input = this._orbitSpd;
      const target = input.tgt;
      // Faster input release leaves a short, consistent glide after key-up.
      const filter = target === 0 ? 0.75 : 1 - 1 / input.step;
      const inertia = this._inertia;
      let active = false;
      for (let index = 0; index < steps; index++) {
        const filterPower = Math.pow(filter, frames);
        const inertiaPower = Math.pow(inertia, frames);
        const inputError = input.crt - target;
        const steadyVelocity = (inertia * target) / (1 - inertia);
        const velocityError = this._angularSpd - steadyVelocity;
        const filterSum = (1 - filterPower) / (1 - filter);
        const inertiaSum = (1 - inertiaPower) / (1 - inertia);
        const displacement =
          frames * steadyVelocity +
          inertia * inertiaSum * velocityError +
          ((inertia * filter) / (filter - inertia)) *
            (filter * filterSum - inertia * inertiaSum) *
            inputError;
        let velocity =
          steadyVelocity +
          inertiaPower * velocityError +
          ((inertia * filter * (filterPower - inertiaPower)) / (filter - inertia)) * inputError;
        let nextInput = target + filterPower * inputError;
        if (target === 0 && Math.abs(nextInput) < 2e-6 && Math.abs(velocity) < 2e-4) {
          velocity = 0;
          nextInput = 0;
        }
        // Retain inherited intersections/transition geometry while integrating angle here.
        input.crt = 0;
        input.needsUpdate = false;
        this._angularSpd = 0;
        super.update(state, transition, position);
        if (displacement !== 0) {
          const track = this._tracks[state];
          track.angle +=
            displacement *
            (1 + (track.scaleX - 1) * (1 - Math.abs(Math.sin(track.angle)))) *
            (0.2 * transition.renderedRatio + 0.8);
          this._ctlPointsDirty = true;
          super.update(state, transition, position);
        }
        this._angularSpd = velocity;
        input.crt = nextInput;
        input.needsUpdate = Math.abs(nextInput - target) > 1e-7;
        active = input.needsUpdate || velocity !== 0;
      }
      return active;
    }
  };
}
