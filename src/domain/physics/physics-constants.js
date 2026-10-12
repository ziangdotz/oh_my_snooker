export default function physicsConstantsModule(module, exports, loadModule) {
  const VectorThree = loadModule('domain/math/vector-three');
  module.exports = {
    gravity: new VectorThree(0, -19, 0),
    tPrecision: 3e-4,
    islandUpdMinDisSq: 0.1,
    airAngularDamping: 0.99,
    frictionS: 0.01,
    frictionP: 0.15,
    restitution: {
      ball: 0.985,
      ground: 0.3,
      sidehard: 0.92,
      sidesoft: 0.45,
      tunnel: 0,
      pocket: 0.002,
      default: 0.5,
    },
    __gravityDir: null,
    getGravityDir: function () {
      return (
        this.__gravityDir || (this.__gravityDir = new VectorThree().normalizeVector(this.gravity)),
        this.__gravityDir
      );
    },
    setBallFrictionAndRestitution: function (t) {
      ((t.restitution = this.restitution.ball), (t.friction = this.frictionS));
    },
    setPolyFrictionAndRestitution: function (t) {
      t.friction = this.frictionP;
      var e = this.restitution;
      for (var i in e) if (t[i]) return void (t.restitution = e[i]);
      t.restitution = e.default;
    },
  };
}
