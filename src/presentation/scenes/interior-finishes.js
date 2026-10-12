import createInteriorTexture from './create-interior-texture.js';

/** Material-scale UVs keep the same weave and grain size on walls and furniture. */
export default function createInteriorFinishes(B, scene) {
  const mappings = new Map();
  const textures = new Map();
  const surfaces = [];
  return {
    texture(material, url, scale = 1) {
      if (!textures.has(url)) {
        const texture = createInteriorTexture(B, url, scene);
        texture.anisotropicFilteringLevel = 8;
        textures.set(url, texture);
      }
      material.diffuseTexture = textures.get(url);
      const profile = url.includes('leather')
        ? {
            kind: 'leather',
            relief: 2.2,
            contrast: 0.88,
            saturation: 0.93,
            specular: 0.2,
            power: 40,
          }
        : url.includes('linen')
          ? {
              kind: 'fabric',
              relief: 1.4,
              contrast: 0.78,
              saturation: 0.9,
              specular: 0.018,
              power: 14,
            }
          : url.includes('oak')
            ? {
                kind: 'wood',
                relief: 1.1,
                contrast: 0.88,
                saturation: 0.84,
                specular: 0.09,
                power: 62,
              }
            : url.includes('plaster')
              ? {
                  kind: 'plaster',
                  relief: 0.8,
                  contrast: 0.55,
                  saturation: 0.82,
                  specular: 0.008,
                  power: 12,
                }
              : {
                  kind: 'stone',
                  relief: 0.7,
                  contrast: url.includes('terrazzo') ? 0.62 : 0.72,
                  saturation: 0.88,
                  specular: 0.12,
                  power: 88,
                };
      material.metadata.interiorSurface = [
        profile.relief,
        profile.contrast,
        profile.saturation,
        1 / 1254,
      ];
      material.metadata.surfaceKind = profile.kind;
      material.specularColor = new B.Color3(profile.specular, profile.specular, profile.specular);
      material.specularPower = profile.power;
      surfaces.push({ material: material.name, ...profile });
      mappings.set(material, { scale });
      return material;
    },
    surfaces,
    map(mesh) {
      const mapping = mappings.get(mesh.material);
      if (!mapping) {
        return;
      }
      const positions = mesh.getVerticesData(B.VertexBuffer.PositionKind);
      const normals = mesh.getVerticesData(B.VertexBuffer.NormalKind);
      const matrix = mesh.computeWorldMatrix(true);
      const uv = [];
      for (let index = 0; index < positions.length; index += 3) {
        const point = B.Vector3.TransformCoordinates(B.Vector3.FromArray(positions, index), matrix);
        const normal = B.Vector3.TransformNormal(B.Vector3.FromArray(normals, index), matrix);
        const x = Math.abs(normal.x);
        const y = Math.abs(normal.y);
        const z = Math.abs(normal.z);
        const face = mesh.metadata?.interiorTextureAxes?.[index / 3];
        if (face === 1 || (face === undefined && y >= x && y >= z)) {
          uv.push(point.z * mapping.scale, point.x * mapping.scale);
        } else if (face === 0 || (face === undefined && x >= z)) {
          uv.push(point.z * mapping.scale, point.y * mapping.scale);
        } else {
          uv.push(point.x * mapping.scale, point.y * mapping.scale);
        }
      }
      mesh.setVerticesData(B.VertexBuffer.UVKind, uv);
    },
  };
}
