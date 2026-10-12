import createNumberController from '../../presentation/animation/number-controller.js';
import createAngularController from '../../presentation/animation/angular-controller.js';
import createLinearController from '../../presentation/animation/linear-controller.js';
/** Own this type family and its shared state once per game composition. */
export default function composeMotionAnimation(dependencies) {
  const NumberController = createNumberController({
    get EventEmitter() {
      return dependencies.EventEmitter;
    },
  });
  NumberController.updEvtType = 'require_update';
  const AngularController = createAngularController({
    get NumberController() {
      return NumberController;
    },
  });
  const LinearController = createLinearController({
    get NumberController() {
      return NumberController;
    },
  });

  return { AngularController, LinearController };
}
