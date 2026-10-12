// Explicit live dependencies preserve initialization and shared state.
export default function createBaseTrack(dependencies) {
  return class BaseTrack {
    get totalFrames() {
      return this._timeline.totalFrames;
    }
    get renderable() {
      return this._renderable;
    }
    get recordable() {
      return this._recordable;
    }
    constructor(t, e, i = 60) {
      ((this._timeline = new dependencies.TrackBuffer(t, e)),
        (this._actor = null),
        (this._renderable = !1),
        (this._recordable = !1),
        (this._source = []),
        (this._invSR = 1 / i),
        (this._accumulator = 0),
        (this.header = Object.create(null)));
    }
    getHeader(t) {
      return this.header[t];
    }
    getTimelineDuration() {
      let t = this._timeline;
      if (0 === t.totalFrames) return 0;
      {
        let e = (t.totalFrames - 1) * t.stride,
          i = t.data;
        return i[e] + i[e + 1];
      }
    }
    get canRender() {
      return this._renderable && 0 !== this._timeline.totalFrames;
    }
    get actor() {
      return this._actor;
    }
    setActor(t) {
      return ((this._actor = t), (this._renderable = !!t), this);
    }
    render(t) {
      let e = this._timeline,
        i = e.updateRenderRatio(t);
      0 === i ? this._renderF0(e.ls + 2) : this._renderF0F1(e.ls + 2, e.rs + 2, i);
    }
    logCurrentFrame() {
      let t = this._timeline;
      console.log('ls: ' + t.ls / t.stride);
    }
    _renderF0(t) {
      throw new Error('Override me: ' + t);
    }
    _renderF0F1(t, e, i) {
      throw new Error('Override me: ' + t + '-' + e + '/' + i);
    }
    setSource(...t) {
      this._source.length = 0;
      for (let e = 0, i = t.length; e !== i; ++e) t[e] && this._source.push(t[e]);
      return ((this._recordable = this._source.length > 0), this);
    }
    record(t, e = !1) {
      let i = this._timeline;
      if (0 === i.totalFrames) {
        this._accumulator = 0;
        let e = i.growToTick(t);
        return -1 !== e && (this._recordFrame(e), !0);
      }
      if ((this._accumulator += t) < this._invSR && !e) return !0;
      ((t = this._accumulator), (this._accumulator = 0));
      let s = (i.totalFrames - 1) * i.stride;
      if (this._shouldRecordingKeyFrame(s + 2)) {
        let e = i.data,
          n = e[s] + e[s + 1];
        return -1 !== (s = i.growToTick(t + n)) && (this._recordFrame(s), !0);
      }
      return (i.extendsLife(s, t), !0);
    }
    extendsLife(t) {
      let e = this._timeline;
      e.extendsLife((e.totalFrames - 1) * e.stride, t);
    }
    erase() {
      return (this._timeline.erase(), (this._accumulator = 0), this);
    }
    _shouldRecordingKeyFrame() {
      return !0;
    }
    _recordFrame(t) {
      throw new Error('Override me: ' + t);
    }
  };
}
