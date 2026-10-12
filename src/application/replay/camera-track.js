// Explicit live dependencies preserve initialization and shared state.
export default function createCameraTrack(dependencies) {
  return class CameraTrack extends dependencies.BaseTrack {
    constructor(t, e) {
      super(8, t, e);
    }
    _recordFrame(t) {
      let e = this._timeline.data,
        i = this._source[0].position,
        s = this._source[0].lockedTarget;
      ((e[t] = i.x),
        (e[t + 1] = i.y),
        (e[t + 2] = i.z),
        (e[t + 3] = s.x),
        (e[t + 4] = s.y),
        (e[t + 5] = s.z));
    }
    _renderF0(t) {
      let e = this._timeline.data,
        i = this._actor;
      ((i.position.x = e[t]),
        (i.position.y = e[t + 1]),
        (i.position.z = e[t + 2]),
        (i.lockedTarget.x = e[t + 3]),
        (i.lockedTarget.y = e[t + 4]),
        (i.lockedTarget.z = e[t + 5]));
    }
    _renderF0F1(t, e, i) {
      let s = this._timeline.data,
        n = this._actor;
      ((n.position.x = s[t] + (s[e] - s[t]) * i),
        (n.position.y = s[t + 1] + (s[e + 1] - s[t + 1]) * i),
        (n.position.z = s[t + 2] + (s[e + 2] - s[t + 2]) * i),
        (n.lockedTarget.x = s[t + 3] + (s[e + 3] - s[t + 3]) * i),
        (n.lockedTarget.y = s[t + 4] + (s[e + 4] - s[t + 4]) * i),
        (n.lockedTarget.z = s[t + 5] + (s[e + 5] - s[t + 5]) * i));
    }
  };
}
