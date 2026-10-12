// Explicit live dependencies preserve initialization and shared state.
export default function createStanceController(dependencies) {
  return class StanceController {
    constructor(t, e) {
      ((this._dirtyFlag = e),
        (this._weakParent = t),
        (this._eyeStandHeight = 0),
        (this._squatDeltaH = 0),
        (this._standUpDownTween = new dependencies.Tween()
          .resetBase(dependencies.Easing.Power1.easeInOut, 0.6)
          .onUpdateRequired(() => (this._weakParent.needsUpdate |= this._dirtyFlag))));
    }
    squatDown(t) {
      t ? this._standUpDownTween.end() : this._standUpDownTween.play();
    }
    standUp(t) {
      t ? this._standUpDownTween.pause(0) : this._standUpDownTween.reverse();
    }
    reset(t, e) {
      ((this._eyeStandHeight = t),
        (this._squatDeltaH = e - t),
        this.standUp(!0),
        (this._weakParent.needsUpdate |= this._dirtyFlag));
    }
    update(t, e, i) {
      let s = !1;
      const n = this._standUpDownTween;
      return (
        n.needsUpdate && n.update(t) && (s = !0),
        (e = (1 - e) * n.renderedRatio),
        (i.y = this._eyeStandHeight + e * this._squatDeltaH),
        s
      );
    }
  };
}
