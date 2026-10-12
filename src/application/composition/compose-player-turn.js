import createStrokeMotion from '../controls/stroke-motion.js';
import createPlayerTurnControl from '../controls/player-turn-control.js';
import createQuickStrokeMotion from '../controls/quick-stroke-motion.js';
import createImmediateGuideControl from '../controls/immediate-guide-control.js';
/** Own this type family and its shared state once per game composition. */
export default function composePlayerTurn(dependencies) {
  const strokeEase = dependencies.Easing.Power3.easeInOut,
    StrokeVector = dependencies.physicsApi.a.Vec3,
    strokePrecision = StrokeVector.EPSILON,
    Ji = (t, e, i, s, n) => {
      const r = i.dot(t),
        a = s - n;
      if (a > 0 && r > 0) {
        return Number.MAX_VALUE;
      }
      const o = e,
        l = r * r - o * a;
      if (l <= 0) {
        return Number.MAX_VALUE;
      }
      let h = (-r - Math.sqrt(l)) / o;
      return (h < strokePrecision && (h = 0), h);
    },
    maxPullbackLength = 0.25;
  const StrokeMotion = createStrokeMotion({
    get Easing() {
      return dependencies.Easing;
    },
    get Ji() {
      return Ji;
    },
    get StrokeVector() {
      return StrokeVector;
    },
    get maxPullbackLength() {
      return maxPullbackLength;
    },
    get strokeEase() {
      return strokeEase;
    },
  });
  const QuickStrokeMotion = createQuickStrokeMotion(StrokeMotion);
  const PlayerTurnControl = createPlayerTurnControl({
    get ControlGroup() {
      return dependencies.ControlGroup;
    },
    get ControlsDialog() {
      return dependencies.ControlsDialog;
    },
    get GameState() {
      return dependencies.GameState;
    },
    get MessageDialog() {
      return dependencies.MessageDialog;
    },
    get PersonEvents() {
      return dependencies.PersonEvents;
    },
    get PersonState() {
      return dependencies.PersonState;
    },
    get ShortcutBar() {
      return dependencies.ShortcutBar;
    },
    get StrokeMotion() {
      return QuickStrokeMotion;
    },
    get ToolbarGroup() {
      return dependencies.ToolbarGroup;
    },
    get controlEvents() {
      return dependencies.controlEvents;
    },
  });

  return {
    PlayerTurnControl: createImmediateGuideControl(PlayerTurnControl, dependencies.controlEvents),
  };
}
