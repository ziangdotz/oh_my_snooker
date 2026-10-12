import createBallInHandControl from '../controls/ball-in-hand-control.js';
/** Own this type family and its shared state once per game composition. */
export default function composeBallInHand(dependencies) {
  const ballInHandVector = new dependencies.physicsApi.a.Vec3();
  const BallInHandControl = createBallInHandControl({
    get ControlGroup() {
      return dependencies.ControlGroup;
    },
    get GameState() {
      return dependencies.GameState;
    },
    get MessageKind() {
      return dependencies.MessageKind;
    },
    get ToolbarGroup() {
      return dependencies.ToolbarGroup;
    },
    get UiColors() {
      return dependencies.UiColors;
    },
    get ballInHandVector() {
      return ballInHandVector;
    },
    get controlEvents() {
      return dependencies.controlEvents;
    },
    get physicsApi() {
      return dependencies.physicsApi;
    },
  });

  return { BallInHandControl };
}
