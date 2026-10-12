/** Babylon 3.2 does not track createRawCubeTexture results in its rebuild cache.
 * PCOL HDR cubes retain their faces, so rebuild them through the scene's existing
 * texture lifecycle. Keep the texture object and all material references intact.
 */
export default function installHdrCubeRecovery(Babylon) {
  Babylon.PcolHdrCubeTexture.prototype._rebuild = function () {
    const texture = this.getInternalTexture();
    if (texture && !this.getScene().getEngine().getLoadedTexturesCache().includes(texture)) {
      // createRawCubeTexture omits this metadata although PCOL requests trilinear.
      const samplingMode = texture.samplingMode;
      texture.samplingMode ??= Babylon.Texture.TRILINEAR_SAMPLINGMODE;
      try {
        texture._rebuild();
      } finally {
        // Undefined metadata originally clamps anisotropy to 1; retain that
        // behavior after rebuilding with the correct min/mag filter.
        texture.samplingMode = samplingMode;
      }
    }
  };
}
