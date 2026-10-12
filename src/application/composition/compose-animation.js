import createEasing from '../../presentation/animation/easing.js';
import createTween from '../../presentation/animation/tween.js';
import createValueTween from '../../presentation/animation/value-tween.js';
import createPropertyTween from '../../presentation/animation/property-tween.js';
import createTweenGroup from '../../presentation/animation/tween-group.js';
/** Own this type family and its shared state once per game composition. */
export default function composeAnimation(dependencies) {
  const tweenPrecision = 1e-6,
    Easing = createEasing();
  const Tween = createTween({
    get Easing() {
      return Easing;
    },
    get EventEmitter() {
      return dependencies.EventEmitter;
    },
    get tweenPrecision() {
      return tweenPrecision;
    },
  });
  Tween.updEvtType = 'require_update';
  const ValueTween = createValueTween({
    get Tween() {
      return Tween;
    },
  });
  const PropertyTween = createPropertyTween({
    get ValueTween() {
      return ValueTween;
    },
  });
  const TweenGroup = createTweenGroup({
    get Tween() {
      return Tween;
    },
  });

  return { Easing, Tween, ValueTween, PropertyTween, TweenGroup };
}
