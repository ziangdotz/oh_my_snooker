export default function snookerBallModule(module, exports, loadModule) {
  const PhysicsApi = loadModule('domain/physics/physics-api'),
    n = PhysicsApi.Vec3,
    r = PhysicsApi.Sphere;
  module.exports = class SnookerBall extends r {
    constructor(t, e, i, s, r, a, o) {
      (super(e, i, 0, 0, 0, 0, 0, 0),
        (this.number = t),
        (this.spot = new n(s, r, a)),
        (this.index = o));
    }
  };
}
