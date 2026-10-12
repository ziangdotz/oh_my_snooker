// Explicit live dependencies preserve initialization and shared state.
export default function createTween(dependencies) {
  return class Tween extends dependencies.EventEmitter.a {
    constructor() {
      (super(),
        (this.needsUpdate = !1),
        (this.timeScale = 1),
        (this.time = -1),
        (this.state = 0),
        (this.ease = dependencies.Easing.defaultEase),
        (this.duration = 0),
        (this.delay = 0),
        (this.totalLifeTime = 0),
        (this.renderedTime = -1),
        (this.renderedRatio = 0),
        (this.uneaseRenderedRatio = 0),
        (this.onComplete = null),
        (this.onReverseComplete = null),
        (this.callCbWhenComplete = 0),
        (this.render = this.render),
        (this.update = this.update),
        (this.tickTime = this.tickTime),
        (this.requireUpdate = this.requireUpdate));
    }
    resetBase(t, e, i) {
      return (
        void 0 !== t && (this.ease = t),
        (this.duration = e < 0 ? 0 : e),
        (this.delay = void 0 === i || i < 0 ? 0 : i),
        (this.totalLifeTime = this.duration + this.delay),
        (this.renderedTime = -1),
        this.pause(0, !0)
      );
    }
    clear() {
      return (
        (this.time = 0),
        (this.state = 0),
        (this.duration = 0),
        (this.delay = 0),
        (this.totalLifeTime = 0),
        (this.callCbWhenComplete = 0),
        this
      );
    }
    dispose() {
      (this.clear(),
        (this.ease = dependencies.Easing.defaultEase),
        (this.onComplete = null),
        (this.onReverseComplete = null),
        (this.render = null),
        (this.update = null),
        (this.tickTime = null),
        (this.requireUpdate = null),
        this.removeAllListeners());
    }
    requireUpdate() {
      return (this.needsUpdate || ((this.needsUpdate = !0), this.emit(Tween.updEvtType)), this);
    }
    onUpdateRequired(t) {
      return (this.on(Tween.updEvtType, t), this);
    }
    isComplete(t) {
      return t
        ? 0 === this.state && 0 === this.time
        : 0 === this.state && this.time === this.totalLifeTime;
    }
    cancelCallbacks() {
      this.callCbWhenComplete = 0;
    }
    play(t) {
      let e = !1;
      return (
        void 0 !== t &&
          ((t = Math.max(Math.min(t, this.totalLifeTime), 0)),
          this.time !== t && ((this.time = t), (e = !0))),
        e || this.time < this.totalLifeTime
          ? ((this.state = 1), (this.callCbWhenComplete = 1), this.requireUpdate())
          : (this.state = 0),
        this
      );
    }
    reverse() {
      return (
        this.time > 0
          ? ((this.state = -1), (this.callCbWhenComplete = -1), this.requireUpdate())
          : (this.state = 0),
        this
      );
    }
    end() {
      return this.pause(this.totalLifeTime);
    }
    pause(t, e) {
      return (
        (this.callCbWhenComplete = 0),
        0 === this.state
          ? void 0 !== t && t !== this.time && ((this.time = t), this.requireUpdate())
          : ((this.state = 0), void 0 !== t && (this.time = t)),
        e && (this.requireUpdate(), this.update(0)),
        this
      );
    }
    tickTime(t) {
      let e = this.state * this.timeScale,
        i = this.time + t * e,
        s = dependencies.tweenPrecision;
      if (e > 0) {
        if (i >= this.totalLifeTime - s)
          return ((this.time = this.totalLifeTime), (this.state = 0), this.duration);
        this.needsUpdate = !0;
      } else if (e < 0) {
        if (i <= s) return ((this.time = 0), (this.state = 0), 0);
        this.needsUpdate = !0;
      }
      return ((this.time = i), (i -= this.delay) < s ? 0 : i);
    }
    update(t) {
      this.needsUpdate = !1;
      let e = this.tickTime(t);
      return (
        this.renderedTime !== e &&
          ((this.renderedTime = e),
          (this.uneaseRenderedRatio = e / this.duration),
          this.render(this.ease(this.uneaseRenderedRatio)),
          this.needsUpdate ||
            (1 === this.callCbWhenComplete && this.onComplete && this.onComplete(),
            -1 === this.callCbWhenComplete && this.onReverseComplete && this.onReverseComplete(),
            (this.callCbWhenComplete = 0))),
        this.needsUpdate
      );
    }
    render(t) {
      this.renderedRatio = t;
    }
  };
}
