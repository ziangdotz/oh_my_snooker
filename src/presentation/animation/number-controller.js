// Explicit live dependencies preserve initialization and shared state.
export default function createNumberController(dependencies) {
  return class NumberController extends dependencies.EventEmitter.a {
    constructor(t) {
      (super(),
        (this.needsUpdate = !1),
        (this.eps = t || 0.1),
        (this.crt = 0),
        (this.tgt = 0),
        (this.clampMin = -Number.MAX_VALUE),
        (this.clampMax = Number.MAX_VALUE),
        (this.update = this.update),
        (this.to = this._directTo),
        (this.move = this._directMove),
        (this.reset = this._directReset));
    }
    _getClamped(t) {
      return (
        t < this.clampMin ? (t = this.clampMin) : t > this.clampMax && (t = this.clampMax),
        t
      );
    }
    dispose() {
      this.removeAllListeners();
    }
    requireUpdate() {
      return (
        this.needsUpdate || ((this.needsUpdate = !0), this.emit(NumberController.updEvtType)),
        this
      );
    }
    onUpdateRequired(t) {
      this.on(NumberController.updEvtType, t);
    }
    clamp(t, e) {
      let i = !1;
      return (
        void 0 !== t ? ((this.clampMin = t), (i = !0)) : (this.clampMin = -Number.MAX_VALUE),
        void 0 !== e ? ((this.clampMax = e), (i = !0)) : (this.clampMax = Number.MAX_VALUE),
        i
          ? ((this.to = this._clampedTo),
            (this.move = this._clampedMove),
            (this.reset = this._clampedReset),
            (this._getClamped = this._getClamped))
          : ((this.to = this._directTo),
            (this.move = this._directMove),
            (this.reset = this._directReset)),
        this
      );
    }
    _directTo(t) {
      return (this.tgt !== t && ((this.tgt = t), this.requireUpdate()), this);
    }
    _directMove(t) {
      return (0 !== t && ((this.tgt += t), this.requireUpdate()), this);
    }
    _directReset(t, e, i) {
      return (
        void 0 === e && (e = t),
        (this.tgt === e && this.crt === t) ||
          ((this.tgt = e), (this.crt = t), this.requireUpdate(), i && this.update()),
        this
      );
    }
    _clampedTo(t) {
      return (
        (t = this._getClamped(t)),
        this.tgt !== t && ((this.tgt = t), this.requireUpdate()),
        this
      );
    }
    _clampedMove(t) {
      let e = this._getClamped(this.tgt + t);
      return (this.tgt !== e && ((this.tgt = e), this.requireUpdate()), this);
    }
    _clampedReset(t, e, i) {
      return (
        (t = this._getClamped(t)),
        (e = void 0 === e ? t : this._getClamped(e)),
        (this.tgt === e && this.crt === t) ||
          ((this.tgt = e), (this.crt = t), this.requireUpdate(), i && this.update()),
        this
      );
    }
    update() {
      return ((this.needsUpdate = !1), (this.crt = this.tgt), !1);
    }
  };
}
