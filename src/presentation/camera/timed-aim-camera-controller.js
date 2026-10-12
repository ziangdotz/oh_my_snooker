export default function createTimedAimCameraController(AimCameraController) {
  return class TimedAimCameraController extends AimCameraController {
    constructor(...args) {
      super(...args);
      this.frameDelta = 1 / 60;
      const advanceTween = this._lookAtSpd.update.bind(this._lookAtSpd);
      // This instance's inherited update supplies a legacy constant; use the person's delta.
      this._lookAtSpd.update = () => advanceTween(this.frameDelta);
    }

    update() {
      for (const controller of this._locLookAtOffset) {
        controller.frameDelta = this.frameDelta;
      }
      return super.update();
    }
  };
}
