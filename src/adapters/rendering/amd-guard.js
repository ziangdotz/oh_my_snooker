export default function amdGuardModule(module, exports) {
  module.exports = function () {
    throw new Error('define cannot be used indirect');
  };
}
