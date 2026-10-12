export default function resourcePathsModule(module, exports, loadModule) {
  const s = Object.create(null);
  ((s.rgb = './assets/collision/'), (s.shaders = './assets/shaders/'), (module.exports = s));
}
