import installRenderResolutionPolicy from '../presentation/rendering/render-resolution-policy.js';

export default function createSmoothSnookerApplication(SnookerApplication) {
  return class SmoothSnookerApplication extends SnookerApplication {
    constructor(...args) {
      super(...args);
      this._disposeResolutionPolicy = installRenderResolutionPolicy(this._engine, this._gView);
    }
  };
}
