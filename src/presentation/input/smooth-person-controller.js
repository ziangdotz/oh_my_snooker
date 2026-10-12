export default function createSmoothPersonController(PersonController) {
  return class SmoothPersonController extends PersonController {
    constructor(...args) {
      super(...args);
      this._stateTransitionTween.resetBase(this._stateTransitionTween.ease, 0.8);
    }

    update(delta) {
      const cameraDelta = Math.max(0, Math.min(delta, 0.1));
      this._horizonCtl.frameDelta = cameraDelta;
      this._headCtl.frameDelta = cameraDelta;
      return super.update(cameraDelta);
    }
  };
}
