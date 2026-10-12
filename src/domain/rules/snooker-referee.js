export default function snookerRefereeModule(module, exports, loadModule) {
  const s = loadModule('domain/rules/foul-codes').FoulCode,
    BaseReferee = loadModule('domain/rules/base-referee'),
    SceneDefinitions = loadModule('domain/scene/scene-definitions'),
    CircleArc = loadModule('domain/geometry/circle-arc'),
    GeometryUtils = loadModule('domain/geometry/geometry-utils'),
    l = loadModule('domain/physics/physics-api').Vec3,
    h = Object.create(null);
  ((h.RED = 2), (h.YELLOW = 4), (h.BLACK = 128), (h.COLOR_ALL = 252));
  module.exports = class SnookerReferee extends BaseReferee {
    get validRegionGeoCenter() {
      return this._dArea.geoCenter;
    }
    constructor() {
      (super(),
        (this._dArea = new CircleArc()),
        (this._tmpArray = []),
        (this._tmpOccupiedSpots = []),
        (this._tmpSections = []),
        (this._tmpA = new l()),
        (this._tmpB = new l()),
        (this._respotColorBallsSortHandler = (t, e) => t.number - e.number));
    }
    syncAreaWithSimulator(t) {
      if (this._sceneId !== t.sceneId) {
        this._sceneId = t.sceneId;
        const e = SceneDefinitions[this._sceneId].dArea,
          i = t.ground;
        (this._playArea.resetWithAtomPolygon(i),
          this._dArea.resetWithCenterTopNormal(
            e.cx,
            i.centerPosition.y,
            e.cz,
            e.sx,
            i.centerPosition.y,
            e.sz,
            i.normal,
          ));
      }
    }
    intersectionRayValidRegionPlane(t, e, i) {
      return this._dArea.intersectionWithRay(t, e, i, 10);
    }
    projectionInSideValidRegion(t, e, i) {
      return this._dArea.projectionInside(t, e, i);
    }
    resetGContext(t) {
      ((t.inHand = 2), (t.ballOn = h.RED));
    }
    checkResult(t, e, i) {
      const n = e.result;
      ((i.score = 0), (i.foulCode = 0));
      let r = 0,
        a = e.getBallAtIndex(n.firstKissIndex).number;
      if (t.ballOn === this.sysReservedBallOn)
        return (this._liveRespot(n.pottedIndices, n.outOfBoundsIndices, e), void (t.inHand = 1));
      let o = 0,
        l = 0;
      t.ballOn === h.COLOR_ALL
        ? a <= 1
          ? ((i.foulCode |= 0 === a ? s.MISS_TARGET : s.ILLEGAL_FIRST_HIT), (o = -7))
          : (l = a)
        : Math.pow(2, a) !== t.ballOn
          ? ((i.foulCode |= 0 === a ? s.MISS_TARGET : s.ILLEGAL_FIRST_HIT),
            (o = Math.min(-a, -Math.log2(t.ballOn), -4)))
          : (l = a);
      let c = n.outOfBoundsIndices,
        d = 0;
      for (let t = 0, n = c.length; t !== n; ++t) {
        let n = e.getBallAtIndex(c[t]).number;
        ((d = Math.min(d, -n, -l, -4)), (i.foulCode |= s.OFF_TABLE));
      }
      let u = n.pottedIndices,
        _ = 0;
      for (let t = 0, n = u.length; t !== n; ++t) {
        let n = e.getBallAtIndex(u[t]).number;
        0 !== n && n === l
          ? (r += n)
          : ((_ = Math.min(_, -n, -l, -4)),
            (i.foulCode |= 0 === n ? s.POTTING_CUE_BALL : s.ILLEGAL_POTTING));
      }
      let p = Math.min(o, d, _);
      ((i.score = 0 === p ? r : p),
        (t.inHand = 0),
        t.ballOn === h.BLACK && 0 !== i.score
          ? (t.ballOn = 0)
          : ((i.score <= 0 || t.ballOn === h.RED || t.ballOn === h.COLOR_ALL) &&
              (e.getBallAtIndex(0).active || (t.inHand = 2),
              this._liveRespot(n.pottedIndices, n.outOfBoundsIndices, e)),
            i.score > 0
              ? t.ballOn === h.RED
                ? (t.ballOn = h.COLOR_ALL)
                : t.ballOn === h.COLOR_ALL
                  ? (t.ballOn = 0 === this._nActiveReds(e) ? h.YELLOW : h.RED)
                  : (t.ballOn = t.ballOn << 1)
              : (t.ballOn !== h.RED && t.ballOn !== h.COLOR_ALL) ||
                (t.ballOn = 0 === this._nActiveReds(e) ? h.YELLOW : h.RED)));
    }
    _liveRespot(t, e, i) {
      const s = this._tmpArray;
      let n,
        r = !1;
      for (let e = 0, a = t.length; e !== a; ++e)
        (n = i.getBallAtIndex(t[e])).number > 1 ? s.push(n) : 0 === n.number && (r = !0);
      for (let t = 0, a = e.length; t !== a; ++t)
        (n = i.getBallAtIndex(e[t])).number > 1 ? s.push(n) : 0 === n.number && (r = !0);
      (0 !== s.length && (this._liveRespotColorBalls(s, i), (s.length = 0)),
        r && this._liveRespotCueBall(i));
    }
    _nActiveReds(t) {
      const e = t.getBalls();
      let i = 0;
      for (let t = 0, s = e.length; t !== s; ++t) 1 === e[t].number && e[t].active && i++;
      return i;
    }
    _liveRespotColorBalls(t, e) {
      const i = 1.05 * e.ballRadius,
        s = this._tmpOccupiedSpots;
      let n;
      s.length = 0;
      for (let r = t.length - 1; r >= 0; --r)
        ((n = t[r]),
          e.touchBalls(n.index, n.spot, i) || (t.splice(r, 1), e.respotIndexDefault(n.index)),
          (s[n.number] = 1));
      if (0 === t.length) return;
      t.sort(this._respotColorBallsSortHandler);
      let r = e.getBalls();
      for (let a = r.length - 1; a >= 0 && !((n = r[a]).number < 2); --a) {
        let r = t[t.length - 1].index;
        if (
          !s[n.number] &&
          !e.touchBalls(r, n.spot, i) &&
          (e.resetBallPosition(t.pop(), n.spot), 0 === t.length)
        )
          return;
      }
      let a = e.ground,
        h = this._tmpA,
        c = this._tmpB,
        d = this._tmpSections,
        u = l.UNIT_Z;
      for (let s = t.length - 1; s >= 0; --s) {
        let l = (n = t[s]).spot;
        (h.set(a.centerPosition.x - a.size.x / 2 + i, l.y, l.z),
          c.set(a.centerPosition.x + a.size.x / 2 - i, l.y, l.z));
        let _ = 10;
        for (; _ > 0 && !GeometryUtils.sectionsBallsAB(r, n, i, h, c, d, u); )
          (h.addScaled(u, d[0]), c.addScaled(u, d[0]), _--);
        if (_ > 0) {
          let t = GeometryUtils.findClosestTInSections(l.x - h.x, d);
          e.resetBallXYZ(n, h.x + t, h.y, h.z);
        } else e.resetBallPosition(n, n.spot);
      }
    }
    _liveRespotCueBall(t) {
      const e = 1.05 * t.ballRadius,
        i = t.getBallAtIndex(0);
      if (!t.touchBalls(0, i.spot, e)) return t.respotIndexDefault(0);
      let s = t.getBalls(),
        n = this._dArea,
        r = this._tmpA.copy(n.diameterA),
        a = this._tmpB.copy(n.diameterB),
        l = this._tmpSections,
        h = 0,
        c = n.radius;
      for (
        r.y = i.spot.y, a.y = i.spot.y;
        !GeometryUtils.sectionsBallsAB(s, i, e, r, a, l, n.arcDir);

      ) {
        if ((h += l[0]) > c) return void t.respotIndexDefault(0);
        let e = c - Math.sqrt(c * c - h * h);
        (r.addScaled(n.arcDir, l[0]).addScaled(n.diameterDir, e),
          a.addScaled(n.arcDir, l[0]).addScaled(n.diameterDir, -e));
      }
      let d = GeometryUtils.findCenterOfLongestInSections(l);
      t.resetBallPosition(i, r.addScaled(n.diameterDir, d));
    }
  };
}
