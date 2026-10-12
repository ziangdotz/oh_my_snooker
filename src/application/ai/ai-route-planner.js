// Explicit live dependencies preserve initialization and shared state.
export default function createAiRoutePlanner(dependencies) {
  return class AiRoutePlanner {
    get taskRunning() {
      return -1 !== this._currentTaskIndex;
    }
    constructor() {
      ((this._simEvolution = -1),
        (this._ballOnindices = []),
        (this._ballCheckIndex = 0),
        (this._pkIndex = 0),
        (this._routeCache = dependencies.routePool),
        (this._isBreakDirty = !1),
        (this._isBreak = !1),
        (this._props = Object.create(null)),
        (this._props.range = 0),
        (this._props.abf = 0),
        (this._props.bcf = 0),
        (this._props.chaoticSeed = 1),
        (this._props.bpm = 1),
        (this._props.mpm = 1),
        (this._currentTaskIndex = -1),
        (this._tasks = [
          (t, e, i) => {
            let s,
              n = performance.now(),
              r = t.playArea,
              a = r.pockets,
              o = e.getBallAtIndex(0);
            for (; this._ballCheckIndex < this._ballOnindices.length; ) {
              for (
                s = e.getBallAtIndex(this._ballOnindices[this._ballCheckIndex]);
                this._pkIndex < a.length;

              )
                if (
                  (AiRoutePlanner._checkSinglePK(o, s, this._pkIndex++, r, e, i, this._routeCache),
                  performance.now() - n > 0.02)
                )
                  return !1;
              (this._ballCheckIndex++, (this._pkIndex = 0));
            }
            return !0;
          },
          (t, e, i) => {
            let s,
              n,
              r,
              a,
              o,
              l = performance.now(),
              h = t.playArea,
              c = e.getBallAtIndex(0);
            for (
              this.getIsBreak(e)
                ? ((n = 2 * c.radius), (r = 0.85 + 0.14 * Math.random()), (a = 0.4), (o = 1))
                : ((n = 0.5 * -c.radius), (r = 0.99 + 0.009 * Math.random()), (a = 0.6), (o = 5));
              this._ballCheckIndex < this._ballOnindices.length;

            ) {
              if (
                ((s = e.getBallAtIndex(this._ballOnindices[this._ballCheckIndex])),
                AiRoutePlanner._checkPassAbility(c, s, h, e, i, this._routeCache, n, r, a, o))
              )
                return !0;
              if ((this._ballCheckIndex++, performance.now() - l > 0.02)) return !1;
            }
            return !0;
          },
          (t, e) => {
            if (this._ballCheckIndex >= this._ballOnindices.length) return !0;
            let i,
              s,
              n,
              r,
              a,
              o,
              l,
              h,
              c,
              d = dependencies.Mt,
              u = e.sidePolyGroups.polys,
              _ = e.getBallAtIndex(0),
              p = e.getBallAtIndex(this._ballOnindices[this._ballCheckIndex++]),
              f = e.getBalls(),
              g = dependencies.qt.set(_.position.x, _.position.z),
              m = dependencies.Wt.set(p.position.x, p.position.z),
              y = dependencies.Yt.subVectors(m, g),
              v = dependencies.Xt,
              b = dependencies.Kt,
              x = dependencies.Zt,
              S = dependencies.jt,
              C = dependencies.Nt,
              I = dependencies.Vt,
              T = dependencies.Ut,
              A = _.radius;
            for (let t = 0, e = u.length; t !== e; ++t) {
              if (!(i = u[t]).sidehard || i.bCenter) continue;
              if (!(s = AiRoutePlanner._getPolyHorizEdge(i))) {
                0;
                continue;
              }
              if (
                (S.set(i.normal.x, i.normal.z).normalize(),
                v.set(s.va.x, s.va.z),
                b.set(s.vab.x, s.vab.z),
                (o = b.length()),
                b.scale(1 / o),
                (r = x.subVectors(g, v).dot(S) - A) * (a = x.subVectors(m, v).dot(S) - A) < 0)
              )
                continue;
              if (
                ((h = r / (l = r + a)),
                (c = A + (2 * r * a) / l),
                (n =
                  Math.abs(b.x) > Math.abs(b.y)
                    ? (y.x * h - S.x * c + g.x - v.x) / b.x
                    : (y.y * h - S.y * c + g.y - v.y) / b.y) < d || n > o - d)
              )
                continue;
              if (
                (C.set(v.x + b.x * n + S.x * A, _.position.y, v.y + b.y * n + S.y * A),
                I.subVectors(C, _.position),
                (r = I.length()),
                I.scale(1 / r),
                !AiRoutePlanner._isSegmentSafe(_.position, I, r, A, f, _, p))
              )
                continue;
              if (
                (T.subVectors(p.position, C),
                (a = T.length()),
                T.scale(1 / a),
                !AiRoutePlanner._isSegmentSafe(C, T, a, A, f, p))
              )
                continue;
              let e = 0.2 + 0.02 * (r + a),
                E = T.dot(I) + 1,
                w = -e * (E *= E),
                R = 1 - a / 10;
              this._routeCache.next(I.x, I.y, I.z, w, e, R);
            }
            return !1;
          },
        ]));
    }
    setFactors(t) {
      ((this._props.range = t.range),
        (this._props.abf = t.abf),
        (this._props.bcf = t.bcf),
        (this._props.chaoticSeed = t.chaoticSeed),
        (this._props.mpm = t.mpm),
        (this._props.bpm = t.bpm));
    }
    erase() {
      ((this._ballOnindices.length = 0), this._routeCache.clear(), (this._currentTaskIndex = -1));
    }
    getIsBreak(t) {
      if (this._isBreakDirty) {
        ((this._isBreakDirty = !1), (this._isBreak = !0));
        for (let e = 0, i = this._ballOnindices.length; e !== i; ++e) {
          let i = t.getBallAtIndex(this._ballOnindices[e]);
          if (i.position.distanceToSq(i.spot) > 0.0025) {
            this._isBreak = !1;
            break;
          }
        }
      }
      return this._isBreak;
    }
    checkRestart(t, e) {
      let i = t.evolution;
      if (this._simEvolution !== i) {
        ((this._simEvolution = i), this.erase());
        let s = t.getBalls(),
          n = e.getContext('ballOn');
        for (let t = 1, e = s.length; t !== e; ++t)
          s[t].active && Math.pow(2, s[t].number) & n && this._ballOnindices.push(t);
        return (
          (this._ballCheckIndex = 0),
          (this._pkIndex = 0),
          (this._currentTaskIndex = 0),
          (this._isBreakDirty = !0),
          !0
        );
      }
      return !1;
    }
    step(t, e, i) {
      if ((0, this._tasks[this._currentTaskIndex])(t, e, i)) {
        let i = this._routeCache;
        if (0 === i.length)
          return ++this._currentTaskIndex >= this._tasks.length
            ? ((this._currentTaskIndex = -1), AiRoutePlanner._randomRoute(i), i.getAtIndex(0))
            : ((this._ballCheckIndex = 0), (this._pkIndex = 0), null);
        {
          this._currentTaskIndex = -1;
          let s = -1,
            n = null;
          for (let t = 0, e = i.length; t !== e; ++t) {
            let e = i.getAtIndex(t);
            e.priority > s && ((s = e.priority), (n = e));
          }
          return (
            -1 !== n.pkIndex && -1 !== n.ballBIndex && AiRoutePlanner._chaos(n, t, e, this._props),
            n
          );
        }
      }
      return null;
    }
    static _randomRoute(t) {
      let e = dependencies.Vt.set(Math.random(), 0, Math.random()).normalize();
      t.next(e.x, e.y, e.z, 0, 0.6 * Math.random(), 0.05 * Math.random());
    }
    static _getPolyHorizEdge(t) {
      let e = t.edges,
        i = dependencies.Mt;
      for (let t = 0, s = e.length; t !== s; ++t) if (Math.abs(e[t].vab.y) <= i) return e[t];
      return null;
    }
    static _chaos(t, e, i, s) {
      if (Math.random() < 0.05) return;
      let n = i.getBallAtIndex(0),
        r = i.getBallAtIndex(t.ballBIndex),
        a = e.playArea.pockets[t.pkIndex],
        o = n.position.distanceTo(r.position),
        l = dependencies.Vt.set(t.dx, t.dy, t.dz),
        h = dependencies.Ut.subVectors(a.position, r.position);
      h.y = 0;
      let c = h.length(),
        d = dependencies.Bt.scaleVector(1 / c, h),
        u = l.dot(d),
        _ = this._sigmoid01(c - 1.8 * u * u, 0.5) * s.bcf,
        p = Math.min(1, o / s.range) * s.abf,
        f = (p *= p) + _,
        g = (1 - Math.pow(Math.random(), s.chaoticSeed)) * f,
        m = dependencies.Ht.crossVectors(h, dependencies.Ot.UNIT_Y).normalize();
      (Math.random() > 0.5 && (g *= -1),
        m.scale((a.radius + r.radius) * g),
        2 === t.pkIndex || 3 === t.pkIndex ? (g *= s.mpm) : g < 1 && (g *= s.bpm),
        h.add(m),
        d.normalizeVector(h));
      let y = dependencies.Nt.scaleVector(-r.radius - n.radius, d).add(r.position),
        v = dependencies.Gt.subVectors(y, n.position).normalize();
      ((t.dx = v.x), (t.dy = v.y), (t.dz = v.z));
    }
    static _sigmoid01(t, e) {
      return 1 / (1 + Math.pow(Math.E, -t / e));
    }
    static _checkSinglePK(t, e, i, s, n, r, a) {
      let o = dependencies.Mt,
        l = dependencies.Ut,
        h = dependencies.Bt,
        c = dependencies.Nt,
        d = dependencies.Ft,
        u = dependencies.zt,
        _ = dependencies.Vt,
        p = n.getBalls(),
        f = s.pockets,
        g = f[i];
      if (
        (l.subVectors(g.position, e.position),
        (l.y = 0),
        h.normalizeVector(l),
        h.dot(g.normal) > g.maxHalfOpen)
      )
        return;
      let m = l.length();
      if (!AiRoutePlanner._isSegmentSafe(e.position, h, m, e.radius, p, t, e)) return;
      if (
        (c.scaleVector(-e.radius - t.radius, h).add(e.position),
        !r.pointProjectionOnTable(c.x, c.y, c.z))
      )
        return;
      _.subVectors(c, t.position);
      let y = _.length();
      _.scale(1 / y);
      let v = _.dot(h);
      if (v < -o) return;
      if (!AiRoutePlanner._isSegmentSafe(t.position, _, y - 0.002, t.radius + o, p, t, e)) return;
      let b = 0,
        x = 0.97 - 0.31 * Math.min(1, y / 2);
      AiRoutePlanner._vRef(_, h, x, d);
      for (let e = 0, s = f.length; e !== s; ++e) {
        let s = f[e].position;
        if (s.distanceToSq(c) < 0.34) {
          (u.subVectors(s, c), (u.y = 0));
          let n = u.dot(d),
            r = dependencies.geometryUtils.a.nIntersectSphereRay(s, t.radius + g.radius, c, d);
          if (n > 0 && r > 0) {
            b = i === e ? 1 : 2;
            break;
          }
        }
      }
      if (2 === b) return;
      let S = m / s.diagonal,
        C = y / s.diagonal,
        I = 0,
        T = 0.2 * (C + S) * 0.5 + (1 - v) * S * 0.7;
      1 === b && ((I = -0.99), (T = Math.max(T, 0.7 * C)));
      let A = (0.5 * (1 - C) + 0.45 * (1 - S)) * v + 0.05 * e.number,
        E = a.next(_.x, _.y, _.z, I, T, A);
      ((E.ballBIndex = e.index), (E.pkIndex = i));
    }
    static _checkPassAbility(t, e, i, s, n, r, a, o, l, h) {
      let c = dependencies.Mt,
        d = s.getBalls(),
        u = dependencies.Vt.subVectors(e.position, t.position),
        _ = dependencies.Ut.crossVectors(u, dependencies.Ot.UNIT_Y).normalize(),
        p = dependencies.Nt,
        f = (-e.radius - t.radius) * o,
        g = -f,
        m = 0.2 * (g - f);
      for (; f <= g; ) {
        (p.scaleVector(f, _).add(e.position), u.subVectors(p, t.position));
        let s = u.length();
        if (
          (u.scale(1 / s),
          AiRoutePlanner._isSegmentSafe(t.position, u, s + a, t.radius + c, d, t, e))
        )
          return (
            r.next(
              u.x,
              u.y,
              u.z,
              0,
              0.1 * Math.random() + (s / i.diagonal) * l,
              0.1 * Math.random(),
            ),
            r.length >= h
          );
        f += m;
      }
      return !1;
    }
    static _vRef(t, e, i, s) {
      (s.scaleVector(t.dot(e) * i, e), s.subVectors(t, s).normalize());
    }
    static _isSegmentSafe(t, e, i, s, n, ...r) {
      if (i < s) return !0;
      for (let a = 0, o = n.length; a !== o; ++a) {
        let o = n[a];
        if (
          o.active &&
          -1 === r.indexOf(o) &&
          0 !==
            dependencies.geometryUtils.a.nIntersectSphereADirLen(o.position, o.radius + s, t, e, i)
        )
          return !1;
      }
      return !0;
    }
    static _logRoute(t) {
      (console.log('\tbackSpin: ' + t.fbSpin),
        console.log('\tpriority: ' + t.priority),
        console.log('\tdir: ' + t.dx + ', ' + t.dy + ', ' + t.dz));
    }
  };
}
