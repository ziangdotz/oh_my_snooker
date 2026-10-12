import createPersonController from '../../presentation/input/person-controller.js';
import createSmoothPersonController from '../../presentation/input/smooth-person-controller.js';
/** Own this type family and its shared state once per game composition. */
export default function composePerson(dependencies) {
  const PersonDirtyFlags = Object.create(null);
  ((PersonDirtyFlags.TRANSTION = 1),
    (PersonDirtyFlags.HORIZON = 2),
    (PersonDirtyFlags.VERTICAL = 4),
    (PersonDirtyFlags.LOOKAT = 8),
    (PersonDirtyFlags.HORIZON_VERTICAL = 6),
    (PersonDirtyFlags.BODY = 15),
    (PersonDirtyFlags.HEAD = 16),
    (PersonDirtyFlags.FORCE = 32));
  const PersonState = Object.create(null);
  ((PersonState.STATE_STAND = 0), (PersonState.STATE_AIM = 1));
  const PersonEvents = Object.create(null);
  ((PersonEvents.STATE_CHANGE_START = 'sc_start'),
    (PersonEvents.STATE_CHANGE_END = 'sc_end'),
    (PersonEvents.AI_SHOT = 'ai_shot'));
  const PersonController = createPersonController({
    get AimCameraController() {
      return dependencies.AimCameraController;
    },
    get Babylon() {
      return dependencies.Babylon;
    },
    get CueMotionController() {
      return dependencies.CueMotionController;
    },
    get Easing() {
      return dependencies.Easing;
    },
    get HeadingController() {
      return dependencies.HeadingController;
    },
    get LookController() {
      return dependencies.LookController;
    },
    get OrbitController() {
      return dependencies.OrbitController;
    },
    get PersonDirtyFlags() {
      return PersonDirtyFlags;
    },
    get PersonEvents() {
      return PersonEvents;
    },
    get PersonState() {
      return PersonState;
    },
    get PlayerControl() {
      return dependencies.PlayerControl;
    },
    get StanceController() {
      return dependencies.StanceController;
    },
    get Tween() {
      return dependencies.Tween;
    },
  });

  return {
    PersonState,
    PersonEvents,
    PersonController: createSmoothPersonController(PersonController),
  };
}
