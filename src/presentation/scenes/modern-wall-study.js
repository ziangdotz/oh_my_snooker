/** Optional visual study: one gallery wall, isolated from gameplay and collisions. */
export default function modernWallStudyModule(module, _exports, loadModule) {
  const Babylon = loadModule('adapters/rendering/babylon-engine');
  const artworkUrl = loadModule('assets/images-interior-design-001-art');
  const prefix = 'modern-wall-study-';

  function surface(scene, name, color) {
    const material = new Babylon.StandardMaterial(prefix + name, scene);
    material.disableLighting = true;
    material.diffuseColor = Babylon.Color3.FromHexString(color);
    material.emissiveColor = Babylon.Color3.FromHexString(color);
    material.specularColor = Babylon.Color3.Black();
    return material;
  }

  function panel(scene, name, width, height, x, y, z, material) {
    const mesh = Babylon.MeshBuilder.CreatePlane(prefix + name, { width, height }, scene);
    mesh.position.set(x, y, z);
    mesh.rotation.y = Math.PI;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.checkCollisions = false;
    mesh.freezeWorldMatrix();
    return mesh;
  }

  function applyWallStudy(scene) {
    if (scene.getMeshByName(prefix + 'wall')) {
      return;
    }
    const plaster = surface(scene, 'plaster', '#4b5148');
    const pine = surface(scene, 'pine', '#18382f');
    const graphite = surface(scene, 'graphite', '#202724');
    const bronze = surface(scene, 'bronze', '#a18c60');
    const shadow = surface(scene, 'shadow', '#41443b');
    const wallX = 0.4146;

    // The original room wall is z=-4; all surfaces sit just inside it.
    panel(scene, 'wall', 13, 2.56, wallX, 1.4, -3.985, plaster);
    panel(scene, 'wainscot', 13, 0.75, wallX, 0.495, -3.973, pine);
    panel(scene, 'skirting', 13, 0.1, wallX, 0.17, -3.963, graphite);
    panel(scene, 'rail', 13, 0.018, wallX, 0.881, -3.959, bronze);
    panel(scene, 'cornice', 13, 0.055, wallX, 2.64, -3.97, shadow);
    for (let index = 0; index < 15; index++) {
      panel(scene, `joint-${index}`, 0.009, 0.63, -5.66 + index * 0.85, 0.52, -3.96, graphite);
    }

    const artwork = surface(scene, 'artwork', '#ffffff');
    artwork.diffuseTexture = new Babylon.Texture(artworkUrl, scene);
    artwork.emissiveTexture = artwork.diffuseTexture;
    artwork.diffuseColor = Babylon.Color3.Black();
    panel(scene, 'frame-shadow', 2.47, 1.69, -1.55, 1.735, -3.947, shadow);
    panel(scene, 'frame', 2.41, 1.63, -1.55, 1.75, -3.933, bronze);
    panel(scene, 'frame-inner', 2.37, 1.59, -1.55, 1.75, -3.923, graphite);
    panel(scene, 'art', 2.34, 1.56, -1.55, 1.75, -3.913, artwork);

    const wordmark = surface(scene, 'wordmark', '#ffffff');
    const lettering = new Babylon.DynamicTexture(
      prefix + 'lettering',
      { width: 1024, height: 512 },
      scene,
      false,
    );
    const canvas = lettering.getContext();
    canvas.clearRect(0, 0, 1024, 512);
    canvas.fillStyle = '#e9e1cc';
    canvas.font = '112px Georgia';
    canvas.fillText('OH MY', 72, 192);
    canvas.fillText('SNOOKER', 72, 314);
    canvas.fillStyle = '#b6a480';
    canvas.fillRect(76, 376, 116, 3);
    lettering.hasAlpha = true;
    lettering.update();
    wordmark.diffuseTexture = lettering;
    wordmark.emissiveTexture = lettering;
    wordmark.useAlphaFromDiffuseTexture = true;
    wordmark.diffuseColor = Babylon.Color3.Black();
    panel(scene, 'name', 2.58, 1.29, 1.4, 1.72, -3.941, wordmark);
  }

  module.exports = applyWallStudy;
}
