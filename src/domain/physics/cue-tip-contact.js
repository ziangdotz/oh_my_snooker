export default function cueTipContactModule(module, exports, loadModule) {
  const BallSurfaceContact = loadModule('domain/physics/ball-surface-contact'),
    VectorThree = loadModule('domain/math/vector-three'),
    MatrixThree = loadModule('domain/math/matrix-three');
  module.exports = class CueTipContact extends BallSurfaceContact {
    get label() {
      return 'tip';
    }
    constructor(t) {
      (super(null, 0),
        (this.isSS = !1),
        (this.restitution = 0),
        (this.friction = 0.9),
        (this.bj = {
          v: new VectorThree(0, 0, 0),
          w: new VectorThree(0, 0, 0),
          radius: 0,
          mass: t,
          invMass: t > 0 ? 1 / t : 0,
          invInertia: new MatrixThree().set(0, 0, 0, 0, 0, 0, 0, 0, 0),
        }));
    }
    resetTip(t, e) {
      this.bi = t;
      let i = this.bj;
      ((i.radius = e[7]), i.v.set(e[3], e[4], e[5]).scale(e[6]));
      let s = t.position;
      (this._normal.set(s.x - e[0], s.y - e[1], s.z - e[2]).normalize(),
        this.markNormalRelatedDirty());
    }
    free() {
      this.bi = null;
    }
    dispose() {
      ((this.bi = null), (this.bj = null));
    }
  };
}
