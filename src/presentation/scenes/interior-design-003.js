/** 室内设计003 — cobalt gallery with terrazzo, curved seating, halo lights and botanical accents. */
export default function interiorDesign003Module(module, _exports, loadModule) {
  const createRoom = loadModule('presentation/scenes/interior-design-builder');
  const artworkUrl = loadModule('assets/images-interior-design-003-art');
  const linenUrl = loadModule('assets/textures-room-interior-design-003-linen');
  const oakUrl = loadModule('assets/textures-room-interior-design-001-oak');
  const terrazzoUrl = loadModule('assets/textures-room-warm-terrazzo');
  const stoneUrl = loadModule('assets/textures-room-warm-limestone');
  const definition = {
    id: 'interior-design-003',
    name: '室内设计003',
    theme: '钴蓝海岸艺廊',
    palette: {
      wall: '#e5e1d8',
      ceiling: '#e9e5dd',
      floor: '#e9e5d9',
      chalk: '#f3e7d0',
      cobalt: '#2e4c71',
      navy: '#2c4058',
      ice: '#c7b89c',
      aqua: '#bca681',
      coral: '#cb8c75',
      metal: '#bba479',
      rug: '#c6b495',
      wood: '#e9d5b6',
      stone: '#dac9ab',
      fleck: '#7b888f',
      fleckLight: '#e6e5da',
      leaf: '#527c69',
      leafAlt: '#719581',
      soil: '#55534a',
    },
    lightColor: '#ffe3b1',
    doorX: 1.95,
    windows: [-1.5, 2.3],
    ceilingGlow: 0.012,
    ambientIntensity: 0.42,
    floorIntensity: 0.4,
    galleryIntensity: 1.02,
    loungeIntensity: 0.84,
    picturePosition: [-1.77, 3.14, -3.25],
  };
  module.exports = function apply(scene) {
    if (scene.getMeshByName(definition.id + '-floor')) {
      return;
    }
    const room = createRoom(scene, definition);
    const { B, box, roundedBox, cylinder, sphere, tube, plane, material, feature } = room;
    for (const color of ['chalk', 'ice', 'cobalt']) {
      room.texture(material('fabric-' + color, definition.palette[color]), linenUrl, 3);
    }
    room.texture(room.materials.floor, terrazzoUrl, 0.18);
    room.texture(room.materials.rug, linenUrl, 4);
    material('piping', '#c3ad8c');
    room.texture(room.materials.wood, oakUrl, 0.65);
    room.texture(room.materials.chalk, stoneUrl, 0.7);
    const floor = room.shell();
    // Dense small aggregates come from the scale-correct material, not sparse triangle meshes.
    feature('finish', 'light-terrazzo-floor', [0.4146, 0, 2], [13, 0.02, 12]);
    for (const z of [-3.96, 7.96]) {
      box('low-skirting', [13, 0.11, 0.045], [0.4146, 0.055, z], 'wood');
      box('wall-shadow-gap', [13, 0.018, 0.055], [0.4146, 0.12, z], 'ice');
    }
    for (const x of [-6.0454, 6.8746]) {
      box('side-skirting', [0.045, 0.11, 12], [x, 0.055, 2], 'wood');
    }
    // A continuous image is separated geometrically into a triptych with a shared texture.
    const artwork = material('artwork', '#ffffff', 0.025);
    artwork.diffuseTexture = new B.Texture(artworkUrl, scene);
    box('triptych-mounting-panel', [4.15, 2.52, 0.026], [-1.77, 1.84, -3.978], 'chalk');
    for (let panel = 0; panel < 3; panel++) {
      const x = -3.05 + panel * 1.28;
      box('triptych-wall-spacer', [1.06, 2.12, 0.022], [x, 1.84, -3.948], 'navy');
      box('triptych-frame', [1.17, 2.26, 0.055], [x, 1.84, -3.93], 'metal');
      plane('triptych-' + panel, 1.12, 2.2, [x, 1.84, -3.889], artwork, [
        (2 - panel) / 3,
        (3 - panel) / 3,
      ]);
    }
    room.pictureLight(-1.77, 3.16, -3.9, 2.85);
    feature('wall', 'cobalt-art-triptych', [-1.77, 1.84, -3.91], [3.73, 2.26, 0.08]);
    // Tall blue fins and an aqua ledge form a second, sculptural focal wall.
    box('fin-backing', [3.75, 2.68, 0.04], [3.69, 1.84, -3.965], 'ice');
    for (let index = 0; index < 24; index++) {
      box('cobalt-wall-fin', [0.075, 2.57, 0.16], [1.88 + index * 0.155, 1.84, -3.86], 'cobalt');
    }
    roundedBox('floating-aqua-ledge', [3.8, 0.075, 0.29], [3.68, 0.68, -3.69], 0.08, 'aqua');
    feature('wall', 'cobalt-ribbed-feature-wall', [3.69, 1.84, -3.86], [3.8, 2.68, 0.29]);
    // Circular light sculptures float at different levels; nothing duplicates design001's timber canopy.
    function horizontalRing(key, x, y, z, radiusX, radiusZ, mat, thickness) {
      const points = [];
      for (let index = 0; index <= 72; index++) {
        const angle = (index * Math.PI * 2) / 72;
        points.push([x + radiusX * Math.cos(angle), y, z + radiusZ * Math.sin(angle)]);
      }
      tube(key, points, thickness, mat);
    }
    roundedBox('floating-ceiling-island', [6.35, 0.09, 3.75], [0, 3.44, 0], 1.2, 'chalk');
    horizontalRing('large-halo-body', -0.55, 2.92, 0, 2.45, 1.2, 'metal', 0.045);
    horizontalRing('large-halo-light', -0.55, 2.885, 0, 2.45, 1.2, 'light', 0.025);
    horizontalRing('small-halo-body', 1.5, 3.08, 0.3, 1.12, 0.68, 'metal', 0.035);
    horizontalRing('small-halo-light', 1.5, 3.055, 0.3, 1.12, 0.68, 'light', 0.018);
    for (const [x, y, z, rx, rz] of [
      [-0.55, 2.92, 0, 2.45, 1.2],
      [1.5, 3.08, 0.3, 1.12, 0.68],
    ]) {
      for (const angle of [0.5, 2.6, 4.6]) {
        const px = x + rx * Math.cos(angle);
        const pz = z + rz * Math.sin(angle);
        cylinder('halo-wire', 0.007, 3.4 - y, [px, (3.4 + y) / 2, pz], 'metal');
        cylinder('halo-ceiling-rose', 0.055, 0.025, [px, 3.396, pz], 'metal');
      }
    }
    for (const z of [-3.86, 7.86]) {
      box('ceiling-reveal', [12.78, 0.018, 0.07], [0.4146, 3.45, z], 'light');
    }
    feature('ceiling', 'overlapping-elliptical-halos', [0, 2.96, 0], [6.15, 0.35, 2.45]);

    // An L-shaped lounge on the right replaces the rear straight bench and left-wall retro sofa.
    const rug = roundedBox('lounge-rug', [3.4, 0.016, 4.45], [5.04, 0.017, 5.38], 0.7, 'rug');
    for (const z of [4.05, 5.05, 6.05]) {
      const base = roundedBox('sofa-base', [1.1, 0.2, 0.94], [6.0, 0.22, z], 0.18, 'ice');
      const frame = box('sofa-support-frame', [1.0, 0.035, 0.87], [6.0, 0.325, z], 'wood');
      const seat = roundedBox(
        'sofa-cushion',
        [1.07, 0.21, 0.94],
        [5.96, 0.44, z],
        0.18,
        'fabric-chalk',
      );
      room.contact('sofa-seat-to-frame', seat, frame);
      room.contact('sofa-frame-to-base', frame, base);
      for (const dx of [-0.4, 0.4]) {
        for (const dz of [-0.31, 0.31]) {
          const foot = cylinder('sofa-foot', 0.065, 0.1, [6 + dx, 0.075, z + dz], 'metal');
          room.contact('sofa-foot-to-rug', foot, rug);
          room.contact('sofa-base-to-foot', base, foot);
        }
      }
      roundedBox('sofa-side-back', [0.25, 0.52, 0.98], [6.38, 0.78, z], 0.11, 'fabric-ice');
    }
    const sofaReturnSeats = [];
    for (const x of [4.0, 5.0, 6.0]) {
      const base = roundedBox('sofa-return-base', [0.94, 0.2, 1.0], [x, 0.22, 7.0], 0.18, 'ice');
      const frame = box('sofa-return-support-frame', [0.88, 0.035, 0.9], [x, 0.325, 7], 'wood');
      const seat = roundedBox(
        'sofa-return-cushion',
        [0.94, 0.21, 0.99],
        [x, 0.44, 6.96],
        0.18,
        'fabric-chalk',
      );
      sofaReturnSeats.push(seat);
      room.contact('return-seat-to-frame', seat, frame);
      room.contact('return-frame-to-base', frame, base);
      for (const dx of [-0.31, 0.31]) {
        for (const dz of [-0.35, 0.35]) {
          const foot = cylinder('sofa-return-foot', 0.065, 0.1, [x + dx, 0.075, 7 + dz], 'metal');
          room.contact('return-foot-to-rug', foot, rug);
          room.contact('return-base-to-foot', base, foot);
        }
      }
      roundedBox('sofa-rear-back', [0.97, 0.52, 0.22], [x, 0.78, 7.39], 0.1, 'fabric-ice');
    }
    for (const z of [4.05, 5.05, 6.05]) {
      tube(
        'sofa-front-piping',
        [
          [5.42, 0.48, z - 0.38],
          [5.42, 0.48, z + 0.38],
        ],
        0.006,
        'piping',
      );
    }
    for (const x of [4.0, 5.0, 6.0]) {
      tube(
        'sofa-return-piping',
        [
          [x - 0.38, 0.48, 6.45],
          [x + 0.38, 0.48, 6.45],
        ],
        0.006,
        'piping',
      );
    }
    roundedBox('coral-pillow', [0.16, 0.44, 0.5], [6.18, 0.8, 4.17], 0.07, 'coral');
    roundedBox('aqua-pillow', [0.47, 0.4, 0.18], [4.12, 0.8, 7.2], 0.08, 'aqua');
    feature('furniture', 'right-modular-sofa', [6.0, 0.65, 5.05], [1.25, 1.05, 3.05]);
    feature('furniture', 'rear-sofa-return', [5.0, 0.65, 7.0], [3.05, 1.05, 1.16]);
    const coffeeTop = roundedBox(
      'pebble-coffee-table',
      [1.65, 0.1, 1.1],
      [4.4, 0.45, 5.55],
      0.53,
      'chalk',
      0.32,
    );
    const coffeeBase = cylinder('coffee-table-plinth', 0.62, 0.4, [4.4, 0.225, 5.55], 'aqua');
    room.contact('coffee-base-to-rug', coffeeBase, rug);
    room.contact('coffee-top-to-base', coffeeTop, coffeeBase);
    // The pedestal stands beside the rug; its top must clear the nearest sofa cushion.
    const sideX = 3.13;
    const sideFoot = cylinder('side-table-foot', 0.38, 0.024, [sideX, 0.012, 7.13], 'metal');
    const sideStem = cylinder('side-table-stem', 0.075, 0.416, [sideX, 0.228, 7.13], 'metal');
    const sideMount = cylinder('side-table-mount', 0.2, 0.026, [sideX, 0.437, 7.13], 'metal');
    const sideTop = cylinder('side-table-top', 0.57, 0.04, [sideX, 0.467, 7.13], 'cobalt');
    room.contact('side-foot-to-floor', sideFoot, floor);
    room.contact('side-stem-to-foot', sideStem, sideFoot);
    room.contact('side-mount-to-stem', sideMount, sideStem);
    room.contact('side-top-to-mount', sideTop, sideMount);
    sideTop.computeWorldMatrix(true);
    room.details.clearances = sofaReturnSeats.map((seat) => {
      seat.computeWorldMatrix(true);
      return {
        name: 'side-table-to-sofa-cushion',
        gap:
          seat.getBoundingInfo().boundingBox.minimumWorld.x -
          sideTop.getBoundingInfo().boundingBox.maximumWorld.x,
      };
    });
    feature('furniture', 'blue-side-table', [sideX, 0.244, 7.13], [0.57, 0.487, 0.57]);
    feature('furniture', 'pebble-coffee-table', [4.4, 0.45, 5.55], [1.95, 0.51, 1.6]);
    // A separate reading corner has two blue club chairs and a compact pedestal table.
    for (const x of [-4.15, -1.8]) {
      const base = roundedBox('blue-chair-base', [1.1, 0.16, 1.13], [x, 0.22, 6.55], 0.36, 'navy');
      for (const dx of [-0.35, 0.35]) {
        for (const dz of [-0.35, 0.35]) {
          const foot = cylinder('blue-chair-foot', 0.075, 0.14, [x + dx, 0.07, 6.55 + dz], 'metal');
          room.contact('reading-chair-foot-to-floor', foot, floor);
          room.contact('reading-chair-base-to-foot', base, foot);
        }
      }
      const seat = roundedBox(
        'blue-chair-seat',
        [1.02, 0.23, 1.02],
        [x, 0.415, 6.5],
        0.3,
        'fabric-cobalt',
      );
      room.contact('reading-chair-seat-to-base', seat, base);
      roundedBox('blue-chair-back', [1.08, 0.65, 0.24], [x, 0.77, 6.99], 0.12, 'fabric-cobalt');
      for (const dx of [-0.46, 0.46]) {
        roundedBox(
          'blue-chair-arm',
          [0.18, 0.35, 1.02],
          [x + dx, 0.66, 6.5],
          0.09,
          'fabric-cobalt',
        );
      }
      feature('furniture', 'blue-reading-chair', [x, 0.58, 6.55], [1.1, 1.13, 1.23]);
    }
    const readingFoot = cylinder('reading-table-foot', 0.42, 0.032, [-2.98, 0.016, 6.05], 'metal');
    const readingStem = cylinder('reading-table-stem', 0.06, 0.53, [-2.98, 0.29, 6.05], 'metal');
    const readingTop = cylinder('reading-table-top', 0.77, 0.045, [-2.98, 0.565, 6.05], 'wood');
    room.contact('reading-foot-to-floor', readingFoot, floor);
    room.contact('reading-stem-to-foot', readingStem, readingFoot);
    room.contact('reading-top-to-stem', readingTop, readingStem);
    feature('furniture', 'reading-pedestal-table', [-2.98, 0.565, 6.05], [0.77, 0.59, 0.77]);
    for (const y of [1.48, 2.15]) {
      box('reading-shelf', [2.55, 0.05, 0.25], [-3.0, y, 7.78], 'wood');
    }
    for (let index = 0; index < 8; index++) {
      const height = 0.27 + (index % 3) * 0.03;
      box(
        'display-book',
        [0.11, height, 0.18],
        [-4.08 + index * 0.17, 1.505 + height / 2, 7.76],
        index % 2 === 0 ? 'ice' : 'coral',
      );
    }
    feature('wall', 'reading-display-shelves', [-3.0, 1.8, 7.78], [2.55, 0.77, 0.25]);
    // A blue door portal, floating console and small sculpture enrich the rear wall.
    room.portal(1.95, 'navy', 'cobalt');
    roundedBox('floating-console', [2.26, 0.16, 0.45], [-0.22, 0.82, 7.67], 0.11, 'wood');
    feature('furniture', 'floating-gallery-console', [-0.22, 0.82, 7.67], [2.26, 0.16, 0.45]);
    cylinder('ceramic-vase', 0.17, 0.38, [-0.89, 1.08, 7.63], 'coral', {
      diameterTop: 0.1,
      diameterBottom: 0.2,
    });
    sphere('console-sculpture', [0.36, 0.55, 0.16], [0.35, 1.16, 7.65], 'aqua', [0, 0, -0.3]);
    for (const z of definition.windows) {
      room.window(z, 'wood');
    }
    room.wallSconce(-6.04, 4.85, 'metal');
    room.wallSconce(6.87, 4.85, 'metal');
    for (const z of [5.0]) {
      const points = [];
      for (let index = 0; index <= 60; index++) {
        const angle = (index * Math.PI * 2) / 60;
        points.push([-5.98, 1.89 + 0.6 * Math.sin(angle), z + 0.6 * Math.cos(angle)]);
      }
      tube('side-wall-circle', points, 0.04, 'metal');
      box('circle-relief-bar', [0.08, 0.12, 0.85], [-5.94, 1.78, z], 'cobalt');
      box('floating-side-shelf', [0.32, 0.045, 1.24], [-5.9, 1.08, z], 'aqua');
    }
    function plant(key, x, z, height) {
      cylinder(key + '-pot', 0.43, 0.45, [x, 0.225, z], 'chalk', {
        diameterTop: 0.43,
        diameterBottom: 0.29,
      });
      cylinder(key + '-soil', 0.39, 0.01, [x, 0.447, z], 'soil');
      cylinder(key + '-trunk', 0.035, height + 0.25, [x, 0.45 + (height + 0.25) / 2, z], 'soil');
      for (let index = 0; index < 60; index++) {
        const angle = index * 2.4;
        const y = 0.85 + ((index % 7) * height) / 8;
        const spread = 0.18 + (index % 4) * 0.045;
        const dx = Math.cos(angle) * spread;
        const dz = Math.sin(angle) * spread;
        tube(
          key + '-stem',
          [
            [x, y - 0.12, z],
            [x + dx * 1.4, y + 0.08, z + dz * 1.4],
          ],
          0.004,
          'leaf',
        );
        sphere(
          key + '-leaf',
          [0.12, 0.24, 0.022],
          [x + dx * 1.4, y + 0.08, z + dz * 1.4],
          index % 2 === 0 ? 'leaf' : 'leafAlt',
          [0.25 * Math.sin(angle), angle, 0.35 * Math.cos(angle)],
        );
      }
      feature('furniture', key, [x, height / 2, z], [0.8, height + 0.4, 0.8]);
    }
    plant('front-botanical-planter', -5.35, -2.83, 1.35);
    plant('rear-botanical-planter', -5.25, 7.17, 1.7);
    room.complete();
  };
}
