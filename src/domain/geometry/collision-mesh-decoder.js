export default function collisionMeshDecoderModule(module, exports, loadModule) {
  const VectorThree = loadModule('domain/math/vector-three'),
    n = VectorThree.EPSILON;
  function r(t) {
    const e = t.width,
      i = t.height;
    let s = [];
    for (let n = i - 1; n >= 0; --n) {
      let i = n * e,
        r = new Float32Array(3 * e);
      for (let s = 0; s < e; ++s) {
        let e = 4 * (i + s),
          n = t.data[e],
          a = t.data[e + 1],
          o = t.data[e + 2];
        ((r[3 * s] = 2 * (n / 255 - 0.5)),
          (r[3 * s + 1] = 2 * (o / 255 - 0.5)),
          (r[3 * s + 2] = 2 * -(a / 255 - 0.5)));
      }
      s.push(r);
    }
    ((this.array2D = s), (this.maxRow = e - 1), (this.maxLine = i - 1));
  }
  r.prototype.getNormalByUV = function (t, e, i) {
    let s = Math.floor(e * this.maxLine),
      n = 3 * Math.floor(t * this.maxRow),
      r = this.array2D;
    i.set(r[s][n], r[s][n + 1], r[s][n + 2]);
  };
  const a = function (t) {
      if (4 !== t.edges.length)
        throw new Error('validateUV4Poly Error: error edge count: ' + t.edges.length);
      if (!t.uv) throw new Error('validateUV4Poly Error: uv not found for poly: ' + t.uid);
      if (8 !== t.uv.length)
        throw new Error('validateUV4Poly Error: error uv count: ' + t.uv.length);
      return !0;
    },
    o = function (t) {
      const e = n;
      let i = t.edges,
        r = null,
        a = null,
        o = 0;
      for (let s = 0, n = i.length; s !== n; ++s) {
        let l = i[s].vab;
        if (Math.abs(l.y) <= e && t.edgeXNormals[s].y > e) {
          ((o = s), (r = i[s]), (a = s === n - 1 ? i[0] : i[s + 1]));
          break;
        }
      }
      if (!r) throw new Error('setUVLonLat Error: No right edge found for poly: ' + t.uid);
      let l = r.va.distanceTo(r.vb),
        h = a.va.distanceTo(a.vb);
      ((t.lonLatOrigin = r.va),
        (t.lonDir = new VectorThree().normalizeVector(r.vab)),
        (t.lon = l),
        (t.lat = h),
        (t.u0 = t.uv[2 * o]),
        (t.v0 = t.uv[2 * o + 1]),
        (o = 3 === o ? 0 : o + 1),
        (t.uChange = t.uv[2 * o] - t.u0),
        (o = 3 === o ? 0 : o + 1),
        (t.vChange = t.uv[2 * o + 1] - t.v0));
    },
    l = (function () {
      let t = new VectorThree();
      return function (e, i) {
        let s = this.lonLatOrigin;
        t.subVectors(e, s);
        let n = t.dot(this.lonDir),
          r = this.u0 + (n / this.lon) * this.uChange,
          a = this.v0 + ((e.y - s.y) / this.lat) * this.vChange;
        (r > 1 ? (r = 1) : r < 0 && (r = 0),
          a > 1 ? (a = 1) : a < 0 && (a = 0),
          this.nTable.getNormalByUV(r, a, i));
      };
    })();
  module.exports = {
    createNTableWithImgData: function (t) {
      return new r(t);
    },
    extendPolyGroup: function (t, e) {
      let i = t.polys;
      for (let t = 0, s = i.length; t !== s; ++t) {
        let s = i[t];
        (a(s),
          o(s),
          (s.nTable = e),
          (s.hasCustomNormalHandler = !0),
          (s.customNormalHandler = l.bind(s)));
      }
    },
  };
}
