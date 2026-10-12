/** Keep enclosing walls out of the furniture shadow map, even when they share a material. */
export default function isInteriorShadowCaster(name) {
  return /(?:sofa|bench|chair|stool|table|bar-base|bar-top|bar-fluting|bar-foot|library|plant|botanical|console|vase|sculpture|display-book|display-bottle|picture|art-frame|art-mount|triptych|window-frame|window-mullion|window-sill|door-frame|door-leaf|door-handle|door-hinge|sconce|pendant|halo-body)/.test(
    name,
  );
}
