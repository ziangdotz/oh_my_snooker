// Explicit live dependencies preserve initialization and shared state.
export default function createFrameClock(dependencies) {
  return class FrameClock {
    get dt() {
      return this._dt;
    }
    get duration() {
      return this._duration;
    }
    get frames() {
      return this._frames;
    }
    constructor() {
      ((this._now = 0),
        (this._dt = 0),
        (this._duration = 0),
        (this._frames = 0),
        (this.timeScale = 1));
    }
    reset(t) {
      return (
        (this._now = void 0 !== t ? t : 0.001 * Date.now()),
        (this._dt = 0),
        (this._duration = 0),
        (this._frames = 0),
        this._dt
      );
    }
    tick() {
      let t = 0.001 * Date.now();
      return (
        (this._dt = (t - this._now) * this.timeScale),
        (this._duration += this._dt),
        (this._now = t),
        this._frames++,
        this._dt
      );
    }
    tickFixed(t) {
      return (
        (this._dt = t * this.timeScale),
        (this._duration += this._dt),
        (this._now += t),
        this._frames++,
        this._dt
      );
    }
  };
}
