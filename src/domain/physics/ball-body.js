export default function ballBodyModule(module, exports, loadModule) {
  const RigidBody = loadModule('domain/physics/rigid-body'),
    VectorThree = loadModule('domain/math/vector-three'),
    Quaternion = loadModule('domain/math/quaternion');
  module.exports = class BallBody extends RigidBody {
    constructor(t, e, i, s, a, o, l, h) {
      (super(e, i, s, a, o, l, h), (this.radius = t), (this.radiusSq = t * t));
      let c = 1 / (0.4 * this.mass * this.radiusSq);
      (this.invInertia.set(c, 0, 0, 0, c, 0, 0, 0, c),
        (this.states = { position: new VectorThree(), orientation: new Quaternion() }));
    }
    getMotion() {
      return this.vSq + this.wSq * this.radiusSq;
    }
    syncStates(t) {
      let e = this.states;
      (e.position.interpolate(this.position, this.v, t),
        e.orientation.integrateQuad(this.orientation, this.w, t));
    }
  };
}
