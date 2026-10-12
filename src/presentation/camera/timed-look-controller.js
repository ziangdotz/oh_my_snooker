export default function createTimedLookController(LookController) {
  return class TimedLookController extends LookController {
    update(delta, position) {
      for (const controller of Object.values(this._eyeTarget)) {
        controller.frameDelta = delta;
      }
      return super.update(delta, position);
    }
  };
}
