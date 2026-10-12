import test from 'node:test';
import assert from 'node:assert/strict';
import babylonModule from '../../src/third-party/rendering/babylon-engine.js';
import legacyFactory from '../../src/compatibility/legacy-factory.js';
import createInteriorGeometry from '../../src/presentation/scenes/interior-geometry.js';

test('upholstery is closed, correctly wound for Babylon, and stays within its furniture envelope', () => {
  const module = { exports: {} };
  legacyFactory(babylonModule)(module, module.exports, () => ({}));
  const B = module.exports;
  const engine = new B.NullEngine();
  const scene = new B.Scene(engine);
  try {
    const mesh = createInteriorGeometry(B, scene)('seat', [1, 0.22, 0.9], [0, 0, 0], 0.06);
    const positions = mesh.getVerticesData(B.VertexBuffer.PositionKind);
    const normals = mesh.getVerticesData(B.VertexBuffer.NormalKind);
    const indices = mesh.getIndices();
    const half = [0.5, 0.11, 0.45];
    for (let index = 0; index < positions.length; index++) {
      assert.ok(Math.abs(positions[index]) <= half[index % 3] + 1e-7);
    }
    const crownedFace = [];
    for (let index = 0; index < positions.length; index += 3) {
      const normal = B.Vector3.FromArray(normals, index);
      assert.ok(Math.abs(normal.length() - 1) < 1e-6, 'a soft face has an unnormalized normal');
      if (
        normal.y > 0.9 &&
        Math.abs(positions[index] - 0.25) < 0.001 &&
        Math.abs(positions[index + 2]) < 1e-6
      ) {
        crownedFace.push({ height: positions[index + 1], slope: normal.x });
      }
    }
    assert.ok(
      crownedFace.some((face) => face.height < half[1] && face.slope > 0.008),
      'the soft top remains an entirely flat box',
    );
    for (let index = 0; index < indices.length; index += 3) {
      const [a, b, c] = indices
        .slice(index, index + 3)
        .map((vertex) => B.Vector3.FromArray(positions, vertex * 3));
      const cross = B.Vector3.Cross(b.subtract(a), c.subtract(a));
      const normal = B.Vector3.FromArray(normals, indices[index] * 3);
      assert.ok(B.Vector3.Dot(cross, normal) < 0, 'a triangle faces inside the cushion');
    }
    for (let axis = 0; axis < 3; axis++) {
      for (const sign of [-1, 1]) {
        assert.ok(
          positions.some(
            (value, index) => index % 3 === axis && Math.abs(value - sign * half[axis]) < 1e-7,
          ),
        );
      }
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
