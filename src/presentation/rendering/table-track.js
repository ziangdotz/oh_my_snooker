// Explicit live dependencies preserve initialization and shared state.
export default function createTableTrack(dependencies) {
  return class TableTrack {
    get diagonal() {
      return this._diagonal;
    }
    constructor() {
      ((this.position = new dependencies.TrackVector()),
        (this.size = Object.create(null)),
        (this.size.w = 0),
        (this.size.h = 0),
        (this._diagonal = 0),
        (this.pockets = [
          TableTrack.makePocket(),
          TableTrack.makePocket(),
          TableTrack.makePocket(),
          TableTrack.makePocket(),
          TableTrack.makePocket(),
          TableTrack.makePocket(),
        ]));
    }
    reset(t, e, i, s, n) {
      (this.position.set(t, e, i), (this.size.w = s), (this.size.h = n));
      let r = this.pockets,
        a = 0.5 * s - 0.05,
        o = 0.5 * n - 0.05,
        l = 0.5 * n - 0.05 * 0.4,
        h = -Math.cos((65 * Math.PI) / 180);
      (TableTrack.setPocket(r[0], t - a, e, i - o, 1, 0, 1, 0.05, 0),
        TableTrack.setPocket(r[1], t - a, e, i + o, 1, 0, -1, 0.05, 0),
        TableTrack.setPocket(r[2], t, e, i - l, 0, 0, 1, 0.05, h),
        TableTrack.setPocket(r[3], t, e, i + l, 0, 0, -1, 0.05, h),
        TableTrack.setPocket(r[4], t + a, e, i - o, -1, 0, 1, 0.05, 0),
        TableTrack.setPocket(r[5], t + a, e, i + o, -1, 0, -1, 0.05, 0),
        (this._diagonal = Math.sqrt(s * s + n * n)));
    }
    static makePocket() {
      let t = Object.create(null);
      return (
        (t.position = new dependencies.TrackVector()),
        (t.normal = new dependencies.TrackVector()),
        (t.radius = 0),
        (t.maxHalfOpen = 0),
        t
      );
    }
    static setPocket(t, e, i, s, n, r, a, o, l) {
      (t.position.set(e, i, s),
        t.normal.set(n, r, a).normalize(),
        (t.radius = o),
        (t.maxHalfOpen = l));
    }
  };
}
