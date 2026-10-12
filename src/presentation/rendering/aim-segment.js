// Explicit live dependencies preserve initialization and shared state.
export default function createAimSegment(dependencies) {
  return class AimSegment extends dependencies.OrientedUiPlane {
    constructor(t, e, i, s, n, r) {
      (super(t, e, i, s, n), (this.distance = r), (this.ow = 0), (this.spacing = 0));
    }
  };
}
