// Explicit live dependencies preserve initialization and shared state.
export default function createTrackBuffer(dependencies) {
  return class TrackBuffer {
    get totalFrames() {
      return this._totalFrames;
    }
    get stride() {
      return this._stride;
    }
    get maxKeyFrames() {
      return this._maxKeyFrames;
    }
    get data() {
      return this._data;
    }
    constructor(t, e) {
      ((this.ls = 0),
        (this.rs = 0),
        (this._maxKeyFrames = e),
        (this._stride = t),
        (this._totalFrames = 0),
        (this._data = new Float32Array(e * t)));
    }
    erase() {
      return ((this._totalFrames = 0), (this.ls = 0), (this.rs = 0), this);
    }
    dispose() {
      ((this._data = null),
        (this._totalFrames = 0),
        (this.ls = 0),
        (this.rs = 0),
        (this._maxKeyFrames = 0),
        (this._stride = 0));
    }
    updateRenderRatio(t) {
      if (0 === this._totalFrames) return 0;
      let e = this._data,
        i = this._stride,
        s = (this._totalFrames - 1) * i,
        n = this.ls,
        r = this.rs;
      if (t >= e[r]) {
        do {
          if (((n = r), r === s)) break;
          r += i;
        } while (t >= e[r]);
        ((this.ls = n), (this.rs = r));
      } else if (t < e[n]) {
        do {
          if (((r = n), 0 === n)) break;
          n -= i;
        } while (t < e[n]);
        ((this.ls = n), (this.rs = r));
      }
      let a = e[n],
        o = e[r],
        l = e[n + 1],
        h = t - a - l,
        c = o - a - l;
      return c < 1e-6 || h < 1e-6 ? 0 : h / c;
    }
    growToTick(t) {
      if (this._totalFrames < this._maxKeyFrames) {
        let e = this._data,
          i = this._totalFrames++ * this._stride;
        return ((e[i] = t), (e[i + 1] = 0), i + 2);
      }
      return -1;
    }
    extendsLife(t, e) {
      this._data[t + 1] += e;
    }
  };
}
