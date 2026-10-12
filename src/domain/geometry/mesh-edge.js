export default function meshEdgeModule(module, exports, loadModule) {
  const VectorThree = loadModule('domain/math/vector-three');
  function MeshEdge(t, e, i) {
    ((this.va = t),
      (this.vb = e),
      (this.vab = new VectorThree()),
      this.vab.subVectors(e, t),
      (this.abDotAb = this.vab.dot(this.vab)),
      (this.sharedData = i || { count: 0 }),
      this.sharedData.count++);
  }
  ((MeshEdge.prototype.cloneReversed = function () {
    return new MeshEdge(this.vb, this.va, this.sharedData);
  }),
    (module.exports = MeshEdge));
}
