// Explicit live dependencies preserve initialization and shared state.
export default function createUiShaderMaterial(dependencies) {
  return class UiShaderMaterial extends dependencies.Babylon.ShaderMaterial {
    constructor(t, e, i, s) {
      (super(t, e, i, s), (this._usedUniformTypes = Object.create(null)));
    }
    isReady(t, e) {
      return (
        !(!this.checkReadyOnlyOnce || !this._wasPreviouslyReady) ||
        (!!super.isReady(t, e) && ((this._wasPreviouslyReady = !0), !0))
      );
    }
  };
}
