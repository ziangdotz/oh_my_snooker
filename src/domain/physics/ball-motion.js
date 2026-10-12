export default function ballMotionModule(module, exports, loadModule) {
  'use strict';
  const PhysicsMonitor = loadModule('shared/diagnostics/physics-monitor'),
    VectorThree = loadModule('domain/math/vector-three'),
    r = loadModule('domain/physics/physics-constants').tPrecision,
    a = VectorThree.EPSILON,
    o = new VectorThree(),
    l = new VectorThree(),
    h = new VectorThree(),
    c = new VectorThree(),
    d = new VectorThree(),
    u = new VectorThree(),
    _ = new VectorThree(),
    p = new VectorThree();
  var f,
    g,
    m = [];
  module.exports = {
    initIslands: function (t, e, i, s, n) {
      for (var r, a, o, l = e.groups, h = 0, c = t.length; h !== c; ++h)
        if ((r = t[h]).active) {
          o = s.acquire();
          for (var d = h + 1, u = c; d < u; ++d)
            (a = t[d]).active &&
              (o.resetWithBiBj(r, a),
              this.dcdSS(o) &&
                (i.add(o),
                o.startResting(),
                o.impulseTransformDirty && o.updateImpulseTransform(),
                (o = s.acquire())));
          (o.free(), (o = n.acquire()));
          for (d = 0, u = l.length; d !== u; ++d)
            for (var _ = l[d].polys, p = 0, f = _.length; p !== f; ++p)
              (o.resetWithBiBj(r, _[p]),
                this.dcdSP(o) &&
                  (i.add(o),
                  o.startResting(),
                  o.impulseTransformDirty && o.updateImpulseTransform(),
                  (o = n.acquire())));
          o.free();
        }
    },
    updateIslands: function (t, e) {
      var i,
        n = t.entry;
      if ((PhysicsMonitor.startTick('island_update'), e))
        for (; n; ) ((i = n.next), this.updateIsland(n, t), (n = i));
      else for (; n; ) ((i = n.next), n.needsUpdate && this.updateIsland(n, t), (n = i));
      PhysicsMonitor.stopTick('island_update');
    },
    updateIsland: function (t, e) {
      var i = t.itemEntry,
        s = m;
      for (t.needsUpdate = !1; i; )
        (i.markedAsKilled
          ? s.push(i)
          : i.needsUpdateResting() &&
            (i.isSS
              ? this.dcdSS(i) ||
                ((i.bi.predictionDirty = !0), (i.bj.predictionDirty = !0), s.push(i))
              : this.dcdSP(i) || ((i.bi.predictionDirty = !0), s.push(i))),
          (i = i.next));
      if (0 !== s.length) {
        for (var n = 0, r = s.length; n !== r; ++n) ((i = s[n]).stopResting(), e.remove(i, !0));
        s.length = 0;
      }
    },
    updateSSToi: function (t, e, i, s, n, r, a) {
      for (var o, l = i.acquire(), h = t.uid, c = 0, d = e.length; c !== d; ++c)
        !(o = e[c]).active ||
          o == t ||
          t.collisionGroup & o.collisionMask ||
          o.collisionGroup & t.collisionMask ||
          -1 !== n.indexOf(o.uid) ||
          s.isResting(h, o.uid) ||
          (this.ccdSS(t, o, r, l) && (a.add(l), (l = i.acquire())));
      l.free();
    },
    updateSPToi: function (t, e, i, s, n) {
      for (
        var a = e.groups, o = m, l = Number.MAX_VALUE, h = 0, c = null, d = 0, u = a.length;
        d !== u;
        ++d
      )
        (h = this.dSPB(t, a[d], i, s, l, o)) < l && (l = h);
      var _ = o.length;
      if (0 !== _) {
        if (l !== Number.MAX_VALUE) {
          l += r;
          for (var p = 0; p != _; ++p) (c = o[p]).toi <= l ? n.add(c) : c.free();
        } else {
          p = 0;
          for (var f = o.length; p != f; ++p) o[p].free();
        }
        o.length = 0;
      }
    },
    dSPB: function (t, e, i, n, a, o) {
      PhysicsMonitor.startTick('dSPB');
      for (
        var l, h = e.polys, c = i.acquire(), d = r, u = a + d, _ = t.uid, p = 0, f = h.length;
        p !== f;
        ++p
      )
        ((l = h[p]),
          n.isResting(_, l.uid) ||
            (this.ccdSP(t, l, u, c) &&
              (o.push(c), c.toi < a && (u = (a = c.toi) + d), (c = i.acquire()))));
      return (c.free(), PhysicsMonitor.stopTick('dSPB'), a);
    },
    dcdSS: function (t) {
      var e = t.bi,
        i = t.bj,
        s = e.radius,
        n = i.radius,
        r = a,
        o = e.position.distanceToSq(i.position);
      if (o - e.radiusSq - i.radiusSq - 2 * s * n > r) return !1;
      var l = Math.sqrt(o),
        h = u;
      return (
        l < a ? h.set(0, 1, 0) : h.subVectors(e.position, i.position).scale(1 / l),
        t.resetRestingWithPeneNormal(0.5 * (l - s - n), h),
        !0
      );
    },
    dcdSP: function (t) {
      var e = t.bi,
        i = t.bj,
        s = e.position,
        n = e.radius,
        r = i.edges,
        o = i.distanceFromPointToPlane(s),
        l = a,
        h = o - n;
      if (h > l || h < l - 2 * n) return !1;
      if (this.pointInPolygon(r, i.edgeXNormals, s))
        return (
          i.hasCustomNormalHandler
            ? t.resetRestingWithPeneCP(h, s)
            : t.resetRestingWithPeneNormal(h, i.normal),
          !0
        );
      var c = _,
        d = this.closestPointOnEdges(r, s, c);
      return !(d - e.radiusSq > l) && (t.resetRestingWithPeneCP(Math.sqrt(d) - n, c), !0);
    },
    ccdSS: function (t, e, i, n) {
      PhysicsMonitor.startTick('ccdSS');
      var r = d.subVectors(t.position, e.position),
        a = o.subVectors(t.v, e.v);
      if (a.dot(r) > 0) return (PhysicsMonitor.stopTick('ccdSS'), !1);
      PhysicsMonitor.count('nCcdSS', 1);
      var l = t.radius,
        h = e.radius,
        c = t.radiusSq,
        u = e.radiusSq,
        _ = r.lengthSq(),
        p = c + u + 2 * l * h;
      if (_ < p)
        return (
          n.resetPendingWithToiPene(t, e, 0, 0.5 * (Math.sqrt(_) - l - h)),
          PhysicsMonitor.stopTick('ccdSS'),
          !0
        );
      var f = this.pRaySphereToi(a, a.dot(a), r, _, p);
      return f < i
        ? (n.resetPendingWithToiPene(t, e, f, 0), PhysicsMonitor.stopTick('ccdSS'), !0)
        : (PhysicsMonitor.stopTick('ccdSS'), !1);
    },
    ccdSP: function (t, e, i, s) {
      if (t.collisionMask & e.collisionGroup) return !1;
      if (
        0 !== e.bR &&
        !this.rayIntersect(
          t.position,
          t.v,
          t.vSq,
          e.bCenter,
          t.radiusSq + e.bRSq + 2 * t.radius * e.bR,
        )
      )
        return !1;
      var n = e.distanceFromPointToPlane(t.position),
        r = t.radius,
        o = a;
      if (n - r >= -o) {
        var l = t.v.dot(e.normal);
        return !(l >= 0) && this.__ccdspFar(n, t, e, l, i, s);
      }
      return n > o - r && this.__ccdspNear(n, t, e, i, s);
    },
    __ccdspFar: function (t, e, i, n, r, o) {
      (PhysicsMonitor.count('nCcdSP_Far', 1), PhysicsMonitor.startTick('ccdSP_Far'));
      var u = i.normal,
        p = e.v,
        f = e.position,
        g = e.radius,
        m = i.edges,
        y = l.scaleVector(g, u),
        v = (g - t) / n;
      if ((v < a && (v = 0), v > r)) return (PhysicsMonitor.stopTick('ccdSP_Far'), !1);
      var b = h.interpolate(f, p, v).sub(y);
      if (this.pointInPolygon(m, i.edgeXNormals, b))
        return (
          i.hasCustomNormalHandler
            ? o.resetPendingWithToiPeneCP(e, i, v, 0, b)
            : o.resetPendingWithToiPeneNormal(e, i, v, 0, u),
          PhysicsMonitor.stopTick('ccdSP_Far'),
          !0
        );
      var x = _;
      this.closestPointOnEdges(m, b, x);
      var S = c.copyNeg(p),
        C = d.subVectors(x, f);
      return (v = this.pRaySphereToi(S, e.vSq, C, C.lengthSq(), e.radiusSq)) <= r &&
        v !== Number.MAX_VALUE
        ? (o.resetPendingWithToiPeneCP(e, i, v, 0, x), PhysicsMonitor.stopTick('ccdSP_Far'), !0)
        : (PhysicsMonitor.stopTick('ccdSP_Far'), !1);
    },
    __ccdspNear: function (t, e, i, n, r) {
      (PhysicsMonitor.count('nCcdSP_Near', 1), PhysicsMonitor.startTick('ccdSP_Near'));
      var a = e.position,
        o = e.radius,
        u = i.normal,
        p = i.edges,
        f = l.scaleVector(o, u),
        g = h.subVectors(a, f);
      if (this.pointInPolygon(p, i.edgeXNormals, g))
        return (
          i.hasCustomNormalHandler
            ? r.resetPendingWithToiPeneCP(e, i, 0, t - o, g)
            : r.resetPendingWithToiPeneNormal(e, i, 0, t - o, u),
          PhysicsMonitor.stopTick('ccdSP_Near'),
          !0
        );
      var m = _;
      this.closestPointOnEdges(p, g, m);
      var y = d.subVectors(m, a),
        v = y.lengthSq(),
        b = e.radiusSq;
      if (v <= b)
        return (
          r.resetPendingWithToiPeneCP(e, i, 0, Math.sqrt(v) - o, m),
          PhysicsMonitor.stopTick('ccdSP_Near'),
          !0
        );
      var x = c.copyNeg(e.v),
        S = this.pRaySphereToi(x, e.vSq, y, v, b);
      return S <= n && S !== Number.MAX_VALUE
        ? (r.resetPendingWithToiPeneCP(e, i, S, 0, m), PhysicsMonitor.stopTick('ccdSP_Near'), !0)
        : (PhysicsMonitor.stopTick('ccdSP_Near'), !1);
    },
    pointInPolygon: function (t, e, i) {
      for (var s, n, r = null, a = p, o = 0, l = t.length; o !== l; ++o) {
        if (
          ((s = t[o]),
          a.subVectors(i, s.va),
          (n = e[o].dot(a)),
          !(null === r || (n > 0 && !0 === r) || (n <= 0 && !1 === r)))
        )
          return !1;
        null === r && (r = n > 0);
      }
      return !0;
    },
    rayIntersect: function (t, e, i, s, n) {
      var r = d.subVectors(t, s),
        a = r.lengthSq() - n,
        o = r.dot(e);
      return !(a > 0 && o > 0) && o * o - a * i >= 0;
    },
    pRaySphereToi: function (t, e, i, s, n) {
      var r = i.dot(t),
        o = s - n;
      if (o > 0 && r > 0) return Number.MAX_VALUE;
      var l = e,
        h = r * r - l * o;
      if (h <= 0) return Number.MAX_VALUE;
      var c = (-r - Math.sqrt(h)) / l;
      return (c < a && (c = 0), c);
    },
    closestPointOnEdges:
      ((f = new VectorThree()),
      (g = new VectorThree()),
      function (t, e, i) {
        for (
          var s = null,
            n = f,
            r = g,
            a = null,
            o = 0,
            l = Number.MAX_VALUE,
            h = 0,
            c = 0,
            d = t.length;
          c !== d;
          ++c
        )
          ((s = t[c]),
            n.subVectors(e, s.va),
            l >
              (h = (a =
                (o = n.dot(s.vab) / s.abDotAb) <= 0
                  ? s.va
                  : o >= 1
                    ? s.vb
                    : r.scaleVector(o, s.vab).add(s.va)).distanceToSq(e)) && ((l = h), i.copy(a)));
        return l;
      }),
  };
}
