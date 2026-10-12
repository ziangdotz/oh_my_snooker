import createAimCameraController from '../../presentation/camera/aim-camera-controller.js';
import createTimedLinearController from '../../presentation/camera/timed-linear-controller.js';
import createTimedAimCameraController from '../../presentation/camera/timed-aim-camera-controller.js';
/** Own this type family and its shared state once per game composition. */
export default function composeAimCamera(dependencies) {
  const CameraLinearController = createTimedLinearController(dependencies.LinearController);
  const wi = -0.9,
    Ri = -0.3,
    ki = 0.08,
    Pi = -0.2,
    Di = 0.3,
    Li = 0.35,
    Oi = 1e-5,
    AimCameraDirtyFlags = Object.create(null);
  ((AimCameraDirtyFlags.TRANSFORM = 1),
    (AimCameraDirtyFlags.LOCPOSITION = 2),
    (AimCameraDirtyFlags.LOOKAT = 4));
  const AimCameraController = createAimCameraController({
    get AimCameraDirtyFlags() {
      return AimCameraDirtyFlags;
    },
    get Babylon() {
      return dependencies.Babylon;
    },
    get Di() {
      return Di;
    },
    get Easing() {
      return dependencies.Easing;
    },
    get Li() {
      return Li;
    },
    get LinearController() {
      return CameraLinearController;
    },
    get Oi() {
      return Oi;
    },
    get Pi() {
      return Pi;
    },
    get PropertyTween() {
      return dependencies.PropertyTween;
    },
    get Ri() {
      return Ri;
    },
    get ki() {
      return ki;
    },
    get wi() {
      return wi;
    },
  });

  return { AimCameraController: createTimedAimCameraController(AimCameraController) };
}
