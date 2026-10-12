export default function meshPolygonGroupModule(module, exports, loadModule) {
  const PhysicsConstants = loadModule('domain/physics/physics-constants');
  module.exports = class MeshPolygonGroup {
    constructor(t, e) {
      ((this.name = t), (this.polys = e));
    }
    getPolygonByID(t) {
      let e = this.polys;
      for (let i = 0, s = e.length; i !== s; ++i) if (e[i].uid === t) return e[i];
      return null;
    }
    setCollisionGroup(t) {
      let e = this.polys;
      for (let i = 0, s = e.length; i !== s; ++i) e[i].collisionGroup = t;
    }
    setPolyFrictionAndRestitution() {
      let t = this.polys;
      for (let e = 0, i = t.length; e !== i; ++e)
        PhysicsConstants.setPolyFrictionAndRestitution(t[e]);
    }
    setCustomRelativeVelHandler(t) {
      let e = this.polys;
      for (let i = 0, s = e.length; i !== s; ++i) e[i].setCustomRelativeVelHandler(t);
    }
  };
}
