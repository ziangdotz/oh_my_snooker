export default function metricDefinitionsModule(module, exports) {
  module.exports = [
    { name: 'step', color: '#62C6E3', ceiling: 18, digits: 3, visible: !0 },
    { name: 'nSteps', color: '#62C6E3', ceiling: 10, digits: 0, visible: !0 },
    { name: 'internalStep', color: '#62C6E3', ceiling: 10, digits: 0, visible: !0 },
    { name: 'iteration', color: '#62C6E3', ceiling: 10, digits: 0, visible: !0 },
    { name: 'pending_step', color: '#A64DD9', ceiling: 5, digits: 3, visible: 1 },
    { name: 'island_update', color: '#A64DD9', ceiling: 5, digits: 3, visible: 1 },
    { name: 'nIslands', color: '#A64DD9', ceiling: 22, digits: 0, visible: !0 },
    { name: 'nPendings', color: '#A64DD9', ceiling: 22, digits: 0, visible: !0 },
    { name: 'nAwakened', color: '#A64DD9', ceiling: 22, digits: 0, visible: !0 },
    { name: 'solve', color: '#7FCC5B', ceiling: 5, digits: 3, visible: 1 },
    { name: 'nSolvedCts', color: '#7FCC5B', ceiling: 100, digits: 0, visible: 1 },
    { name: 'dSPB', color: '#D94A6C', ceiling: 5, digits: 3, visible: 1 },
    { name: 'ccdSS', color: '#D94A6C', ceiling: 5, digits: 3, visible: 1 },
    { name: 'nCcdSS', color: '#D94A6C', ceiling: 200, digits: 0, visible: 1 },
    { name: 'ccdSP_Far', color: '#D94A6C', ceiling: 5, digits: 3, visible: 1 },
    { name: 'nCcdSP_Far', color: '#D94A6C', ceiling: 200, digits: 0, visible: 1 },
    { name: 'ccdSP_Near', color: '#D94A6C', ceiling: 5, digits: 3, visible: 1 },
    { name: 'nCcdSP_Near', color: '#D94A6C', ceiling: 200, digits: 0, visible: 1 },
  ];
}
