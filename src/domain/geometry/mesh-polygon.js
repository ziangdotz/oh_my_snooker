export default function meshPolygonModule(module, exports, loadModule) {
  const VectorThree = loadModule('domain/math/vector-three');
  module.exports = class MeshPolygon {
    get label() {
      return (
        this.uid +
        ': ground:' +
        !!this.ground +
        ', sidesoft:' +
        !!this.sidesoft +
        ', sidehard:' +
        !!this.sidehard +
        ', tunnel:' +
        !!this.tunnel +
        ', pocket:' +
        !!this.pocket
      );
    }
    get size() {
      if (!this._size) {
        let t = Number.MAX_VALUE,
          e = 0,
          i = Number.MAX_VALUE,
          n = 0,
          r = Number.MAX_VALUE,
          a = 0,
          o = this.edges;
        for (let s = 0, l = o.length; s !== l; ++s) {
          let l = o[s].va;
          (t > l.x && (t = l.x),
            e < l.x && (e = l.x),
            i > l.y && (i = l.y),
            n < l.y && (n = l.y),
            r > l.z && (r = l.z),
            a < l.z && (a = l.z));
        }
        this._size = new VectorThree(e - t, n - i, a - r);
      }
      return this._size;
    }
    constructor(t, e) {
      ((this.ground = !1),
        (this.sidesoft = !1),
        (this.sidehard = !1),
        (this.pocket = !1),
        (this.tunnel = !1),
        (this.end = !1),
        (this.uid = -1),
        (this.normal = t),
        (this.edges = e),
        (this.edgeXNormals = []));
      let i = 0,
        n = 0,
        r = 0,
        a = this.edges.length;
      for (let t = 0, e = a; t !== e; ++t)
        ((this.edgeXNormals[t] = new VectorThree()),
          this.edgeXNormals[t].crossVectors(this.edges[t].vab, this.normal),
          (i += this.edges[t].va.x),
          (n += this.edges[t].va.y),
          (r += this.edges[t].va.z));
      ((this.centerPosition = new VectorThree(i / a, n / a, r / a)),
        (this.a = this.normal.x),
        (this.b = this.normal.y),
        (this.c = this.normal.z),
        (this.d = -this.normal.dot(this.edges[0].va)),
        (this.bCenter = null),
        (this.bR = 0),
        (this.bRSq = 0),
        (this.restitution = 0),
        (this.friction = 0),
        (this.collisionGroup = 1),
        (this.uv = null),
        (this._size = null));
    }
    toString() {
      return (
        this.a +
        'x + ' +
        this.b +
        'y + ' +
        this.c +
        'z + ' +
        this.d +
        ' = 0,restitution:' +
        this.restitution +
        ',bCenter: ' +
        this.bCenter +
        ',bR:' +
        this.bR
      );
    }
    toStringShort() {
      var t = 'uid: ' + this.uid;
      return (
        this.ground && (t = t.concat(', ground')),
        this.sidesoft && (t = t.concat(', sidesoft')),
        this.sidehard && (t = t.concat(', sidehard')),
        this.pocket && (t = t.concat(', pocket')),
        this.tunnel && (t = t.concat(', tunnel')),
        this.end && (t = t.concat(', end')),
        (t = t.concat(
          ', restitution: ' +
            this.restitution +
            ', friction: ' +
            this.friction +
            ', cg: ' +
            this.collisionGroup,
        ))
      );
    }
    setBoundingSphere(t, e) {
      ((this.bCenter = t), (this.bR = e), (this.bRSq = e * e));
    }
    distanceFromPointToPlane(t) {
      return this.a * t.x + this.b * t.y + this.c * t.z + this.d;
    }
    dispose() {
      ((this.normal = null),
        (this.edges = null),
        (this.edgeXNormals = null),
        (this.bCenter = null),
        (this.bR = 0));
    }
  };
}
