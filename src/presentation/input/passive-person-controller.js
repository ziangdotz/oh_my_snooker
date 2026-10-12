// Explicit live dependencies preserve initialization and shared state.
export default function createPassivePersonController(dependencies) {
  return class PassivePersonController extends dependencies.PersonController {
    constructor() {
      (super(), (this._camera = null), (this._uiFactor = 0));
    }
    reset(t, e, i, s, n) {
      (super.reset(t, e, i, s, n),
        (this._camera = t.camera),
        t.powerUI && (t.powerUI.percent = this._strokePower));
    }
    syncEnter(t, e) {
      (super.syncEnter(t, e), this.update(0));
    }
    syncTipMotion(t) {
      (super.syncTipMotion(t), (this._uiFactor = t.pullbackProgress));
    }
    release() {
      ((this._camera = null), super.release());
    }
    _onDeactive() {
      const t = this._gView;
      (t.powerUI && (t.powerUI.autoAlpha = 0),
        t.gunsight && (t.gunsight.alpha = 0),
        super._onDeactive());
    }
    shouldUpdate() {
      return 0 !== this.needsUpdate || this._stickCtl.needsUpdate;
    }
    update(t) {
      let e = super.update(t),
        i = this._stateTransitionTween.renderedRatio,
        n = this._bodyPosition,
        r = this._lockedTarget,
        a = this._headCtl;
      return (
        dependencies.Babylon.Vector3.LerpToRef(n, a.position, i, this._camera.position),
        this._camera.lockedTarget.copyFromFloats(
          r.x + a.lookAtOffset.x * i,
          r.y + a.lookAtOffset.y * i,
          r.z + a.lookAtOffset.z * i,
        ),
        e
      );
    }
    _onStickRendered() {
      let t = this._gView.powerUI,
        e = this._gView.gunsight,
        i = (1 - this._uiFactor) * this._stateTransitionTween.renderedRatio;
      ((i = i > 0.8 ? (i - 0.8) / 0.2 : 0),
        (t.autoAlpha = i),
        (e.alpha = 0.6 * i),
        i > 0 &&
          ((t._isWorldMatrixFrozen = !0),
          t._worldMatrix.copyFrom(this._activeStickMesh._worldMatrix),
          t._updateBoundingInfo()));
    }
    _onStrokePowerChanged() {
      this._gView && this._gView.powerUI && (this._gView.powerUI.percent = this._strokePower);
    }
  };
}
