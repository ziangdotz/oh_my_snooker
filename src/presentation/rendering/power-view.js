// Explicit live dependencies preserve initialization and shared state.
export default function createPowerView(dependencies) {
  return class PowerView extends dependencies.Babylon.Mesh {
    constructor(t, e, i) {
      super(t, e);
      let n = [
          -0.19, 0.01, -0.01475, -0.19, 0.01, -0.01525, -0.1895, 0.01, -0.01475, -0.1895, 0.01,
          -0.01525, -0.0405, 0.01, -0.01475, -0.0405, 0.01, -0.01525, -0.04, 0.01, -0.01475, -0.04,
          0.01, -0.01525,
        ],
        r = dependencies.tableUiAtlas.getUVs('powerTrack'),
        a = (r[7] - r[1]) / 3,
        o = [
          r[0],
          r[1],
          r[2],
          r[3],
          r[0],
          r[1] + a,
          r[2],
          r[3] + a,
          r[0],
          r[1] + 2 * a,
          r[2],
          r[3] + 2 * a,
          r[6],
          r[7],
          r[4],
          r[5],
        ];
      this.offsetX = -0.04;
      let l = dependencies.Babylon.VertexBuffer;
      (this.setVerticesData(l.PositionKind, n, !0, 3),
        this.setVerticesData(l.UVKind, o, !1, 2),
        this.setVerticesData(
          l.NormalKind,
          [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0],
          !1,
        ),
        this.setIndices([0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 4, 5, 7, 4, 7, 6]));
      let h = new dependencies.UiShaderMaterial(t + 'Mat', e, 'power-view', {
        attributes: ['position', 'uv'],
        uniforms: [
          'world',
          'viewProjection',
          'textureSampler',
          'highlightColor',
          'alpha',
          'bgAlpha',
          'highlightLen',
        ],
        needAlphaBlending: !0,
      });
      (h.setTexture('textureSampler', i),
        h.setColor3(
          'highlightColor',
          new dependencies.Babylon.Color3(
            dependencies.UiColors.BLUE[0],
            dependencies.UiColors.BLUE[1],
            dependencies.UiColors.BLUE[2],
          ),
        ),
        h.setFloat('bgAlpha', 0.25),
        (this.material = h),
        (this._trackLen = NaN),
        (this._autoAlpha = NaN),
        (this._percent = NaN),
        (this.needsUpdate = 0),
        (this.trackLen = 0.15),
        (this.autoAlpha = 0),
        (this.percent = 0),
        (this.renderingGroupId = 1));
    }
    get trackLen() {
      return this._trackLen;
    }
    set trackLen(t) {
      this._trackLen !== t &&
        ((this._trackLen = t), (this.needsUpdate |= dependencies.PowerDirtyFlags.DF_LEN));
    }
    get autoAlpha() {
      return this._autoAlpha;
    }
    set autoAlpha(t) {
      this._autoAlpha !== t &&
        ((this._autoAlpha = t), (this.needsUpdate |= dependencies.PowerDirtyFlags.DF_ALPHA));
    }
    get percent() {
      return this._percent;
    }
    set percent(t) {
      this._percent !== t &&
        ((this._percent = t), (this.needsUpdate |= dependencies.PowerDirtyFlags.DF_LEN));
    }
    updateUI() {
      let t = this.needsUpdate;
      ((this.needsUpdate = 0),
        (this.isVisible = !!this._autoAlpha),
        t & dependencies.PowerDirtyFlags.DF_LEN &&
          this.material.setFloat('highlightLen', this._trackLen * this._percent - this.offsetX),
        this.isVisible &&
          t & dependencies.PowerDirtyFlags.DF_ALPHA &&
          this.material.setFloat('alpha', this._autoAlpha));
    }
  };
}
