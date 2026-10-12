/** Cache a bounded set of decorative rooms inside one unchanged game scene. */
export default function createInteriorSwitcher(scene, registry) {
  const rooms = new Map();
  const original = scene.metadata.interiorDesign;
  const originalMeshes = original.roomMeshes.map((name) => scene.getMeshByName(name));
  rooms.set(original.id, {
    metadata: original,
    meshes: originalMeshes,
    enabled: originalMeshes.map((mesh) => mesh.isEnabled()),
    lights: [],
    materials: [],
    textures: [],
  });
  let current = original.id;
  let operation = null;

  function snapshot() {
    return Object.fromEntries(
      ['meshes', 'lights', 'materials', 'textures'].map((key) => [key, new Set(scene[key])]),
    );
  }
  function added(before) {
    return Object.fromEntries(
      Object.keys(before).map((key) => [key, scene[key].filter((item) => !before[key].has(item))]),
    );
  }
  function enable(room, active) {
    room.meshes.forEach((mesh, index) => mesh.setEnabled(active && room.enabled[index]));
    room.lights.forEach((light) => light.setEnabled(active));
  }
  function activate(id) {
    for (const [key, room] of rooms) {
      enable(room, key === id);
    }
    scene.metadata.interiorDesign = rooms.get(id).metadata;
    scene.resetCachedMaterial();
  }
  function dispose(room) {
    for (const key of ['lights', 'meshes', 'materials', 'textures']) {
      for (const item of room[key]) {
        item.dispose();
      }
    }
  }
  function build(id) {
    if (rooms.has(id)) {
      return;
    }
    const design = registry.get(id);
    if (!design) {
      throw new Error('Unknown interior design: ' + id);
    }
    const before = snapshot();
    try {
      design.apply(scene);
      const room = added(before);
      room.metadata = scene.metadata.interiorDesign;
      room.enabled = room.meshes.map((mesh) => mesh.isEnabled());
      rooms.set(id, room);
    } catch (error) {
      dispose(added(before));
      activate(current);
      throw error;
    }
  }
  function cancel() {
    if (operation) {
      operation.fail(new Error('Venue switch cancelled'));
    }
  }
  scene.onDisposeObservable.add(cancel);
  return {
    initialize(id) {
      build(id);
      activate(id);
      current = id;
    },
    cancel,
    isCached(id) {
      const room = rooms.get(id);
      return Boolean(room && room.textures.every((texture) => texture.isReady()));
    },
    switchTo(id) {
      if (operation) {
        return Promise.reject(new Error('Venue switch already in progress'));
      }
      return new Promise((resolve, reject) => {
        const cached = rooms.has(id);
        let timer;
        let rendered = false;
        const deadline = performance.now() + 15000;
        function fail(error) {
          clearTimeout(timer);
          operation = null;
          if (!cached && rooms.has(id)) {
            dispose(rooms.get(id));
            rooms.delete(id);
          }
          if (!scene.isDisposed) {
            activate(current);
          }
          reject(error);
        }
        operation = { fail };
        function ready() {
          const room = rooms.get(id);
          const error = room.textures.find((texture) => texture.interiorLoad?.error);
          if (error || scene.isDisposed || performance.now() > deadline) {
            fail(new Error(error?.interiorLoad.error || 'Venue preparation timed out'));
            return;
          }
          try {
            if (room.textures.every((texture) => texture.isReady()) && scene.isReady()) {
              // The first draw also prepares static shadow-map effects. Keep the
              // loading layer until the following readiness check succeeds.
              if (rendered) {
                for (const material of room.materials) {
                  if (!material.doNotFreeze) {
                    material.freeze();
                  }
                }
                current = id;
                operation = null;
                resolve();
                return;
              }
              scene.render();
              rendered = true;
            }
            timer = setTimeout(ready, 16);
          } catch (error) {
            fail(error);
          }
        }
        try {
          build(id);
          activate(id);
          ready();
        } catch (error) {
          fail(error);
        }
      });
    },
  };
}
