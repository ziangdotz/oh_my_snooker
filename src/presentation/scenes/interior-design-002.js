/** 室内设计002 — amber Art Deco salon, arches, lounge seating and a dedicated bar. */
import createInteriorTexture from './create-interior-texture.js';

export default function interiorDesign002Module(module, _exports, loadModule) {
  const createRoom = loadModule('presentation/scenes/interior-design-builder');
  const artworkUrl = loadModule('assets/images-interior-design-002-art');
  const timberUrl = loadModule('assets/textures-room-interior-design-001-oak');
  const leatherUrl = loadModule('assets/textures-room-interior-design-002-leather');
  const limestoneUrl = loadModule('assets/textures-room-warm-limestone');
  const linenUrl = loadModule('assets/textures-room-interior-design-003-linen');
  const definition = {
    id: 'interior-design-002',
    name: '室内设计002',
    theme: '琥珀复古会所',
    palette: {
      wall: '#ded8cc',
      ceiling: '#e5dfd4',
      floor: '#a59379',
      tile: '#ded8c9',
      tileAlt: '#c8bdab',
      merlot: '#703c38',
      leather: '#743a33',
      cognac: '#dfb891',
      wood: '#675d50',
      bronze: '#ba985d',
      trim: '#46372e',
      stone: '#4b4540',
      rug: '#b3a087',
      ivory: '#ecdfc2',
      book: '#846754',
      clay: '#b77d55',
    },
    lightColor: '#ffe0aa',
    doorX: 1.83,
    windows: [-1.5, 2.55],
    ceilingGlow: 0.012,
    ambientIntensity: 0.36,
    floorIntensity: 0.43,
    galleryIntensity: 1.14,
    loungeIntensity: 0.98,
    picturePosition: [-0.4, 2.78, -3.3],
  };
  module.exports = function apply(scene) {
    if (scene.getMeshByName(definition.id + '-floor')) {
      return;
    }
    const room = createRoom(scene, definition);
    const { B, box, roundedBox, cylinder, sphere, tube, arch, plane, material, feature } = room;
    room.texture(room.materials.wood, timberUrl, 0.65);
    room.texture(room.materials.leather, leatherUrl, 2.5);
    room.texture(room.materials.cognac, leatherUrl, 2.5);
    room.texture(room.materials.rug, linenUrl, 4);
    room.texture(room.materials.tile, limestoneUrl, 1);
    room.texture(room.materials.tileAlt, limestoneUrl, 1);
    room.texture(room.materials.stone, limestoneUrl, 0.7);
    material('stitch', '#c59c72');
    material('foliage', '#50603d');
    room.shell();
    // A warm stone checkerboard replaces design001's long straight wooden floorboards.
    for (let row = 0; row < 12; row++) {
      for (let column = 0; column < 13; column++) {
        box(
          'stone-tile',
          [0.993, 0.016, 0.993],
          [-5.5854 + column, 0.002, -3.5 + row],
          (row + column) % 2 === 0 ? 'tile' : 'tileAlt',
        );
      }
    }
    feature('finish', 'warm-stone-checkerboard', [0.4146, 0, 2], [13, 0.02, 12]);
    for (const z of [-3.96, 7.96]) {
      box('timber-wainscot', [13, 0.9, 0.06], [0.4146, 0.45, z], 'wood');
      box('brass-dado', [13, 0.022, 0.075], [0.4146, 0.91, z], 'bronze');
      box('skirting', [13, 0.1, 0.08], [0.4146, 0.05, z], 'trim');
      for (let index = 0; index < 13; index++) {
        box(
          'raised-end-panel',
          [0.87, 0.62, 0.02],
          [-5.58 + index, 0.46, z > 0 ? z - 0.04 : z + 0.04],
          'trim',
        );
        box(
          'panel-inset',
          [0.83, 0.58, 0.025],
          [-5.58 + index, 0.46, z > 0 ? z - 0.06 : z + 0.06],
          'wood',
        );
      }
    }
    for (const x of [-6.0454, 6.8746]) {
      box('side-wainscot', [0.06, 0.9, 12], [x, 0.45, 2], 'wood');
      box('side-dado', [0.075, 0.022, 12], [x, 0.91, 2], 'bronze');
      box('side-skirting', [0.08, 0.1, 12], [x, 0.05, 2], 'trim');
    }
    for (const x of [-4.5, -0.4, 3.7]) {
      arch('gallery-arch', x, -3.915, 2.65, 0.98, 1.86, 'merlot', 'bronze');
      feature('wall', 'brass-lined-arch', [x, 1.9, -3.91], [2.65, 2.21, 0.08]);
    }
    const artwork = material('artwork', '#ffffff', 0.025);
    artwork.diffuseTexture = createInteriorTexture(B, artworkUrl, scene);
    box('picture-wall-spacer', [1.96, 1.22, 0.024], [-0.4, 1.92, -3.895], 'trim');
    box('picture-frame', [2.17, 1.47, 0.065], [-0.4, 1.92, -3.865], 'bronze');
    box('picture-matboard', [2.11, 1.41, 0.02], [-0.4, 1.92, -3.826], 'ivory');
    plane('art', 2.01, 1.31, [-0.4, 1.92, -3.81], artwork);
    room.pictureLight(-0.4, 2.8, -3.9, 1.55);
    // Small fan reliefs echo the print, rather than repeating a second branded sign.
    for (const x of [-4.5, 3.7]) {
      sphere('fan-medallion', [0.42, 0.42, 0.06], [x, 1.75, -3.85], 'bronze');
      for (let index = 0; index < 11; index++) {
        const angle = (index / 10) * Math.PI;
        tube(
          'fan-ray',
          [
            [x, 1.75, -3.84],
            [x + 0.76 * Math.cos(angle), 1.75 + 0.76 * Math.sin(angle), -3.84],
          ],
          0.007,
          'bronze',
        );
      }
    }
    // Coffered ceiling and three opal-and-brass pendants are visually distinct from the linear canopy.
    box('ceiling-tray', [6.2, 0.07, 4.1], [0, 3.43, 0], 'merlot');
    for (const z of [-2.08, 2.08]) {
      box('coffer-long', [6.35, 0.12, 0.09], [0, 3.35, z], 'wood');
      box('coffer-light', [6.15, 0.012, 0.04], [0, 3.4, z * 0.96], 'light');
    }
    for (const x of [-3.17, 3.17]) {
      box('coffer-short', [0.09, 0.12, 4.2], [x, 3.35, 0], 'wood');
    }
    for (const x of [-1.25, 0, 1.25]) {
      cylinder('pendant-stem', 0.013, 0.38, [x, 3.18, 0], 'bronze');
      cylinder('pendant-ceiling-rose', 0.11, 0.05, [x, 3.38, 0], 'bronze');
      cylinder('brass-shade', 0.7, 0.27, [x, 2.89, 0], 'bronze', {
        diameterTop: 0.24,
        diameterBottom: 0.7,
      });
      sphere('opal-diffuser', [0.49, 0.19, 0.49], [x, 2.77, 0], 'light');
    }
    feature('ceiling', 'three-opal-pendants', [0, 2.89, 0], [3.3, 0.4, 0.7]);

    // The main sofa runs along the left wall; two chairs form a separate conversation group at the rear.
    const sofaBase = roundedBox(
      'left-sofa-plinth',
      [1.18, 0.15, 3.5],
      [-5.27, 0.15, 2.55],
      0.16,
      'trim',
    );
    const sofaFrame = box(
      'left-sofa-support-frame',
      [1.09, 0.085, 3.35],
      [-5.27, 0.263, 2.55],
      'wood',
    );
    room.contact('sofa-frame-to-base', sofaFrame, sofaBase);
    for (const x of [-5.67, -4.87]) {
      for (const z of [1.05, 2.55, 4.05]) {
        const foot = cylinder('left-sofa-foot', 0.085, 0.08, [x, 0.05, z], 'bronze');
        room.contact('sofa-plinth-to-foot', sofaBase, foot);
      }
    }
    for (const z of [1.43, 2.55, 3.67]) {
      const seat = roundedBox(
        'left-sofa-seat',
        [1.15, 0.22, 1.1],
        [-5.23, 0.4, z],
        0.07,
        'leather',
      );
      room.contact('sofa-seat-to-frame', seat, sofaFrame);
      tube(
        'sofa-seat-seam',
        [
          [-4.665, 0.44, z - 0.45],
          [-4.665, 0.44, z + 0.45],
        ],
        0.005,
        'stitch',
      );
    }
    roundedBox('left-sofa-back', [0.24, 0.59, 3.47], [-5.7, 0.73, 2.55], 0.1, 'leather');
    for (const z of [0.9, 4.2]) {
      roundedBox('sofa-rolled-arm', [1.15, 0.34, 0.24], [-5.23, 0.62, z], 0.11, 'leather');
    }
    for (let index = 0; index < 8; index++) {
      sphere('sofa-button', [0.035, 0.035, 0.035], [-5.56, 0.79, 1.1 + index * 0.41], 'bronze');
    }
    feature('furniture', 'wall-sofa', [-5.27, 0.65, 2.55], [1.3, 1.05, 3.65]);
    const rug = roundedBox(
      'conversation-rug',
      [4.7, 0.013, 2.65],
      [-1.35, 0.018, 6.15],
      0.2,
      'rug',
    );
    function chair(key, x, z, yaw) {
      const local = (dx, y, dz) => [
        x + Math.cos(yaw) * dx + Math.sin(yaw) * dz,
        y,
        z - Math.sin(yaw) * dx + Math.cos(yaw) * dz,
      ];
      const seat = roundedBox(
        key + '-seat',
        [1.02, 0.21, 1.0],
        local(0, 0.44, 0),
        0.18,
        'cognac',
        yaw,
      );
      const frame = roundedBox(
        key + '-support-frame',
        [0.96, 0.07, 0.9],
        local(0, 0.327, 0),
        0.12,
        'wood',
        yaw,
      );
      room.contact(key + '-seat-to-frame', seat, frame);
      roundedBox(key + '-back', [1.02, 0.68, 0.22], local(0, 0.81, 0.43), 0.1, 'cognac', yaw);
      for (const dx of [-0.44, 0.44]) {
        roundedBox(key + '-arm', [0.18, 0.3, 0.95], local(dx, 0.64, 0), 0.085, 'cognac', yaw);
        for (const dz of [-0.34, 0.34]) {
          const leg = cylinder(key + '-leg', 0.055, 0.32, local(dx, 0.1845, dz), 'bronze', {
            diameterTop: 0.045,
            diameterBottom: 0.055,
          });
          const plate = cylinder(key + '-leg-mount', 0.11, 0.025, local(dx, 0.339, dz), 'bronze');
          room.contact(key + '-leg-to-rug', leg, rug);
          room.contact(key + '-mount-to-leg', plate, leg);
          room.contact(key + '-frame-to-mount', frame, plate);
        }
      }
      tube(
        key + '-seat-piping',
        [local(-0.4, 0.49, -0.48), local(0.4, 0.49, -0.48)],
        0.005,
        'stitch',
      );
      tube(key + '-back-seam', [local(0, 0.57, 0.31), local(0, 1.08, 0.31)], 0.004, 'stitch');
      feature('furniture', key, [x, 0.6, z], [1.35, 1.15, 1.35]);
    }
    chair('rear-wing-chair-left', -2.35, 6.58, -0.24);
    chair('rear-wing-chair-right', -0.25, 6.58, 0.24);
    const coffeeTop = roundedBox(
      'oval-coffee-table',
      [1.85, 0.09, 0.92],
      [-1.3, 0.46, 5.82],
      0.43,
      'stone',
    );
    for (const x of [-1.85, -0.75]) {
      const leg = cylinder('coffee-table-leg', 0.1, 0.398, [x, 0.2235, 5.82], 'bronze');
      const plate = cylinder('coffee-table-mount', 0.22, 0.025, [x, 0.422, 5.82], 'bronze');
      room.contact('coffee-leg-to-rug', leg, rug);
      room.contact('coffee-mount-to-leg', plate, leg);
      room.contact('coffee-top-to-mount', coffeeTop, plate);
    }
    feature('furniture', 'oval-stone-coffee-table', [-1.3, 0.46, 5.82], [1.85, 0.52, 0.92]);
    // A working-scale decorative bar and three stools occupy the opposite rear corner.
    box('bar-base', [3.25, 0.94, 0.65], [4.72, 0.48, 6.45], 'merlot');
    roundedBox('bar-top', [3.48, 0.1, 0.8], [4.72, 1.0, 6.42], 0.09, 'stone');
    box('bar-foot-rail', [3.1, 0.035, 0.035], [4.72, 0.24, 6.04], 'bronze');
    for (const x of [3.35, 4.72, 6.09]) {
      tube(
        'bar-foot-rail-bracket',
        [
          [x, 0.24, 6.12],
          [x, 0.24, 6.04],
        ],
        0.012,
        'bronze',
      );
    }
    for (let index = 0; index < 18; index++) {
      box('bar-fluting', [0.065, 0.81, 0.045], [3.2 + index * 0.18, 0.47, 6.09], 'wood');
    }
    feature('furniture', 'rear-right-bar-counter', [4.72, 0.54, 6.45], [3.48, 1.08, 0.8]);
    for (const x of [3.65, 4.72, 5.79]) {
      const base = cylinder('bar-stool-base', 0.36, 0.045, [x, 0.0325, 5.95], 'trim');
      const post = cylinder('bar-stool-post', 0.055, 0.68, [x, 0.386, 5.95], 'bronze');
      const mount = cylinder('bar-stool-seat-mount', 0.22, 0.03, [x, 0.711, 5.95], 'bronze');
      const seat = cylinder('bar-stool-seat', 0.46, 0.12, [x, 0.76, 5.95], 'leather');
      room.contact('stool-post-to-base', post, base);
      room.contact('stool-mount-to-post', mount, post);
      room.contact('stool-seat-to-mount', seat, mount);
      const ring = [];
      for (let index = 0; index <= 48; index++) {
        const angle = (index * Math.PI) / 24;
        ring.push([x + Math.cos(angle) * 0.19, 0.29, 5.95 + Math.sin(angle) * 0.19]);
      }
      tube('bar-stool-foot-ring', ring, 0.012, 'bronze');
      for (const offset of [-0.18, 0.18]) {
        tube(
          'bar-stool-foot-brace',
          [
            [x, 0.29, 5.95],
            [x + offset, 0.29, 5.95],
          ],
          0.009,
          'bronze',
        );
      }
      feature('furniture', 'bar-stool', [x, 0.43, 5.95], [0.46, 0.83, 0.46]);
    }
    arch('bar-arched-backing', 4.72, 7.955, 3.45, 0.93, 1.63, 'merlot', 'bronze');
    for (const y of [1.16, 1.64, 2.12]) {
      box('bar-display-shelf', [3.0, 0.055, 0.35], [4.72, y, 7.72], 'wood');
      box('shelf-light', [2.82, 0.012, 0.028], [4.72, y - 0.031, 7.59], 'light');
    }
    for (let index = 0; index < 10; index++) {
      const x = 3.46 + index * 0.27;
      cylinder(
        'display-bottle-body',
        0.085,
        0.24,
        [x, index % 2 === 0 ? 1.32 : 1.8, 7.69],
        index % 3 === 0 ? 'cognac' : 'trim',
      );
      cylinder(
        'display-bottle-neck',
        0.033,
        0.075,
        [x, index % 2 === 0 ? 1.47 : 1.95, 7.69],
        'bronze',
      );
    }
    feature('wall', 'arched-bar-display', [4.72, 1.92, 7.9], [3.45, 2.65, 0.4]);
    for (const [x, y, z] of [
      [-4.9, 1.77, 7.6],
      [5.8, 2.16, 7.59],
    ]) {
      cylinder('shelf-plant-pot', 0.16, 0.13, [x, y + 0.08, z], 'bronze');
      for (let index = 0; index < 24; index++) {
        const angle = index * 2.4;
        const drop = (index / 24) * 0.36;
        const dx = Math.cos(angle) * 0.12;
        const dz = Math.sin(angle) * 0.07;
        sphere(
          'trailing-leaf',
          [0.085, 0.11, 0.03],
          [x + dx, y + 0.22 - drop, z - 0.07 + dz],
          'foliage',
          [0.2, angle, 0.35],
        );
      }
    }
    // A library cabinet adds a different wall treatment and denser small-scale decoration.
    box('library-backing', [2.35, 2.36, 0.12], [-4.1, 1.25, 7.93], 'merlot');
    for (const x of [-5.3, -2.9]) {
      box('library-upright', [0.08, 2.46, 0.42], [x, 1.25, 7.72], 'wood');
    }
    for (const y of [0.08, 0.62, 1.17, 1.72, 2.46]) {
      box('library-shelf', [2.48, 0.06, 0.42], [-4.1, y, 7.72], 'wood');
    }
    for (let index = 0; index < 20; index++) {
      const x = -5.12 + (index % 10) * 0.21;
      const height = 0.33 + (index % 3) * 0.03;
      const y = (index < 10 ? 0.65 : 1.2) + height / 2;
      box(
        'library-volume',
        [0.13, height, 0.22],
        [x, y, 7.58],
        index % 3 === 0 ? 'clay' : index % 3 === 1 ? 'ivory' : 'book',
      );
    }
    feature('furniture', 'library-cabinet', [-4.1, 1.25, 7.72], [2.48, 2.5, 0.48]);
    for (const z of definition.windows) {
      room.window(z, 'wood');
    }
    room.wallSconce(-6.04, 4.85, 'bronze');
    room.wallSconce(6.87, 4.85, 'bronze');
    room.portal(1.83, 'wood', 'wood', true);
    room.complete();
  };
}
