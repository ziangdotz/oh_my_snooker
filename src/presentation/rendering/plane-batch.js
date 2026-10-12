// Explicit live dependencies preserve initialization and shared state.
export default function createPlaneBatch(dependencies) {
  return class PlaneBatch extends dependencies.Babylon.Mesh {
    get needsRearrange() {
      return this.needsUpdate & dependencies.BatchDirtyFlags.UPDATE_CHILD_ADD_REMOVE;
    }
    constructor(t, e, i, n, r) {
      (super(t, e),
        (this._batchChildren = []),
        (this.needsUpdate = 0),
        this.position.copyFromFloats(r.position.x, r.position.y + 0.001, r.position.z));
      let a = new dependencies.UiShaderMaterial('MeshBatchMat', e, 'plane-batch', {
        attributes: ['position', 'uv', 'alpha', 'color'],
        uniforms: ['world', 'viewProjection', 'border', 'textureSampler', 'maskSampler'],
        needAlphaBlending: !0,
      });
      ((n.wrapU = dependencies.Babylon.Texture.CLAMP_ADDRESSMODE),
        (n.wrapV = dependencies.Babylon.Texture.CLAMP_ADDRESSMODE),
        a.setTexture('sourceSampler', i),
        a.setTexture('maskSampler', n),
        a.setVector4(
          'border',
          new dependencies.Babylon.Vector4(r.position.x, r.position.z, r.size.w, r.size.h),
        ),
        a.freeze(),
        (this.material = a),
        this.freezeWorldMatrix(),
        (this.alwaysSelectAsActiveMesh = !0));
    }
    dispose(t, e) {
      let i = this._batchChildren;
      for (let t = 0, e = i.length; t !== e; ++t) i[t]._weakParent = null;
      ((i.length = 0), super.dispose(t, e));
    }
    addChildb(t, e = !1) {
      (e ? this._batchChildren.unshift(t) : this._batchChildren.push(t),
        (t._weakParent = this),
        (this.needsUpdate |= dependencies.BatchDirtyFlags.UPDATE_CHILD_ADD_REMOVE));
    }
    removeChildb(t) {
      let e = this._batchChildren.indexOf(t);
      -1 !== e &&
        (this._batchChildren.splice(e, 1),
        (t._weakParent = null),
        (this.needsUpdate |= dependencies.BatchDirtyFlags.UPDATE_CHILD_ADD_REMOVE));
    }
    empty() {
      let _t,
        e = this._batchChildren;
      for (let i = 0, s = e.length; i !== s; ++i) (_t = e[i])._weakParent = null;
      ((e.length = 0), (this.needsUpdate |= dependencies.BatchDirtyFlags.UPDATE_CHILD_ADD_REMOVE));
    }
    arrange() {
      const t = this._batchChildren;
      let e,
        i,
        n,
        r,
        a,
        o,
        l,
        h = 0,
        c = 0,
        d = 0,
        u = 0;
      for (
        this.needsUpdate = 0, t.sort(dependencies.sortByZIndex), o = 0, l = t.length;
        o !== l;
        ++o
      )
        ((h += t[o].nVertices), (c += t[o].i16.length));
      for (
        e = new Float32Array(3 * h),
          r = new Float32Array(3 * h),
          i = new Float32Array(2 * h),
          n = new Float32Array(h),
          a = new Uint16Array(c),
          o = 0,
          l = t.length;
        o !== l;
        ++o
      )
        ((t[o]._vOffset = d),
          (d += t[o].nVertices),
          (u = t[o].setUI(i, a, u)),
          t[o].updateAlpha(n),
          t[o].updateRGB(r),
          t[o].updateTransform(e));
      (this.setVerticesData(dependencies.Babylon.VertexBuffer.PositionKind, e, !0, 3),
        this.setVerticesData(dependencies.Babylon.VertexBuffer.ColorKind, r, !0, 3),
        this.setVerticesData('alpha', n, !0, 1),
        this.setVerticesData(dependencies.Babylon.VertexBuffer.UVKind, i, !1, 2),
        this.setIndices(a),
        (e = null),
        (i = null),
        (n = null),
        (r = null),
        (a = null));
    }
    updateChildren() {
      if (this.needsUpdate & dependencies.BatchDirtyFlags.UPDATE_CHILD_ADD_REMOVE)
        return this.arrange();
      const t = this._batchChildren,
        e = dependencies.Babylon.VertexBuffer.PositionKind,
        i = dependencies.Babylon.VertexBuffer.ColorKind;
      let n,
        r = !1,
        a = !1,
        o = !1,
        l = this.getVerticesData(e, !1),
        h = this.getVerticesData(i, !1),
        c = this.getVerticesData('alpha', !1);
      this.needsUpdate = 0;
      for (let e = 0, i = t.length; e !== i; ++e) {
        let i = (n = t[e]).needsUpdate;
        if (i) {
          if (
            (i & dependencies.PlaneDirtyFlags.DF_ALPHA && (n.updateAlpha(c), (a = !0)),
            n.alpha <= 0)
          )
            continue;
          (i & dependencies.PlaneDirtyFlags.DF_TRANSFORM && (n.updateTransform(l), (r = !0)),
            i & dependencies.PlaneDirtyFlags.DF_RGB && (n.updateRGB(h), (o = !0)));
        }
      }
      (r && this.updateVerticesData(e, l),
        o && this.updateVerticesData(i, h),
        a && this.updateVerticesData('alpha', c));
    }
    static createPlane(t, e, i, s, n, r, a, o = 0, l = 0, h = 0) {
      const c = i / 2,
        d = s / 2,
        u = dependencies.tableUiAtlas.getUVs(t),
        _ = new Float32Array([
          -c + o,
          l,
          -d + h,
          u[0],
          u[1],
          1,
          c + o,
          l,
          -d + h,
          u[2],
          u[3],
          1,
          c + o,
          l,
          d + h,
          u[4],
          u[5],
          1,
          -c + o,
          l,
          d + h,
          u[6],
          u[7],
          1,
        ]),
        p = new Uint16Array([0, 1, 2, 0, 2, 3]);
      return e
        ? new dependencies.OrientedUiPlane(_, p, n, r, a)
        : new dependencies.UiPlane(_, p, n, r, a);
    }
  };
}
