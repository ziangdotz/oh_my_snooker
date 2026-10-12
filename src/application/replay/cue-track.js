// Explicit live dependencies preserve initialization and shared state.
export default function createCueTrack(dependencies) {
  return class CueTrack extends dependencies.BaseTrack {
    constructor(t, e) {
      super(8, t, e);
    }
    setSource(t, e) {
      return (
        (this._source.length = 0),
        t && (this._source[0] = t),
        (this.header.stickName = e),
        (this._recordable = !!t),
        this
      );
    }
    _shouldRecordingKeyFrame(t) {
      let e = this._source[0];
      return 0 !== this._timeline.data[t] || 0 !== e.stateRatio;
    }
    _recordFrame(t) {
      let e = this._source[0],
        i = this._timeline.data,
        s = e.composedPosition,
        n = e.composedRotation;
      ((i[t] = 0 === e.stateRatio ? 0 : 1),
        (i[t + 1] = s.x),
        (i[t + 2] = s.y),
        (i[t + 3] = s.z),
        (i[t + 4] = n.y),
        (i[t + 5] = n.z));
    }
    _renderF0(t) {
      let e = this._timeline.data,
        i = this._actor;
      0 !== e[t]
        ? ((i.isVisible = !0),
          CueTrack._updateTargetMatrix(i, e[t + 1], e[t + 2], e[t + 3], e[t + 4], e[t + 5]))
        : (i.isVisible = !1);
    }
    _renderF0F1(t, e, i) {
      let s = this._timeline.data,
        n = this._actor;
      if (0 !== s[t]) {
        n.isVisible = !0;
        let r = s[t + 1] + (s[e + 1] - s[t + 1]) * i,
          a = s[t + 2] + (s[e + 2] - s[t + 2]) * i,
          o = s[t + 3] + (s[e + 3] - s[t + 3]) * i,
          l = Math.PI,
          h = s[e + 4] - s[t + 4];
        h > l ? (h -= 2 * l) : h < -l && (h += 2 * l);
        let c = s[t + 4] + h * i,
          d = s[t + 5] + (s[e + 5] - s[t + 5]) * i;
        CueTrack._updateTargetMatrix(n, r, a, o, c, d);
      } else n.isVisible = !1;
    }
    static _updateTargetMatrix(t, e, i, s, n, r) {
      t._isWorldMatrixFrozen = !0;
      let a = t._worldMatrix.m,
        o = Math.cos(n),
        l = Math.sin(n),
        h = Math.cos(r),
        c = Math.sin(r);
      ((a[0] = o * h),
        (a[1] = c),
        (a[2] = -h * l),
        (a[3] = 0),
        (a[4] = -o * c),
        (a[5] = h),
        (a[6] = c * l),
        (a[7] = 0),
        (a[8] = l),
        (a[9] = 0),
        (a[10] = o),
        (a[11] = 0),
        (a[12] = e),
        (a[13] = i),
        (a[14] = s),
        (a[15] = 1),
        t._worldMatrix._markAsUpdated(),
        t._updateBoundingInfo(),
        t.material._lightProbeManager._onMeshTransformDirty(t));
    }
  };
}
