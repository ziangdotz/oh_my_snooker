export default function meshBodyModule(module, exports, loadModule) {
  const VectorThree = loadModule('domain/math/vector-three'),
    MeshEdge = loadModule('domain/geometry/mesh-edge'),
    MeshPolygon = loadModule('domain/geometry/mesh-polygon'),
    MeshPolygonGroup = loadModule('domain/geometry/mesh-polygon-group'),
    o = { ground: 0, side: 1, tunnel: 2 },
    l = { ground: 2, side: 4, tunnel: 8 };
  module.exports = class MeshBody {
    get ground() {
      return this._groundPolygon;
    }
    constructor(t) {
      ((this.groups = []),
        (this._groundPolygon = null),
        (this.lowestPosition = new VectorThree(0, Number.MAX_VALUE, 0)),
        this.initData(t));
    }
    getGroupByName(t) {
      let e = this.groups;
      for (let i = 0, s = e.length; i !== s; ++i) if (e[i].name === t) return e[i];
      return null;
    }
    getPolygonByID(t) {
      let e = this.groups;
      for (let i = 0, s = e.length; i !== s; ++i) {
        let s = e[i].getPolygonByID(t);
        if (s) return s;
      }
      return null;
    }
    slice(t) {
      let e = [],
        i = this.groups;
      for (let s = 0, n = i.length; s !== n; ++s) i[s].name === t && e.push(i[s]);
      let s = Object.create(null);
      return ((s.groups = e), s);
    }
    initData(t) {
      let e = this.groups;
      ((this.nPolygons = 0), (this.nEdges = 0));
      for (let i in t) {
        let s = new MeshPolygonGroup(i, this.dataToPolys(t[i]));
        (s.setCollisionGroup(l[i] || 1), s.setPolyFrictionAndRestitution(), e.push(s));
      }
      e.sort(function (t, e) {
        return o[t.name] - o[e.name];
      });
    }
    dataToPolys(t) {
      let e = t.p,
        i = [];
      for (let t = 0, n = e.length / 3; t !== n; ++t)
        i.push(new VectorThree(e[3 * t], e[3 * t + 1], e[3 * t + 2]));
      let a,
        o,
        l = t.q,
        h = [],
        c = {};
      for (let t = 0, e = l.length; t !== e; ++t) {
        let e = l[t],
          d = e.i;
        if (d.length < 3) throw new Error('PolyGroup Error: invalid indices length' + d.length);
        let u,
          _,
          p = [];
        for (let t = 0, e = d.length; t !== e; ++t)
          c[(u = (a = d[t]) + '-' + (o = d[(t + 1) % e]))]
            ? p.push(c[u])
            : c[(_ = o + '-' + a)]
              ? p.push(c[_].cloneReversed())
              : ((c[u] = new MeshEdge(i[a], i[o])), this.nEdges++, p.push(c[u]));
        let f = new MeshPolygon(new VectorThree(e.n[0], e.n[1], e.n[2]), p);
        (e.uv && (f.uv = e.uv),
          (f.uid = this.nPolygons++),
          e.s && f.setBoundingSphere(new VectorThree(e.s[0], e.s[1], e.s[2]), e.s[3]));
        let g = e.f;
        if (g) for (let t = 0, e = g.length; t !== e; ++t) f[g[t]] = !0;
        (f.ground && (this._groundPolygon = f),
          f.centerPosition.y < this.lowestPosition.y && this.lowestPosition.copy(f.centerPosition),
          h.push(f));
      }
      return ((i.length = 0), (i = null), h);
    }
    log() {
      let t = this.groups,
        e = '';
      for (let i = 0, s = t.length; i !== s; ++i) {
        e = e.concat(t[i].name + '\n');
        for (let s = 0, n = t[i].polys.length; s !== n; ++s)
          e = e.concat('\t' + s + ': ' + t[i].polys[s].toStringShort() + '\n');
      }
      console.log(e);
    }
  };
}
