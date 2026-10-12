/** Preserve texture defaults while making failed room loads recoverable. */
export default function createInteriorTexture(B, url, scene) {
  const load = { error: null };
  const texture = new B.Texture(
    url,
    scene,
    false,
    true,
    B.Texture.TRILINEAR_SAMPLINGMODE,
    null,
    (message) => {
      load.error = message || 'Venue texture unavailable: ' + url;
    },
  );
  texture.interiorLoad = load;
  return texture;
}
