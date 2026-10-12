// Explicit live dependencies preserve initialization and shared state.
export default function createReplayCameraController(dependencies) {
  return class ReplayCameraController {
    constructor() {
      ((this._position = new Float32Array(3)),
        (this._targetPoint = new Float32Array(3)),
        (this._targetPath = new dependencies.PathFollower()),
        (this._targetMode = dependencies.ReplayTargetKind.POINT));
    }
    setPosition(t, e, i) {
      return ((this._position[0] = t), (this._position[1] = e), (this._position[2] = i), this);
    }
    setTargetPoint(t, e, i) {
      return (
        (this._targetPoint[0] = t),
        (this._targetPoint[1] = e),
        (this._targetPoint[2] = i),
        (this._targetMode = dependencies.ReplayTargetKind.POINT),
        this
      );
    }
    setTargetPath(t, e) {
      return (
        this._targetPath.resetDataWithPath(t),
        (this._targetPoint[1] = e),
        (this._targetMode = dependencies.ReplayTargetKind.PATH),
        this
      );
    }
    update(t, e) {
      let i = t.position,
        s = t.lockedTarget,
        n = this._position,
        r = this._targetPoint,
        a = 1;
      ((s.y = r[1]),
        this._targetMode === dependencies.ReplayTargetKind.PATH
          ? (a = this._targetPath.update(s, e))
          : ((s.x = r[0]), (s.z = r[2])));
      let o = 1 - a;
      ((i.x = n[0] + (s.x - n[0]) * o),
        (i.y = n[1] + (s.y - n[1]) * o),
        (i.z = n[2] + (s.z - n[2]) * o));
    }
  };
}
