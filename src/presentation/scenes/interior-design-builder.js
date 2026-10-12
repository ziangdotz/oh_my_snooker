import createInteriorGeometry from './interior-geometry.js';
import createInteriorFinishes from './interior-finishes.js';
import createInteriorArchitecture from './interior-architecture.js';
import createInteriorLighting from './interior-lighting.js';
import isInteriorShadowCaster from './interior-shadow-role.js';
import buildInteriorShell from './interior-shell.js';
import configureInteriorSurface from './interior-surface.js';
import bakeInteriorContactShading from './interior-contact-shading.js';

/** Shared decorative geometry and finishes; gameplay meshes never enter these groups. */
export default function interiorSceneBuilderModule(module, _exports, loadModule) {
  const B = loadModule('adapters/rendering/babylon-engine');
  const plasterUrl = loadModule('assets/textures-room-warm-plaster');
  const shader = 'interiorCollectionRoom';

  module.exports = function createRoom(scene, definition) {
    const { id, name, palette } = definition;
    const prefix = id + '-';
    const groups = new Map();
    const roomMeshes = [];
    const materials = {};
    const features = [];
    const finishes = createInteriorFinishes(B, scene);
    const roundedMesh = createInteriorGeometry(B, scene);
    const bounds = {
      left: -6.0854,
      right: 6.9146,
      front: -4,
      back: 8,
      ceiling: definition.height || 3.6,
    };
    const replaced = [
      'Room',
      'Ground',
      'RoofLights',
      'Pillars',
      'Corridor',
      'ItemEast',
      'ItemSouth1',
      'ItemSouth2',
      'ItemWest',
      'ItemNorth',
      'MainLight',
    ];
    for (const old of replaced) {
      scene.getMeshByName(old).setEnabled(false);
    }
    function material(key, hex, glow = 0.006) {
      const value = new B.StandardMaterial(prefix + key, scene);
      configureInteriorSurface(B, shader, value, bounds.ceiling);
      value.diffuseColor = B.Color3.FromHexString(hex);
      value.emissiveColor = value.diffuseColor.scale(glow);
      value.specularColor = new B.Color3(0.03, 0.03, 0.03);
      value.specularPower = 48;
      value.maxSimultaneousLights = 8;
      materials[key] = value;
      return value;
    }
    for (const [key, color] of Object.entries(palette)) {
      material(key, color);
    }
    finishes.texture(materials.wall, plasterUrl, 1.2);
    finishes.texture(materials.ceiling, plasterUrl, 1.2);
    for (const key of ['bronze', 'metal']) {
      if (materials[key]) {
        materials[key].specularColor = new B.Color3(0.48, 0.39, 0.26);
        materials[key].specularPower = 96;
        materials[key].metadata.surfaceKind = 'metal';
      }
    }
    material('light', definition.lightColor, 1);
    materials.light.disableLighting = true;
    materials.light.diffuseColor = B.Color3.Black();
    materials.ceiling.emissiveColor = materials.ceiling.diffuseColor.scale(definition.ceilingGlow);
    function feature(type, key, position, size) {
      features.push({ type, name: key, position, size });
    }
    function finish(mesh, key, merge = true) {
      mesh.material = typeof key === 'string' ? materials[key] : key;
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      mesh.receiveShadows = true;
      finishes.map(mesh);
      if (merge) {
        const caster = isInteriorShadowCaster(mesh.name);
        const group = mesh.material.name + (caster ? '-casters' : '');
        if (!groups.has(group)) {
          groups.set(group, []);
        }
        mesh.computeWorldMatrix(true);
        groups.get(group).push(mesh);
      } else {
        mesh.freezeWorldMatrix();
        roomMeshes.push(mesh);
      }
      return mesh;
    }
    function box(key, size, position, mat, yaw = 0, merge = true) {
      const mesh = B.MeshBuilder.CreateBox(
        prefix + key,
        { width: size[0], height: size[1], depth: size[2] },
        scene,
      );
      mesh.position.set(...position);
      mesh.rotation.y = yaw;
      return finish(mesh, mat, merge);
    }
    function cylinder(key, diameter, height, position, mat, options = {}) {
      const mesh = B.MeshBuilder.CreateCylinder(
        prefix + key,
        { diameter, height, tessellation: 32, ...options },
        scene,
      );
      mesh.position.set(...position);
      return finish(mesh, mat);
    }
    function sphere(key, size, position, mat, rotation = [0, 0, 0]) {
      const mesh = B.MeshBuilder.CreateSphere(prefix + key, { diameter: 1, segments: 12 }, scene);
      mesh.scaling.set(...size);
      mesh.position.set(...position);
      mesh.rotation.set(...rotation);
      return finish(mesh, mat);
    }
    function tube(key, points, radius, mat) {
      const mesh = B.MeshBuilder.CreateTube(
        prefix + key,
        { path: points.map((point) => new B.Vector3(...point)), radius, tessellation: 12 },
        scene,
      );
      return finish(mesh, mat);
    }
    function plane(key, width, height, position, mat, uvRange = [0, 1]) {
      const mesh = B.MeshBuilder.CreatePlane(prefix + key, { width, height }, scene);
      mesh.position.set(...position);
      mesh.rotation.y = Math.PI;
      const uv = mesh.getVerticesData(B.VertexBuffer.UVKind);
      for (let index = 0; index < uv.length; index += 2) {
        uv[index] = uvRange[0] + uv[index] * (uvRange[1] - uvRange[0]);
      }
      mesh.setVerticesData(B.VertexBuffer.UVKind, uv);
      return finish(mesh, mat, false);
    }
    function roundedBox(key, size, position, radius, mat, yaw = 0) {
      // Cushions and arms use a bevel on every edge, rather than an extruded footprint.
      if (['cushion', 'seat', 'back', 'arm', 'pillow'].some((part) => key.includes(part))) {
        return finish(roundedMesh(prefix + key, size, position, radius, yaw), mat);
      }
      const outline = [];
      const halfX = size[0] / 2;
      const halfZ = size[2] / 2;
      const r = Math.min(radius, halfX, halfZ);
      for (let corner = 0; corner < 4; corner++) {
        const center = [
          [halfX - r, halfZ - r],
          [-halfX + r, halfZ - r],
          [-halfX + r, -halfZ + r],
          [halfX - r, -halfZ + r],
        ][corner];
        for (let segment = 0; segment <= 6; segment++) {
          const angle = ((corner + segment / 6) * Math.PI) / 2;
          outline.push([center[0] + r * Math.cos(angle), center[1] + r * Math.sin(angle)]);
        }
      }
      const positions = [];
      const indices = [];
      const count = outline.length;
      for (const y of [-size[1] / 2, size[1] / 2]) {
        for (const [x, z] of outline) {
          positions.push(x, y, z);
        }
      }
      for (let index = 0; index < count; index++) {
        const next = (index + 1) % count;
        indices.push(index, next, index + count, next, next + count, index + count);
      }
      for (const y of [-size[1] / 2, size[1] / 2]) {
        const center = positions.length / 3;
        positions.push(0, y, 0);
        for (const [x, z] of outline) {
          positions.push(x, y, z);
        }
        for (let index = 0; index < count; index++) {
          const current = center + 1 + index;
          const next = center + 1 + ((index + 1) % count);
          indices.push(...(y < 0 ? [center, next, current] : [center, current, next]));
        }
      }
      const mesh = new B.Mesh(prefix + key, scene);
      const data = new B.VertexData();
      data.positions = positions;
      data.indices = indices;
      data.normals = [];
      B.VertexData.ComputeNormals(positions, indices, data.normals);
      // Unwrap the curved sides around the perimeter; projecting X/Z would stretch a single cloth row.
      const distances = [0];
      for (let index = 1; index < count; index++) {
        distances.push(
          distances[index - 1] +
            Math.hypot(
              outline[index][0] - outline[index - 1][0],
              outline[index][1] - outline[index - 1][1],
            ),
        );
      }
      const uvSize = Math.max(size[0], size[2]);
      data.uvs = [];
      for (let vertex = 0; vertex < positions.length / 3; vertex++) {
        const index = vertex * 3;
        if (vertex < count * 2) {
          data.uvs.push(
            distances[vertex % count] / uvSize,
            (positions[index + 1] + size[1] / 2) / uvSize,
          );
        } else {
          data.uvs.push(
            (positions[index] + halfX) / uvSize,
            (positions[index + 2] + halfZ) / uvSize,
          );
        }
      }
      data.applyToMesh(mesh);
      mesh.position.set(...position);
      mesh.rotation.y = yaw;
      return finish(mesh, mat);
    }
    function arch(key, x, z, width, base, shoulder, mat, trim) {
      const radius = width / 2;
      const perimeter = [
        [x - radius, base, z],
        [x - radius, shoulder, z],
      ];
      for (let index = 0; index <= 40; index++) {
        const angle = Math.PI - (index * Math.PI) / 40;
        perimeter.push([x + radius * Math.cos(angle), shoulder + radius * Math.sin(angle), z]);
      }
      perimeter.push([x + radius, base, z]);
      const positions = [x, (base + shoulder) / 2, z, ...perimeter.flat()];
      const indices = [];
      for (let index = 1; index <= perimeter.length; index++) {
        indices.push(0, index, index === perimeter.length ? 1 : index + 1);
      }
      const mesh = new B.Mesh(prefix + key, scene);
      const data = new B.VertexData();
      data.positions = positions;
      data.indices = indices;
      data.normals = positions.flatMap((_, index) => (index % 3 === 0 ? [0, 0, 1] : []));
      data.uvs = positions.flatMap((_, index) => (index % 3 === 0 ? [0, 0] : []));
      data.applyToMesh(mesh);
      materials[mat].backFaceCulling = false;
      finish(mesh, mat);
      tube(
        key + '-trim',
        perimeter.map((point) => [point[0], point[1], z + 0.012]),
        0.013,
        trim,
      );
    }
    function shell() {
      return buildInteriorShell(box, bounds, definition);
    }
    function complete() {
      const contactShading = bakeInteriorContactShading(
        B,
        scene,
        prefix,
        [...groups.values()].flat().concat(roomMeshes),
        bounds,
      );
      for (const [mat, meshes] of groups) {
        const merged = B.Mesh.MergeMeshes(meshes, true, true);
        merged.name = prefix + 'structure-' + mat.slice(prefix.length);
        merged.isPickable = false;
        merged.checkCollisions = false;
        merged.receiveShadows = true;
        merged.freezeWorldMatrix();
        roomMeshes.push(merged);
      }
      const lighting = createInteriorLighting(
        B,
        scene,
        prefix,
        roomMeshes,
        roomMeshes.filter((mesh) => mesh.name.endsWith('-casters')),
        definition,
      );
      scene.metadata = {
        ...scene.metadata,
        interiorDesign: {
          id,
          name,
          theme: definition.theme,
          palette,
          bounds,
          features,
          replacedMeshes: replaced,
          meshCount: roomMeshes.length,
          lighting: lighting.names,
          shadows: lighting.shadowMaps,
          contactShading,
          surfaces: finishes.surfaces,
          construction: architecture.details,
        },
      };
    }
    const room = {
      B,
      scene,
      prefix,
      palette,
      bounds,
      materials,
      roomMeshes,
      feature,
      material,
      finish,
      box,
      cylinder,
      sphere,
      tube,
      plane,
      roundedBox,
      texture: finishes.texture,
      arch,
      shell,
      complete,
    };
    const architecture = createInteriorArchitecture(room);
    return { ...room, ...architecture };
  };
}
