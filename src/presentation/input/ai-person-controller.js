// Explicit live dependencies preserve initialization and shared state.
export default function createAiPersonController(dependencies) {
  return class AiPersonController extends dependencies.PersonController {
    constructor(t) {
      (super(), (this._ai = t), (this._shootingDelay = -1), (this._aiThinkingRandomDelay = -1));
    }
    shouldUpdate() {
      return this._active;
    }
    activate() {
      return (
        super.activate(),
        this._model.gState === dependencies.GameState.a.READY &&
          this._ai.checkRestart(this._simulator, this._model) &&
          (this._state !== dependencies.PersonState.STATE_STAND && this.gotoState0(!0),
          (this._aiThinkingRandomDelay = 1 + Math.random())),
        this
      );
    }
    update(t) {
      let e = this._ai;
      if (this._aiThinkingRandomDelay >= 0) this._aiThinkingRandomDelay -= t;
      else if (e.taskRunning) {
        let t = e.step(this._gView, this._simulator, this._model);
        t &&
          (this.resetWithKissDir(t.dx, t.dz),
          (this.strokePower = 0.3 + t.powerFactor),
          this._stickCtl.setTipPercent(0, t.fbSpin),
          t.fbSpin < 0 ? this._stickCtl.setAngleV(0.025 * Math.PI) : this._stickCtl.setAngleV(0),
          this.gotoState1(),
          (this._shootingDelay = 1 + Math.random()));
      } else
        this.isReadyToStroke() &&
          this._shootingDelay >= 0 &&
          (this._shootingDelay -= t) < 0 &&
          ((this._shootingDelay = -1), this.emit(dependencies.PersonEvents.AI_SHOT, this));
      return !(0 === this.needsUpdate && !this._stickCtl.needsUpdate) && super.update(t);
    }
  };
}
