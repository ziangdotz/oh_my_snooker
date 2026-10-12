import isInteriorShadowCaster from './interior-shadow-role.js';

/** Bake short-range static contact shading from authored pieces before material merging. */
export default function bakeInteriorContactShading(B, scene, prefix, meshes, bounds) {
  const blockers = meshes
    .filter((mesh) => !mesh.material.disableLighting && mesh.material.alpha === 1)
    .map((mesh) => {
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      return { mesh, min: box.minimumWorld.asArray(), max: box.maximumWorld.asArray() };
    });
  const radius = 0.24;
  let shadedVertices = 0;
  let minimum = 1;
  function hit(origin, direction, blocker) {
    let near = 0;
    let far = radius;
    for (let axis = 0; axis < 3; axis++) {
      if (Math.abs(direction[axis]) < 0.00001) {
        if (origin[axis] < blocker.min[axis] || origin[axis] > blocker.max[axis]) {
          return radius;
        }
      } else {
        const a = (blocker.min[axis] - origin[axis]) / direction[axis];
        const b = (blocker.max[axis] - origin[axis]) / direction[axis];
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
        if (far < near) {
          return radius;
        }
      }
    }
    return near;
  }
  for (const mesh of meshes) {
    const positions = mesh.getVerticesData(B.VertexBuffer.PositionKind);
    const normals = mesh.getVerticesData(B.VertexBuffer.NormalKind);
    const matrix = mesh.computeWorldMatrix(true);
    const colors = [];
    const uv2 = [];
    const caster = isInteriorShadowCaster(mesh.name) && !mesh.material.disableLighting;
    const box = mesh.getBoundingInfo().boundingBox;
    const meshMin = box.minimumWorld.asArray();
    const meshMax = box.maximumWorld.asArray();
    // The mesh-wide shortlist is conservative: every blocker reachable by a vertex ray remains.
    const neighbors = caster
      ? blockers.filter(
          (blocker) =>
            blocker.mesh !== mesh &&
            blocker.min.every((value, axis) => value < meshMax[axis] + radius + 0.008) &&
            blocker.max.every((value, axis) => value > meshMin[axis] - radius - 0.008),
        )
      : [];
    for (let index = 0; index < positions.length; index += 3) {
      const point = B.Vector3.TransformCoordinates(B.Vector3.FromArray(positions, index), matrix);
      uv2.push(
        (point.x - bounds.left) / (bounds.right - bounds.left),
        1 - (point.z - bounds.front) / (bounds.back - bounds.front),
      );
      let shade = 1;
      if (caster) {
        const normal = B.Vector3.TransformNormal(
          B.Vector3.FromArray(normals, index),
          matrix,
        ).normalize();
        const tangent = B.Vector3.Cross(
          normal,
          Math.abs(normal.y) < 0.9 ? B.Vector3.Up() : new B.Vector3(1, 0, 0),
        ).normalize();
        const bitangent = B.Vector3.Cross(normal, tangent);
        const origin = point.add(normal.scale(0.008)).asArray();
        const nearby = neighbors.filter(
          (blocker) =>
            blocker.mesh !== mesh &&
            blocker.min.every((value, axis) => value < origin[axis] + radius) &&
            blocker.max.every((value, axis) => value > origin[axis] - radius),
        );
        let occlusion = 0;
        for (let sample = 0; sample < 6 && nearby.length > 0; sample++) {
          const angle = (sample * Math.PI) / 3;
          const direction = normal
            .scale(0.65)
            .add(tangent.scale(Math.cos(angle) * 0.76))
            .add(bitangent.scale(Math.sin(angle) * 0.76))
            .normalize()
            .asArray();
          const distance = Math.min(...nearby.map((blocker) => hit(origin, direction, blocker)));
          occlusion += (1 - distance / radius) ** 2 / 6;
        }
        shade = 1 - occlusion * 0.3;
        if (shade < 0.99) {
          shadedVertices++;
        }
        minimum = Math.min(minimum, shade);
      }
      colors.push(shade, shade, shade, 1);
    }
    mesh.setVerticesData(B.VertexBuffer.ColorKind, colors);
    mesh.setVerticesData(B.VertexBuffer.UV2Kind, uv2);
    mesh.hasVertexAlpha = false;
  }
  const size = 1024;
  const texture = new B.DynamicTexture(prefix + 'floor-contact-lightmap', size, scene, true);
  const context = texture.getContext();
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  const width = bounds.right - bounds.left;
  const depth = bounds.back - bounds.front;
  let footprints = 0;
  for (const blocker of [
    ...blockers.filter((item) => isInteriorShadowCaster(item.mesh.name)),
    ...['TableBot', 'Frame'].map((name) => {
      const mesh = scene.getMeshByName(name);
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      return { mesh, min: box.minimumWorld.asArray(), max: box.maximumWorld.asArray() };
    }),
  ]) {
    if (blocker.min[1] > 0.75 || blocker.max[1] < 0.045) {
      continue;
    }
    const x = ((blocker.min[0] - bounds.left) / width) * size;
    const y = ((blocker.min[2] - bounds.front) / depth) * size;
    const w = ((blocker.max[0] - blocker.min[0]) / width) * size;
    const h = ((blocker.max[2] - blocker.min[2]) / depth) * size;
    const softness = 4 + Math.max(0, blocker.min[1]) * 22;
    const opacity = 0.17 * Math.exp(-Math.max(0, blocker.min[1]) * 2.5);
    // Nested outlines make a feathered footprint without extra transparent scene meshes.
    for (let ring = 4; ring >= 0; ring--) {
      const spread = (ring * softness) / 4;
      context.fillStyle = 'rgba(36,32,27,' + opacity / 5 + ')';
      context.fillRect(x - spread, y - spread, w + spread * 2, h + spread * 2);
    }
    footprints++;
  }
  texture.coordinatesIndex = 1;
  texture.anisotropicFilteringLevel = 8;
  texture.update();
  const floorMaterials = new Set(
    meshes
      .filter((mesh) => /(?:floor|board|stone-tile|rug)/.test(mesh.name))
      .map((mesh) => mesh.material),
  );
  for (const material of floorMaterials) {
    material.lightmapTexture = texture;
    material.useLightmapAsShadowmap = true;
  }
  return { radius, shadedVertices, minimum, footprints, floorMapSize: size };
}
