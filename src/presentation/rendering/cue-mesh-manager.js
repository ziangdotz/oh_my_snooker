// Explicit live dependencies preserve initialization and shared state.
export default function createCueMeshManager(dependencies) {
  return class CueMeshManager extends dependencies.EventEmitter.a {
    get pendingCount() {
      return this._pendingList.length;
    }
    constructor() {
      (super(),
        (this._meshInstances = []),
        (this._materials = Object.create(null)),
        (this._pendingList = []),
        (this._scene = null),
        (this._lightProbeManager = null),
        (this._pendingCheckTimerId = -1),
        (this._onPendingCheckTimeout = () => {
          this._pendingCheckTimerId = -1;
          let t = [];
          for (let e = 0, i = this._pendingList.length; e !== i; ++e) t[e] = this._pendingList[e];
          this._pendingList.length = 0;
          for (let e = 0, i = t.length; e !== i; ++e) this.requireStick(t[e]);
          0 === this._pendingList.length && this.emit(dependencies.CueEvents.READY);
        }));
    }
    resetScene(t, e) {
      ((this._scene = t), (this._lightProbeManager = e));
    }
    unload() {
      (this.cancelPendingCheck(),
        (this._scene = null),
        (this._lightProbeManager = null),
        (this._meshInstances.length = 0),
        (this._materials = Object.create(null)));
    }
    cancelPendingCheck() {
      (-1 !== this._pendingCheckTimerId &&
        (window.clearTimeout(this._pendingCheckTimerId), (this._pendingCheckTimerId = -1)),
        (this._pendingList.length = 0));
    }
    _pushPending(t) {
      (-1 === this._pendingList.indexOf(t) && this._pendingList.push(t),
        -1 === this._pendingCheckTimerId &&
          (this._pendingCheckTimerId = window.setTimeout(this._onPendingCheckTimeout, 120)));
    }
    _searchUnusedInstance(t, e) {
      const i = this._meshInstances;
      let s;
      for (let n = 0, r = i.length; n !== r; ++n) if (!(s = i[n]).inUse && s[t] === e) return s;
      return null;
    }
    _searchInstance(t, e) {
      const i = this._meshInstances;
      let s;
      for (let n = 0, r = i.length; n !== r; ++n) if ((s = i[n])[t] === e) return s;
      return null;
    }
    getStickMaterial(t, e = !1) {
      const i = dependencies.cueAssetCache.getStickMaterialName(t);
      let s = this._materials[i];
      return (
        s ||
          e ||
          ((s = dependencies.cueAssetCache.createSourceMaterial(
            t,
            i,
            this._scene,
            this._lightProbeManager,
          )).freeze(),
          (this._materials[i] = s)),
        s
      );
    }
    markAllStickAsUnused() {
      const t = this._meshInstances;
      for (let e = 0, i = t.length; e !== i; ++e) this.markStickMeshAsUnused(t[e]);
    }
    markStickMeshAsUnused(t) {
      ((t.isVisible = !1), (t.inUse = !1));
    }
    requireStick(t) {
      dependencies.cueLoadCancelled ||
        ((dependencies.cueLoadCancelled = !0), dependencies.cueAssetCache.cacheDefaultFile());
      let e = this._searchUnusedInstance('stickName', t);
      if (e) return e;
      let i = dependencies.cueAssetCache.getStickSourceMeshName(t);
      if ((e = this._searchUnusedInstance('sourceMeshName', i))) {
        let i = this.getStickMaterial(t);
        return (
          i !== e.material && (e.material = i),
          (e.stickName = t),
          (e.specs = dependencies.cueAssetCache.getStickSpecs(t)),
          e
        );
      }
      let n = this._searchInstance('sourceMeshName', i);
      if (n)
        return (
          ((e = n.clone(n.name + ++dependencies.nextCueLoadId, null, !0, !1)).sourceMeshName = i),
          this.markStickMeshAsUnused(e),
          this._meshInstances.push(e),
          (e.material = this.getStickMaterial(t)),
          (e.stickName = t),
          (e.specs = dependencies.cueAssetCache.getStickSpecs(t)),
          e
        );
      let r = dependencies.cueAssetCache.getParsedMesh(t);
      if (r) {
        if (r.isError) throw new Error('ParsedMesh error(4.2): ' + r.message);
        return (
          ((e = dependencies.Babylon.Mesh.Parse(r, this._scene, '')).sourceMeshName = i),
          this.markStickMeshAsUnused(e),
          this._meshInstances.push(e),
          (e.material = this.getStickMaterial(t)),
          (e.stickName = t),
          (e.specs = dependencies.cueAssetCache.getStickSpecs(t)),
          e
        );
      }
      return (this._pushPending(t), null);
    }
  };
}
