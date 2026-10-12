import createGameReplay from '../../presentation/ui/game-replay.js';
import createGameReplayControl from '../controls/game-replay-control.js';
import createReplayControlPanel from '../../presentation/ui/replay-control-panel.js';
import createPathFollower from '../../presentation/camera/path-follower.js';
import createReplayCameraController from '../../presentation/camera/replay-camera-controller.js';
import createPocketCamera from '../../presentation/camera/pocket-camera.js';
import createTrackBuffer from '../replay/track-buffer.js';
import createBaseTrack from '../replay/base-track.js';
import createBallTrack from '../replay/ball-track.js';
import createBallPath from '../replay/ball-path.js';
import createReplayControl from '../controls/replay-control.js';
import createCameraTrack from '../replay/camera-track.js';
import createCueTrack from '../replay/cue-track.js';
import createMovieClip from '../replay/movie-clip.js';
/** Own this type family and its shared state once per game composition. */
export default function composeReplay(dependencies) {
  const replayControlsTemplate = dependencies.modulePresentationTemplatesReplayControls;
  const ReplayControlPanel = createGameReplay(
    createReplayControlPanel({
      get Easing() {
        return dependencies.Easing;
      },
      get PropertyTween() {
        return dependencies.PropertyTween;
      },
      get UiComponent() {
        return dependencies.UiComponent;
      },
      get dialogEvents() {
        return dependencies.dialogEvents;
      },
      get replayControlsTemplate() {
        return replayControlsTemplate;
      },
    }),
    dependencies.dialogEvents,
    dependencies.Easing,
  );
  const PathFollower = createPathFollower({
    get Easing() {
      return dependencies.Easing;
    },
  });
  const ReplayTargetKind = Object.create(null);
  ((ReplayTargetKind.POINT = 0), (ReplayTargetKind.PATH = 1));
  const ReplayCameraController = createReplayCameraController({
    get PathFollower() {
      return PathFollower;
    },
    get ReplayTargetKind() {
      return ReplayTargetKind;
    },
  });
  const PocketCamera = createPocketCamera({});
  const TrackBuffer = createTrackBuffer({});
  const BaseTrack = createBaseTrack({
    get TrackBuffer() {
      return TrackBuffer;
    },
  });
  const BallTrack = createBallTrack({
    get BaseTrack() {
      return BaseTrack;
    },
  });
  const pathScratch = [];
  const BallPath = createBallPath({
    get BallTrack() {
      return BallTrack;
    },
    get pathScratch() {
      return pathScratch;
    },
  });
  const ReplayVector = dependencies.physicsApi.a.Vec3,
    replayLongTracks = [],
    replayPaths = [],
    replaySelection = new Uint8Array(6),
    replayVector = new ReplayVector();
  const PreservedReplayControl = createReplayControl({
    get BallPath() {
      return BallPath;
    },
    get ControlGroup() {
      return dependencies.ControlGroup;
    },
    get GameState() {
      return dependencies.GameState;
    },
    get PocketCamera() {
      return PocketCamera;
    },
    get ReplayCameraController() {
      return ReplayCameraController;
    },
    get ReplayControlPanel() {
      return ReplayControlPanel;
    },
    get ToolbarGroup() {
      return dependencies.ToolbarGroup;
    },
    get controlEvents() {
      return dependencies.controlEvents;
    },
    get dialogEvents() {
      return dependencies.dialogEvents;
    },
    get replayLongTracks() {
      return replayLongTracks;
    },
    get replayPaths() {
      return replayPaths;
    },
    get replaySelection() {
      return replaySelection;
    },
    get replayVector() {
      return replayVector;
    },
  });
  const ReplayControl = createGameReplayControl(PreservedReplayControl);
  const CameraTrack = createCameraTrack({
    get BaseTrack() {
      return BaseTrack;
    },
  });
  const CueTrack = createCueTrack({
    get BaseTrack() {
      return BaseTrack;
    },
  });
  const maxBallTracks = 22;
  const MovieClip = createMovieClip({
    get BallTrack() {
      return BallTrack;
    },
    get CameraTrack() {
      return CameraTrack;
    },
    get CueTrack() {
      return CueTrack;
    },
    get maxBallTracks() {
      return maxBallTracks;
    },
  });

  return { ReplayControl, MovieClip };
}
