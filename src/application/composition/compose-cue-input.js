import createCueContactState from '../../presentation/input/cue-contact-state.js';
import createPlayerControl from '../../presentation/input/player-control.js';
import createCueTransform from '../../presentation/input/cue-transform.js';
import createCueContactController from '../../presentation/input/cue-contact-controller.js';
import createCueMotionController from '../../presentation/input/cue-motion-controller.js';
/** Own this type family and its shared state once per game composition. */
export default function composeCueInput(dependencies) {
  const PlayerControl = createPlayerControl({
    get EventEmitter() {
      return dependencies.EventEmitter;
    },
  });
  const CueTransform = createCueTransform({
    get Babylon() {
      return dependencies.Babylon;
    },
  });
  const { ci, di, _i, pi, fi, gi, mi, yi, vi, bi, xi, Si } = createCueContactState({
    get Babylon() {
      return dependencies.Babylon;
    },
    get Plane() {
      return dependencies.Plane;
    },
    get physicsApi() {
      return dependencies.physicsApi;
    },
  });
  const CueContactController = createCueContactController({
    get Babylon() {
      return dependencies.Babylon;
    },
    get Si() {
      return Si;
    },
    get _i() {
      return _i;
    },
    get bi() {
      return bi;
    },
    get ci() {
      return ci;
    },
    get di() {
      return di;
    },
    get fi() {
      return fi;
    },
    get gi() {
      return gi;
    },
    get mi() {
      return mi;
    },
    get pi() {
      return pi;
    },
    get vi() {
      return vi;
    },
    get xi() {
      return xi;
    },
    get yi() {
      return yi;
    },
  });
  const cueStateEase = dependencies.Easing.Power3.easeInOut,
    cueContactEase = dependencies.Easing.Power1.easeInOut,
    cueReleaseEase = dependencies.Easing.Power1.easeOut;
  const CueMotionController = createCueMotionController({
    get Babylon() {
      return dependencies.Babylon;
    },
    get CueContactController() {
      return CueContactController;
    },
    get CueTransform() {
      return CueTransform;
    },
    get cueContactEase() {
      return cueContactEase;
    },
    get cueReleaseEase() {
      return cueReleaseEase;
    },
    get cueStateEase() {
      return cueStateEase;
    },
  });

  return { PlayerControl, CueMotionController };
}
