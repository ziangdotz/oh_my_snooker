/** Dimensioned openings, glazing, installation hardware and measured furniture joints. */
export default function createInteriorArchitecture(room) {
  const { B, scene, prefix, box, cylinder, tube, materials, material, feature, finish } = room;
  const details = { windows: [], door: null, contacts: [] };
  if (!materials.bronze) {
    material('bronze', '#bba479', 0.018);
    materials.bronze.specularColor = new B.Color3(0.28, 0.22, 0.13);
  }
  if (!materials.ivory) {
    material('ivory', '#efdfbf', 0.025);
  }
  material('reveal', '#9e9079', 0.018);
  material('gasket', '#302e27', 0.008);
  material('courtyard-leaf', '#6e7555', 0.06);
  material('courtyard-stem', '#6a5a41', 0.025);
  material('glass', '#e2d5b8', 0.08);
  materials.glass.alpha = 0.22;
  materials.glass.specularColor = new B.Color3(0.38, 0.32, 0.23);
  materials.glass.specularPower = 120;
  materials.glass.backFaceCulling = false;
  const view = material('window-view', '#ffffff', 0.52);
  view.disableLighting = true;
  view.emissiveColor = B.Color3.White();
  const texture = new B.DynamicTexture(
    prefix + 'window-courtyard',
    { width: 512, height: 512 },
    scene,
    false,
  );
  const context = texture.getContext();
  const gradient = context.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#acb6ae');
  gradient.addColorStop(0.55, '#e4cc9e');
  gradient.addColorStop(1, '#92846e');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);
  context.fillStyle = '#827c68';
  context.fillRect(0, 345, 512, 167);
  context.fillStyle = '#a39980';
  for (let index = 0; index < 8; index++) {
    context.fillRect(index * 72, 361, 58, 8);
    context.fillRect(index * 72 + 20, 410, 58, 8);
  }
  texture.update();
  view.diffuseTexture = texture;
  view.emissiveTexture = texture;

  function contact(name, upper, lower) {
    for (const mesh of [upper, lower]) {
      mesh.computeWorldMatrix(true);
    }
    const bounds = (mesh) => {
      const value = mesh.getBoundingInfo().boundingBox;
      return { min: value.minimumWorld.asArray(), max: value.maximumWorld.asArray() };
    };
    details.contacts.push({ name, upper: bounds(upper), lower: bounds(lower) });
  }
  function window(z, frame) {
    const x = -6.0854;
    const width = 2.05;
    const height = 1.58;
    const center = 1.99;
    if (details.windows.length === 0) {
      const background = B.MeshBuilder.CreatePlane(
        prefix + 'window-courtyard-view',
        { width: 14, height: 4 },
        scene,
      );
      background.position.set(x - 1.0, 2, 2);
      background.rotation.y = -Math.PI / 2;
      view.backFaceCulling = false;
      finish(background, 'window-view');
    }
    // Actual layered foliage creates depth and parallax beyond the glazing.
    for (const offset of [-0.72, 0.63]) {
      cylinder('courtyard-plant-stem', 0.025, 0.8, [x - 0.64, 1.26, z + offset], 'courtyard-stem');
      for (let index = 0; index < 12; index++) {
        const angle = index * 2.4;
        const leaf = B.MeshBuilder.CreateSphere(
          prefix + 'courtyard-plant-leaf',
          { diameter: 1, segments: 8 },
          scene,
        );
        leaf.scaling.set(0.1, 0.22, 0.045);
        leaf.position.set(
          x - 0.64 + Math.sin(angle) * 0.17,
          1.22 + (index % 4) * 0.17,
          z + offset + Math.cos(angle) * 0.23,
        );
        leaf.rotation.set(0.3, angle, 0.35);
        finish(leaf, 'courtyard-leaf');
        tube(
          'courtyard-plant-branch',
          [[x - 0.64, leaf.position.y - 0.06, z + offset], leaf.position.asArray()],
          0.004,
          'courtyard-stem',
        );
      }
    }
    for (const y of [center - height / 2, center + height / 2]) {
      box('window-reveal-horizontal', [0.38, 0.055, width + 0.12], [x - 0.15, y, z], 'reveal');
      box('window-frame-horizontal', [0.105, 0.06, width], [x - 0.11, y, z], frame);
    }
    for (const offset of [-width / 2, width / 2]) {
      box(
        'window-reveal-vertical',
        [0.38, height, 0.055],
        [x - 0.15, center, z + offset],
        'reveal',
      );
      box('window-frame-vertical', [0.105, height, 0.06], [x - 0.11, center, z + offset], frame);
      box(
        'window-architrave',
        [0.045, height + 0.15, 0.07],
        [x + 0.026, center, z + offset + Math.sign(offset) * 0.038],
        frame,
      );
    }
    box(
      'window-sill',
      [0.52, 0.055, width + 0.2],
      [x - 0.045, center - height / 2 - 0.027, z],
      'reveal',
    );
    for (let pane = 0; pane < 3; pane++) {
      const paneZ = z - width / 3 + (pane * width) / 3;
      box(
        'window-glass',
        [0.008, height - 0.12, width / 3 - 0.06],
        [x - 0.128, center, paneZ],
        'glass',
      );
      for (const offset of [-width / 6 + 0.024, width / 6 - 0.024]) {
        box(
          'window-gasket',
          [0.014, height - 0.12, 0.012],
          [x - 0.063, center, paneZ + offset],
          'gasket',
        );
      }
    }
    for (const offset of [-width / 6, width / 6]) {
      box('window-mullion', [0.11, height - 0.07, 0.045], [x - 0.105, center, z + offset], frame);
    }
    box(
      'window-handle-rosette',
      [0.022, 0.045, 0.045],
      [x - 0.035, 1.9, z + width / 6 - 0.07],
      'bronze',
    );
    box('window-handle', [0.032, 0.14, 0.021], [x - 0.006, 1.85, z + width / 6 - 0.07], 'bronze');
    details.windows.push({
      position: [x, center, z],
      size: [0.38, height, width],
      panes: 3,
      sillHeight: center - height / 2,
    });
    feature('window', 'recessed-courtyard-window', [x, center, z], [0.38, height, width]);
  }
  function portal(x, leafMaterial, frameMaterial, arched = false) {
    const width = 1.3;
    const height = 2.38;
    // A single leaf has a latch-side lever and three hinge barrels on the opposite side.
    for (const offset of [-width / 2 - 0.036, width / 2 + 0.036]) {
      box(
        'door-frame-jamb',
        [0.072, height + 0.065, 0.24],
        [x + offset, (height + 0.065) / 2, 7.97],
        frameMaterial,
      );
      box(
        'door-stop',
        [0.02, height, 0.03],
        [x + offset - Math.sign(offset) * 0.04, height / 2, 7.855],
        'gasket',
      );
    }
    box('door-frame-head', [width + 0.21, 0.075, 0.24], [x, height + 0.035, 7.97], frameMaterial);
    const leaf = box(
      'door-leaf',
      [width - 0.045, height - 0.035, 0.052],
      [x, height / 2 + 0.006, 7.9],
      leafMaterial,
    );
    box('door-threshold', [width, 0.018, 0.25], [x, 0.011, 7.97], 'bronze');
    for (const y of [0.27, 1.16, 2.08]) {
      cylinder('door-hinge', 0.022, 0.095, [x - width / 2 + 0.023, y, 7.856], 'bronze');
    }
    const handleX = x + width / 2 - 0.17;
    cylinder('door-lock-barrel', 0.025, 0.055, [handleX, 0.94, 7.856], 'bronze');
    box('door-handle-rosette', [0.055, 0.15, 0.014], [handleX, 1.035, 7.867], 'bronze');
    tube(
      'door-handle-lever',
      [
        [handleX, 1.075, 7.865],
        [handleX, 1.075, 7.815],
        [handleX - 0.13, 1.075, 7.815],
      ],
      0.012,
      'bronze',
    );
    box('door-strike', [0.018, 0.13, 0.025], [x + width / 2 + 0.008, 1.05, 7.864], 'bronze');
    if (arched) {
      room.arch('door-transom-recess', x, 7.965, 1.43, 2.43, 2.43, 'reveal', frameMaterial);
      room.arch('door-transom-glass', x, 7.94, 1.28, 2.45, 2.45, 'glass', 'bronze');
    }
    details.door = {
      position: [x, height / 2, 7.9],
      width,
      height,
      hinges: 3,
      latchSide: 'right',
      approachWidth: 1.3,
    };
    feature('wall', 'entry-door', [x, height / 2, 7.9], [1.51, height + 0.075, 0.24]);
    return leaf;
  }
  function pictureLight(x, y, z, width) {
    for (const offset of [-width * 0.36, width * 0.36]) {
      box(
        'picture-lamp-backplate',
        [0.07, 0.11, 0.02],
        [x + offset, y - 0.05, z - 0.035],
        'bronze',
      );
      tube(
        'picture-lamp-arm',
        [
          [x + offset, y - 0.05, z - 0.025],
          [x + offset, y, z + 0.09],
        ],
        0.009,
        'bronze',
      );
    }
    box('picture-lamp-shade', [width, 0.045, 0.11], [x, y, z + 0.1], 'bronze');
    box('picture-lamp-diffuser', [width - 0.06, 0.009, 0.07], [x, y - 0.025, z + 0.1], 'light');
  }
  function wallSconce(x, z, metal) {
    const direction = x < 0 ? 1 : -1;
    box('sconce-backplate', [0.045, 0.27, 0.11], [x, 2.17, z], metal);
    box('sconce-arm', [0.17, 0.025, 0.025], [x + direction * 0.1, 2.05, z], metal);
    cylinder('sconce-shade', 0.18, 0.3, [x + direction * 0.18, 2.18, z], 'ivory');
    cylinder('sconce-warm-diffuser', 0.15, 0.012, [x + direction * 0.18, 2.023, z], 'light');
    cylinder('sconce-cap', 0.19, 0.025, [x + direction * 0.18, 2.345, z], metal);
  }
  return { details, contact, window, portal, pictureLight, wallSconce };
}
