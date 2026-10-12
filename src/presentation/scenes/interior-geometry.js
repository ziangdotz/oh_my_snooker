/** Soft edges on all axes for upholstery, without changing gameplay geometry. */
export default function createInteriorGeometry(B, scene) {
  return function roundedMesh(key, size, position, radius, yaw = 0) {
    const half = size.map((value) => value / 2);
    const bevel = Math.min(radius, ...half) * 0.85;
    const positions = [];
    const normals = [];
    const indices = [];
    const uvs = [];
    const textureAxes = [];
    const segments = 8;
    for (let axis = 0; axis < 3; axis++) {
      const u = (axis + 1) % 3;
      const v = (axis + 2) % 3;
      for (const sign of [-1, 1]) {
        const base = positions.length / 3;
        for (let row = 0; row <= segments; row++) {
          for (let column = 0; column <= segments; column++) {
            const point = [0, 0, 0];
            point[axis] = sign * half[axis];
            point[u] = ((column / segments) * 2 - 1) * half[u];
            point[v] = ((row / segments) * 2 - 1) * half[v];
            const core = point.map((value, index) =>
              Math.max(-half[index] + bevel, Math.min(half[index] - bevel, value)),
            );
            const normal = new B.Vector3(
              ...point.map((value, index) => value - core[index]),
            ).normalize();
            const rounded = core.map(
              (value, index) => value + [normal.x, normal.y, normal.z][index] * bevel,
            );
            // Deform identical positions identically on every face so the closed bevel stays joined.
            positions.push(
              ...rounded.map((value, index) => {
                const a = (index + 1) % 3;
                const b = (index + 2) % 3;
                const crown =
                  Math.max(0, 1 - (rounded[a] / half[a]) ** 2) *
                  Math.max(0, 1 - (rounded[b] / half[b]) ** 2);
                const faceWeight = Math.abs(value / half[index]) ** 6;
                return (
                  value -
                  Math.sign(value) * Math.min(0.014, half[index] * 0.12) * (1 - crown) * faceWeight
                );
              }),
            );
            normals.push(normal.x, normal.y, normal.z);
            uvs.push(column / segments, row / segments);
            textureAxes.push(axis);
          }
        }
        for (let row = 0; row < segments; row++) {
          for (let column = 0; column < segments; column++) {
            const a = base + row * (segments + 1) + column;
            const b = a + 1;
            const c = a + segments + 1;
            const d = c + 1;
            // Babylon's left-handed front faces use clockwise triangle winding.
            indices.push(...(sign > 0 ? [a, c, b, b, c, d] : [a, b, c, b, d, c]));
          }
        }
      }
    }
    const mesh = new B.Mesh(key, scene);
    const data = new B.VertexData();
    B.VertexData.ComputeNormals(positions, indices, normals);
    // Average duplicated face-border vertices so the crown does not introduce hard bevel seams.
    const shared = new Map();
    for (let index = 0; index < positions.length; index += 3) {
      const key = positions
        .slice(index, index + 3)
        .map((value) => value.toFixed(5))
        .join(',');
      const value = shared.get(key) || { normal: B.Vector3.Zero(), indices: [] };
      value.normal.addInPlace(B.Vector3.FromArray(normals, index));
      value.indices.push(index);
      shared.set(key, value);
    }
    for (const { normal, indices: vertices } of shared.values()) {
      normal.normalize();
      for (const index of vertices) {
        normals.splice(index, 3, normal.x, normal.y, normal.z);
      }
    }
    Object.assign(data, { positions, normals, indices, uvs });
    data.applyToMesh(mesh);
    mesh.position.set(...position);
    mesh.rotation.y = yaw;
    mesh.metadata = { interiorTextureAxes: textureAxes };
    return mesh;
  };
}
