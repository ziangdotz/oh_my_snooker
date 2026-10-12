export default function physicsApiModule(module, exports, loadModule) {
  module.exports = {
    Vec3: loadModule('domain/math/vector-three'),
    Quaternion: loadModule('domain/math/quaternion'),
    WorldClient: loadModule('domain/physics/world-client'),
    World: loadModule('domain/physics/world'),
    MeshBody: loadModule('domain/physics/mesh-body'),
    Sphere: loadModule('domain/physics/ball-body'),
    exts: { uv4pg: loadModule('domain/geometry/collision-mesh-decoder') },
  };
}
