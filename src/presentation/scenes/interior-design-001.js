import createInteriorFinishes from './interior-finishes.js';
import createInteriorGeometry from './interior-geometry.js';
import createInteriorArchitecture from './interior-architecture.js';
import createInteriorLighting from './interior-lighting.js';
import isInteriorShadowCaster from './interior-shadow-role.js';
import buildInteriorShell from './interior-shell.js';
import configureInteriorSurface from './interior-surface.js';
import bakeInteriorContactShading from './interior-contact-shading.js';

/** 室内设计001 — warm oak club, fine woven banquette and olive panelling. */
export default function interiorDesign001Module(module, _exports, loadModule) {
  const B = loadModule('adapters/rendering/babylon-engine');
  const artworkUrl = loadModule('assets/images-interior-design-001-art');
  const oakUrl = loadModule('assets/textures-room-interior-design-001-oak');
  const plasterUrl = loadModule('assets/textures-room-warm-plaster');
  const linenUrl = loadModule('assets/textures-room-interior-design-003-linen');
  const prefix = 'interior-design-001-';
  const shaderName = 'interiorDesign001';
  const palette = {
    plaster: '#dcd7ca',
    pine: '#4d5741',
    graphite: '#333b2c',
    bronze: '#b79861',
    ivory: '#e9dfc8',
    oak: '#b6b6a5',
    ceiling: '#e3ded2',
    upholstery: '#e9ddc6',
    shadow: '#4d4437',
  };

  function apply(scene) {
    if (scene.getMeshByName(prefix + 'floor')) {
      return;
    }
    // These are decorative meshes only. Table geometry and both original game lights stay intact.
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
    for (const name of replaced) {
      scene.getMeshByName(name).setEnabled(false);
    }
    const roomMeshes = [];
    const materials = {};
    const groups = new Map();
    const features = [];
    const definition = {
      height: 3.35,
      doorX: 4.7,
      windows: [-1.45, 2.65],
      floorIntensity: 0.48,
      ambientIntensity: 0.4,
      galleryIntensity: 1.18,
      loungeIntensity: 0.92,
      picturePosition: [-1.55, 2.77, -3.3],
    };
    const finishes = createInteriorFinishes(B, scene);
    const roundedMesh = createInteriorGeometry(B, scene);
    function material(name, hex, glow = 0.006) {
      const value = new B.StandardMaterial(prefix + name, scene);
      configureInteriorSurface(B, shaderName, value, definition.height);
      const color = B.Color3.FromHexString(hex);
      value.diffuseColor = color;
      value.emissiveColor = color.scale(glow);
      value.specularColor = new B.Color3(0.025, 0.022, 0.018);
      value.specularPower = 48;
      value.maxSimultaneousLights = 8;
      materials[name] = value;
      return value;
    }
    for (const [name, color] of Object.entries(palette)) {
      material(name, color);
    }
    material('light', '#ffe0ab', 1);
    materials.light.disableLighting = true;
    materials.light.diffuseColor = B.Color3.Black();
    material('rug', '#91836b');
    material('frame-inner', '#303731');
    for (let index = 0; index < 5; index++) {
      material('oak-' + index, ['#d9ddd4', '#d1d8cb', '#e0e3db', '#d7dccf', '#daddd1'][index]);
    }
    for (const name of ['oak', 'oak-0', 'oak-1', 'oak-2', 'oak-3', 'oak-4']) {
      finishes.texture(materials[name], oakUrl, 0.65);
    }
    finishes.texture(materials.plaster, plasterUrl, 1.2);
    finishes.texture(materials.ceiling, plasterUrl, 1.2);
    finishes.texture(materials.upholstery, linenUrl, 3);
    finishes.texture(materials.rug, linenUrl, 4);
    materials.bronze.specularColor = new B.Color3(0.48, 0.39, 0.26);
    materials.bronze.specularPower = 96;
    materials.bronze.metadata.surfaceKind = 'metal';
    materials.ceiling.emissiveColor = B.Color3.FromHexString(palette.ceiling).scale(0.012);
    function finish(mesh, mat, merge = true) {
      mesh.material = typeof mat === 'string' ? materials[mat] : mat;
      mesh.isPickable = false;
      mesh.checkCollisions = false;
      mesh.receiveShadows = true;
      finishes.map(mesh);
      if (merge) {
        const key = mesh.material.name + (isInteriorShadowCaster(mesh.name) ? '-casters' : '');
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key).push(mesh);
        mesh.computeWorldMatrix(true);
      } else {
        mesh.freezeWorldMatrix();
        roomMeshes.push(mesh);
      }
      return mesh;
    }
    function box(name, size, position, mat, merge = true) {
      const mesh = B.MeshBuilder.CreateBox(
        prefix + name,
        {
          width: size[0],
          height: size[1],
          depth: size[2],
        },
        scene,
      );
      mesh.position.set(...position);
      return finish(mesh, mat, merge);
    }
    function cylinder(name, diameter, height, position, mat) {
      const mesh = B.MeshBuilder.CreateCylinder(
        prefix + name,
        {
          diameter,
          height,
          tessellation: 24,
        },
        scene,
      );
      mesh.position.set(...position);
      return finish(mesh, mat);
    }
    function plane(name, width, height, position, mat, rotation = Math.PI) {
      const mesh = B.MeshBuilder.CreatePlane(prefix + name, { width, height }, scene);
      mesh.position.set(...position);
      mesh.rotation.y = rotation;
      return finish(mesh, mat, false);
    }
    function tube(name, points, radius, mat) {
      return finish(
        B.MeshBuilder.CreateTube(
          prefix + name,
          { path: points.map((point) => new B.Vector3(...point)), radius, tessellation: 12 },
          scene,
        ),
        mat,
      );
    }
    function feature(type, name, position, size) {
      features.push({ type, name, position, size });
    }
    const architecture = createInteriorArchitecture({
      B,
      scene,
      prefix,
      box,
      cylinder,
      tube,
      materials,
      material,
      feature,
      finish,
    });
    const centerX = 0.4146;
    const left = -6.0854;
    const right = 6.9146;
    const front = -4;
    const back = 8;
    const height = 3.35;

    buildInteriorShell(
      box,
      { left, right, front, back, ceiling: height },
      definition,
      'plaster',
      'shadow',
    );
    // Real staggered boards and narrow joints define scale; contact shading is baked separately.
    for (let row = 0; row < 40; row++) {
      for (let segment = 0; segment < 5; segment++) {
        const start = left + segment * 2.6;
        const split = row % 2 === 0 ? 0 : 1.3;
        const x0 = Math.max(left, start - split);
        const x1 = Math.min(right, start + 2.6 - split);
        if (x1 > x0) {
          box(
            'board',
            [x1 - x0 - 0.006, 0.018, 0.292],
            [(x0 + x1) / 2, -0.006, front + 0.15 + row * 0.3],
            'oak-' + ((row * 3 + segment) % 5),
          );
        }
      }
      if (row % 2 !== 0) {
        box(
          'board-end',
          [1.294, 0.018, 0.292],
          [right - 0.65, -0.006, front + 0.15 + row * 0.3],
          'oak-' + (row % 5),
        );
      }
    }
    for (const z of [front + 0.018, back - 0.018]) {
      box('wainscot', [13, 0.86, 0.036], [centerX, 0.43, z], 'pine');
      box('rail', [13, 0.016, 0.05], [centerX, 0.865, z], 'bronze');
      box('skirting', [13, 0.095, 0.046], [centerX, 0.048, z], 'graphite');
      box('cove', [12.8, 0.025, 0.11], [centerX, 3.16, z], 'light');
      box('cove-lip', [13, 0.09, 0.16], [centerX, 3.1, z], 'pine');
      for (let index = 0; index < 15; index++) {
        box('joint', [0.01, 0.7, 0.045], [left + 0.4 + index * 0.85, 0.45, z], 'graphite');
      }
    }
    for (const x of [left + 0.018, right - 0.018]) {
      box('side-wainscot', [0.036, 0.86, 12], [x, 0.43, 2], 'pine');
      box('side-rail', [0.05, 0.016, 12], [x, 0.865, 2], 'bronze');
      box('side-skirting', [0.046, 0.095, 12], [x, 0.048, 2], 'graphite');
      box('side-cove', [0.11, 0.025, 11.8], [x, 3.16, 2], 'light');
      box('side-cove-lip', [0.16, 0.09, 12], [x, 3.1, 2], 'pine');
      for (let index = 0; index < 14; index++) {
        box('side-joint', [0.045, 0.7, 0.01], [x, 0.45, front + 0.4 + index * 0.85], 'graphite');
      }
    }

    // The accepted artwork remains the focal point; the surrounding wall stays free of lettering.
    box('art-mounting-panel', [3.04, 1.98, 0.027], [-1.55, 1.88, -3.971], 'ivory');
    box('art-wall-spacer', [2.2, 1.35, 0.025], [-1.55, 1.82, -3.94], 'frame-inner');
    box('art-frame', [2.46, 1.68, 0.07], [-1.55, 1.82, -3.91], 'bronze');
    box('art-mount', [2.4, 1.62, 0.08], [-1.55, 1.82, -3.875], 'frame-inner');
    const art = material('artwork', '#ffffff', 0.025);
    art.diffuseTexture = new B.Texture(artworkUrl, scene);
    plane('art', 2.34, 1.56, [-1.55, 1.82, -3.828], art);
    architecture.pictureLight(-1.55, 2.79, -3.9, 1.6);

    // A floating acoustic ceiling and two slim task-light bars keep sight lines open.
    box('acoustic-canopy', [5.9, 0.08, 3.5], [0, 3.12, 0], 'pine');
    for (let index = 0; index < 22; index++) {
      box('ceiling-batten', [5.76, 0.055, 0.048], [0, 3.05, -1.6 + index * 0.15], 'oak');
    }
    for (const z of [-0.65, 0.65]) {
      box('pendant', [3.65, 0.07, 0.15], [0, 2.67, z], 'graphite');
      box('pendant-diffuser', [3.45, 0.012, 0.115], [0, 2.629, z], 'light');
      for (const x of [-1.45, 1.45]) {
        box('pendant-wire', [0.007, 0.4, 0.007], [x, 2.9, z], 'graphite');
        cylinder('pendant-ceiling-rose', 0.045, 0.025, [x, 3.08, z], 'graphite');
      }
    }

    // Quiet lounge behind the original camera start: built-in seating, oak tables and inset panels.
    const rug = box('lounge-rug', [5.9, 0.014, 2.1], [-0.4, 0.012, 6.8], 'rug');
    const plinth = box('bench-plinth', [5.2, 0.14, 0.82], [-0.4, 0.14, 7.35], 'graphite');
    const seatFrame = box('bench-support-frame', [5.15, 0.09, 0.78], [-0.4, 0.245, 7.35], 'oak');
    architecture.contact('banquette-frame-to-plinth', seatFrame, plinth);
    for (const x of [-2.75, -0.4, 1.95]) {
      for (const z of [7.07, 7.64]) {
        const foot = cylinder('bench-foot', 0.07, 0.055, [x, 0.0465, z], 'bronze');
        architecture.contact('banquette-foot-to-rug', foot, rug);
        architecture.contact('banquette-plinth-to-foot', plinth, foot);
      }
    }
    // Five individual upholstered seats with stitched front edges.
    for (let index = 0; index < 5; index++) {
      const x = -2.48 + index * 1.04;
      for (const [key, size, position] of [
        ['seat', [1.025, 0.22, 0.9], [x, 0.38, 7.31]],
        ['back', [1.025, 0.55, 0.2], [x, 0.75, 7.68]],
      ]) {
        const mesh = roundedMesh(prefix + 'bench-' + key, size, position, 0.06);
        finish(mesh, materials.upholstery);
        if (key === 'seat') {
          architecture.contact('banquette-cushion-to-frame', mesh, seatFrame);
        }
      }
      box('bench-piping', [0.99, 0.012, 0.014], [x, 0.43, 6.865], 'ivory');
    }
    for (const x of [-1.8, 1.0]) {
      const foot = cylinder('coffee-table-foot', 0.42, 0.032, [x, 0.035, 6.65], 'bronze');
      const stem = cylinder('coffee-table-base', 0.09, 0.42, [x, 0.254, 6.65], 'bronze');
      const flange = cylinder('coffee-table-mount', 0.22, 0.022, [x, 0.465, 6.65], 'bronze');
      const top = cylinder('coffee-table-top', 0.86, 0.055, [x, 0.49, 6.65], 'oak');
      architecture.contact('coffee-foot-to-rug', foot, rug);
      architecture.contact('coffee-stem-to-foot', stem, foot);
      architecture.contact('coffee-mount-to-stem', flange, stem);
      architecture.contact('coffee-top-to-mount', top, flange);
    }
    box('back-recess', [6.4, 1.58, 0.035], [-0.4, 1.79, 7.965], 'graphite');
    for (let index = 0; index < 31; index++) {
      box('back-slat', [0.075, 1.55, 0.09], [-3.4 + index * 0.2, 1.79, 7.9], 'oak');
    }
    box('back-picture-light', [5.8, 0.015, 0.08], [-0.4, 2.57, 7.83], 'light');
    architecture.portal(4.7, 'pine', 'oak');

    // Side-wall cue storage and graphic reliefs replace the old incidental furniture.
    box('cue-rack-back', [0.09, 1.85, 1.4], [right - 0.075, 1.4, 0.4], 'graphite');
    for (const y of [0.66, 2.14]) {
      box('cue-rack-rail', [0.16, 0.06, 1.38], [right - 0.14, y, 0.4], 'bronze');
    }
    for (let index = 0; index < 7; index++) {
      cylinder('display-cue', 0.018, 1.62, [right - 0.18, 1.42, -0.2 + index * 0.2], 'oak');
    }
    for (const z of definition.windows) {
      architecture.window(z, 'oak');
    }
    architecture.wallSconce(left + 0.045, 4.85, 'bronze');
    architecture.wallSconce(right - 0.045, 4.85, 'bronze');

    // Merge static pieces by material to keep hundreds of authored details within a small draw budget.
    const contactShading = bakeInteriorContactShading(
      B,
      scene,
      prefix,
      [...groups.values()].flat().concat(roomMeshes),
      { left, right, front, back },
    );
    for (const [name, meshes] of groups) {
      const merged = B.Mesh.MergeMeshes(meshes, true, true);
      merged.name = prefix + 'structure-' + name.slice(prefix.length);
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
        id: 'interior-design-001',
        name: '室内设计001',
        palette,
        features: [
          {
            type: 'furniture',
            name: 'woven-banquette',
            position: [-0.4, 0.55, 7.35],
            size: [5.2, 1, 1.05],
          },
          ...[-1.8, 1].map((x) => ({
            type: 'furniture',
            name: 'oak-coffee-table',
            position: [x, 0.25, 6.65],
            size: [0.86, 0.52, 0.86],
          })),
          ...features,
        ],
        bounds: { left, right, front, back, ceiling: height },
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

  module.exports = apply;
}
