/** Named room versions. Adding another design leaves existing versions addressable. */
export default function interiorDesignRegistryModule(module, _exports, loadModule) {
  const designs = {
    'interior-design-original': {
      id: 'interior-design-original',
      name: '室内设计·原始',
      code: 'ORIGINAL',
      displayName: 'Original Club',
      menuLabel: 'Original Club',
      description: 'Classic PCOL, baked lighting',
      preview: loadModule('assets/images-interior-design-original-preview'),
      apply: loadModule('presentation/scenes/interior-design-original'),
    },
    'interior-design-001': {
      id: 'interior-design-001',
      name: '室内设计001',
      code: '001',
      displayName: 'Modern Club',
      menuLabel: '001 · Modern Club',
      description: 'Warm oak, olive & woven linen',
      preview: loadModule('assets/images-interior-design-001-preview'),
      apply: loadModule('presentation/scenes/interior-design-001'),
    },
    'interior-design-002': {
      id: 'interior-design-002',
      name: '室内设计002',
      code: '002',
      displayName: 'Amber Lounge',
      menuLabel: '002 · Amber Lounge',
      description: 'Cream stone, cognac & walnut',
      preview: loadModule('assets/images-interior-design-002-preview'),
      apply: loadModule('presentation/scenes/interior-design-002'),
    },
    'interior-design-003': {
      id: 'interior-design-003',
      name: '室内设计003',
      code: '003',
      displayName: 'Cobalt Gallery',
      menuLabel: '003 · Cobalt Gallery',
      description: 'Sand terrazzo, linen & cobalt',
      preview: loadModule('assets/images-interior-design-003-preview'),
      apply: loadModule('presentation/scenes/interior-design-003'),
    },
  };
  module.exports = {
    list() {
      return Object.values(designs).map(({ apply: _apply, ...info }) => ({ ...info }));
    },
    get(id) {
      return Object.hasOwn(designs, id) ? designs[id] : null;
    },
  };
}
