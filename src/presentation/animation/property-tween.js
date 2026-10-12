// Explicit live dependencies preserve initialization and shared state.
export default function createPropertyTween(dependencies) {
  return class PropertyTween extends dependencies.ValueTween {
    constructor(t, e = {}) {
      (super(e), (this.callback = t));
    }
    dispose() {
      ((this.callback = null), super.dispose());
    }
    render(t) {
      (super.render(t), this.callback(this.target));
    }
  };
}
