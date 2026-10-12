/** One mutable definition family per composition, with the original asset/spec identities. */
export default function createCueDefinitions(manifest, createMaterial) {
  return {
    stickAlpha: {
      meshName: 'StickAlpha',
      specs: { len: 1.45, tipRadius: 0.005, buttRadius: 0.015 },
      manifest: {
        model: manifest.model,
        glossy: manifest.glossy,
        color: manifest.color,
      },
      createMaterial,
    },
  };
}
