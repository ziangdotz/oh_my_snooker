// Explicit live dependencies preserve initialization and shared state.
export default function createMovieClip(dependencies) {
  return class MovieClip {
    get nTracks() {
      return this._tracks.length;
    }
    get tracks() {
      return this._tracks;
    }
    get playHead() {
      return this._playHead;
    }
    set playHead(t) {
      this._playHead !== t && ((this._playHead = t), (this._needsUpdate = !0));
    }
    get duration() {
      return this._duration;
    }
    get progress() {
      return this._playHead / this._duration;
    }
    get state() {
      return this._playbackState;
    }
    get needsUpdate() {
      return this._needsUpdate;
    }
    get maxBallTracks() {
      return dependencies.maxBallTracks;
    }
    get uniqueId() {
      return this._uniqueId;
    }
    constructor() {
      ((this._tracks = Object.create(null)),
        (this._tracks.cam = new dependencies.CameraTrack(80, 10)),
        (this._tracks.stick = new dependencies.CueTrack(58, 30)));
      for (let t = 0; t !== dependencies.maxBallTracks; ++t)
        this._tracks['b' + t] = new dependencies.BallTrack(500, 60);
      ((this._playbackState = 0),
        (this._playHead = 0),
        (this._duration = 0),
        (this._needsUpdate = !1),
        (this.loop = !1),
        (this.timeScale = 1),
        (this._uniqueId = ''));
    }
    syncBallTracks(t, e) {
      let _i,
        s = t.getBalls(),
        n = this.tracks;
      if (s.length > dependencies.maxBallTracks)
        throw new Error('Not enough Ball tracks: ' + s.length + ' > ' + dependencies.maxBallTracks);
      for (let t = 0, r = s.length; t !== r; ++t)
        (_i = n['b' + t]).setSource(s[t], e[t].shadow).setActor(e[t]);
      for (let t = s.length; t < dependencies.maxBallTracks; ++t)
        (_i = n['b' + t]).setSource(void 0).setActor(void 0);
    }
    erase() {
      let t = this._tracks;
      for (let e in t) t[e].erase();
      return ((this._playbackState = 0), (this._playHead = 0), (this._duration = 0), this);
    }
    saveRecording() {
      let _t,
        e = this._tracks;
      ((this._playbackState = 0), (this._playHead = 0), (this._duration = 0));
      for (let i in e) {
        let s = (_t = e[i]).getTimelineDuration();
        s > this._duration && (this._duration = s);
      }
      return ((this._uniqueId = 'mc' + Date.now()), this);
    }
    getLongBTracks(t, e) {
      let i,
        s = this._tracks;
      e.push(s.b0);
      for (let n = 1, r = dependencies.maxBallTracks; n !== r; ++n)
        (i = s['b' + n]).totalFrames >= t && e.push(i);
    }
    log() {
      let t,
        e = this._tracks;
      console.error('[MC LOG]: ');
      for (let i in e)
        ((t = e[i]),
          console.log(
            '\t' +
              i +
              ': keyFrames: ' +
              t.totalFrames +
              ',recordable: ' +
              t.recordable +
              ', renderable: ' +
              t.renderable,
          ));
      console.log('[MC DURATION]: ' + this._duration);
    }
    getTrack(t) {
      return this._tracks[t];
    }
    releaseAllTargets() {
      let t = this._tracks;
      for (let e in t) t[e].setActor(void 0).setSource(void 0);
      return this;
    }
    play(t) {
      return this._playPausePlayHead(1, t);
    }
    reverse(t) {
      return this._playPausePlayHead(-1, t);
    }
    pause(t) {
      return this._playPausePlayHead(0, t);
    }
    _playPausePlayHead(t, e) {
      return (
        this._playbackState !== t &&
          ((this._playbackState = t), 0 !== t && (this._needsUpdate = !0)),
        void 0 !== e && e !== this._playHead && (this.playHead = e),
        this
      );
    }
    updatePlayback(t) {
      if (0 === this._playbackState) this._needsUpdate = !1;
      else {
        let e = 0,
          i = this._duration,
          s = i - e,
          n = this.loop;
        if (((t *= this._playbackState * this.timeScale), Math.abs(s) < 1e-6))
          ((this._playHead = e), (this._playbackState = 0));
        else {
          this._playHead += s > 0 ? t : -t;
          let r = (this._playHead - e) / s;
          r < 0
            ? n
              ? (this._playHead = i - ((e - this._playHead) % s))
              : ((this._playHead = e), (this._playbackState = 0))
            : r > 1 &&
              (n
                ? (this._playHead = e + ((this._playHead - i) % s))
                : ((this._playHead = i), (this._playbackState = 0)));
        }
      }
      MovieClip._render(this, this._playHead);
    }
    static _render(t, e) {
      let i,
        s = t._tracks;
      for (let t in s) (i = s[t]).canRender && i.render(e);
    }
  };
}
