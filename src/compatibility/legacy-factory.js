/** Preserve the original sloppy-mode UMD receiver when source modules run as ESM.
 * Only registered third-party factories cross this boundary. Production bundles
 * already execute these factories as classic scripts and do not use this adapter.
 */
export default function legacyFactory(factory) {
  // Only the locally imported third-party factory is compiled; no user/network input.
  // eslint-disable-next-line no-new-func -- preserve the original UMD non-strict receiver
  return Function('return (' + factory.toString() + ');')();
}
