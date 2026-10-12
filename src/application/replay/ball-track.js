// Explicit live dependencies preserve initialization and shared state.
export default function createBallTrack(dependencies) {
  return class BallTrack extends dependencies.BaseTrack {
    constructor(t, e) {
      super(7, t, e);
    }
    _shouldRecordingKeyFrame(t) {
      let e = this._source[0],
        i = this._timeline.data;
      return 0 !== i[t] && (1 !== i[t] || !e.asleep);
    }
    _recordFrame(t) {
      let e = this._source[0],
        i = this._source[1],
        s = this._timeline.data;
      s[t] = e.active ? (e.asleep ? 1 : 2) : 0;
      let n = e.position;
      ((s[t + 1] = n.x), (s[t + 2] = n.y), (s[t + 3] = n.z), (s[t + 4] = i.alpha));
    }
    _renderF0(t) {
      let e = this._timeline.data,
        i = this._actor;
      if (0 === e[t]) return ((i.isVisible = !1), void (i.shadow.alpha = 0));
      ((i.isVisible = !0),
        (i.position.x = e[t + 1]),
        (i.position.y = e[t + 2]),
        (i.position.z = e[t + 3]),
        i.shadow.copyPositionXYZ(e[t + 1], 0, e[t + 3]),
        (i.shadow.alpha = e[t + 4]));
    }
    _renderF0F1(t, e, i) {
      let s = this._timeline.data,
        n = this._actor;
      if (0 === s[t]) return ((n.isVisible = !1), void (n.shadow.alpha = 0));
      {
        n.isVisible = !0;
        let r = s[t + 1] + (s[e + 1] - s[t + 1]) * i,
          a = s[t + 2] + (s[e + 2] - s[t + 2]) * i,
          o = s[t + 3] + (s[e + 3] - s[t + 3]) * i;
        (n.position.copyFromFloats(r, a, o),
          n.shadow.copyPositionXYZ(r, 0, o),
          (n.shadow.alpha = s[t + 4] + (s[e + 4] - s[t + 4]) * i));
      }
    }
    get data() {
      return this._timeline.data;
    }
    get stride() {
      return this._timeline.stride;
    }
    static get dataOffsetX() {
      return 3;
    }
    static get dataOffsetY() {
      return 4;
    }
    static get dataOffsetZ() {
      return 5;
    }
    static get dataOffsetActiveSleep() {
      return 2;
    }
  };
}
