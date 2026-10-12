export default function refereeRegistryModule(module, exports, loadModule) {
  const s = Object.create(null);
  s['std-sno'] = loadModule('domain/rules/snooker-referee');
  const n = Object.create(null);
  module.exports = {
    getInstance(t) {
      let e = n[t];
      if (void 0 !== e) return e;
      const i = s[t];
      if (void 0 !== i) return ((e = new i()), (n[t] = e), e);
      throw new Error('Ref not found: "' + t + '"');
    },
  };
}
