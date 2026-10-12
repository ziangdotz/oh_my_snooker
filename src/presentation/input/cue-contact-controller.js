// Explicit live dependencies preserve initialization and shared state.
export default function createCueContactController(dependencies) {
  return class CueContactController {
    constructor(t, e) {
      ((this._weakParent = t),
        (this._stateIndex = e),
        (this._cushionBody = null),
        (this._balls = null),
        (this._potentialTouches = []),
        (this._cachedProps = dependencies.Si()),
        (this._kissDirtyFlag = 0),
        (this._worTargetPoint = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._worCtlPoint = Object.create(null)),
        (this._worCtlPoint.x = NaN),
        (this._worCtlPoint.z = NaN),
        (this._angleH = NaN),
        (this._angleV = 0),
        (this._angleVRange = Object.create(null)),
        (this._angleVRange.min = 0),
        (this._angleVRange.max = 0.25 * Math.PI),
        (this._cachedSlopeH = 999),
        (this._worTransform = new Float32Array(16)),
        (this._locTipPoint = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._tipMaxEscape = 0),
        (this._locSupportPoint = new dependencies.Babylon.Vector3(-0.66, 0, 0)),
        (this._worTipPoint = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._worSupportPoint = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._kissPoint = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._kissDir = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this.needsUpdate = 0),
        (this._position = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._rotation = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this._lerpFactor = 1),
        (this.animatedPosition = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this.animatedRotation = new dependencies.Babylon.Vector3(0, 0, 0)),
        (this.lstWorSupportY = 0),
        (this._leadingSpace = 0),
        (this.onKissPropsChanged = () => {}));
    }
    _markKissDirty(t) {
      ((this._kissDirtyFlag |= t),
        (this.needsUpdate |= 2),
        this._weakParent.markStateDirty(this._stateIndex));
    }
    getKissDir() {
      return (0 !== this._kissDirtyFlag && this._updateKissProps(), this._kissDir);
    }
    getKissPoint() {
      return (0 !== this._kissDirtyFlag && this._updateKissProps(), this._kissPoint);
    }
    get leadingSpace() {
      return this._leadingSpace;
    }
    set leadingSpace(t) {
      this._leadingSpace !== t &&
        ((this._leadingSpace = t),
        (this.needsUpdate |= 2),
        this._weakParent.markStateDirty(this._stateIndex));
    }
    get kissToTable() {
      const t = this.getKissDir();
      if (t.y > -dependencies.ci) return Number.MAX_VALUE;
      return (
        -(
          this.getKissPoint().y -
          this._worTargetPoint.y +
          this._cachedProps.ballRadius -
          this._cachedProps.tipRadius
        ) / t.y
      );
    }
    isReadyToStroke() {
      return 0 === this._kissDirtyFlag && 1 === this._lerpFactor;
    }
    bind(t, e, i = null) {
      let s = !1;
      const n = this._cachedProps;
      let r = 0;
      const a = e[0].radius;
      if (
        (a !== n.ballRadius && ((s = !0), (n.ballRadius = a)),
        t.stickName !== n.stickName &&
          ((s = !0),
          (n.stickName = t.stickName),
          (n.tipRadius = t.specs.tipRadius),
          (n.midRadius = 0.5 * (t.specs.tipRadius + t.specs.buttRadius)),
          (n.stickLen = t.specs.len)),
        s)
      ) {
        ((n.ballNTipRadiusSq = Math.pow(n.ballRadius + n.tipRadius, 2)),
          (n.maxTipOffset = Math.min(0.6 * n.ballRadius, 0.99 * (n.ballRadius - n.midRadius))),
          (n.maxTipOffsetSq = n.maxTipOffset * n.maxTipOffset));
        let t = 0.5 * n.ballRadius + n.midRadius;
        (this._locSupportPoint.y !== t &&
          ((this._locSupportPoint.y = t), (r |= dependencies.xi.WOR_PROJECTION)),
          (r |=
            dependencies.xi.LOC_TIP |
            dependencies.xi.POTENTIAL_TOUCHES |
            dependencies.xi.CORRECTION));
      }
      ((this._balls = e),
        (r |= dependencies.xi.POTENTIAL_TOUCHES),
        this._cushionBody !== i &&
          ((this._cushionBody = i),
          i && (r |= dependencies.xi.POTENTIAL_TOUCHES | dependencies.xi.CORRECTION)),
        0 !== r && this._markKissDirty(r));
    }
    unbind() {
      ((this._balls = null), (this._potentialTouches.length = 0), (this._cushionBody = null));
    }
    resetAimPoint(t) {
      this._worTargetPoint.equals(t) ||
        (this._worTargetPoint.copyFrom(t),
        this._markKissDirty(
          dependencies.xi.ANGLE_H |
            dependencies.xi.WOR_TRANSFORM |
            dependencies.xi.POTENTIAL_TOUCHES,
        ));
    }
    setCtlPoint(t, e) {
      let i = this._worCtlPoint;
      (i.x === t && i.z === e) ||
        ((i.x = t), (i.z = e), this._markKissDirty(dependencies.xi.ANGLE_H));
    }
    setLocTip(t, e, i) {
      let s = this._locTipPoint;
      (s.z === t && s.y === e) ||
        ((s.z = t),
        (s.y = e),
        this._markKissDirty(dependencies.xi.LOC_TIP),
        i && this._lerpFactor > 0.4 && (this._lerpFactor *= 0.4));
    }
    moveLocTip(t, e) {
      return this.setLocTip(this._locTipPoint.z + t, this._locTipPoint.y + e, !0);
    }
    get maxTipOffset() {
      return this._cachedProps.maxTipOffset;
    }
    setAngleV(t, e) {
      let i = this._angleVRange;
      (t < i.min ? (t = i.min) : t > i.max && (t = i.max),
        t !== this._angleV &&
          ((this._angleV = t),
          this._markKissDirty(dependencies.xi.WOR_TRANSFORM),
          e && (this._lerpFactor *= 0.4)));
    }
    moveAngleV(t) {
      return this.setAngleV(t + this._angleV, !0);
    }
    _updateKissProps() {
      const t = Math.PI,
        e = dependencies.xi;
      let i = this._kissDirtyFlag,
        s = this._worTargetPoint,
        n = this._worCtlPoint,
        r = this._worTipPoint,
        a = this._worSupportPoint;
      if (((this._kissDirtyFlag = 0), i & e.ANGLE_H)) {
        let r = n.x - s.x,
          a = n.z - s.z,
          o = a / r;
        Math.abs(o - this._cachedSlopeH) > 1e-6 &&
          ((this._cachedSlopeH = o),
          (this._angleH = Math.atan2(-a, r) + t),
          (i |= e.WOR_TRANSFORM));
      }
      if (i & e.WOR_TRANSFORM) {
        let t = this._worTransform,
          n = Math.cos(this._angleH),
          r = Math.sin(this._angleH),
          a = Math.cos(-this._angleV),
          o = Math.sin(-this._angleV);
        ((t[0] = n * a),
          (t[1] = o),
          (t[2] = -a * r),
          (t[3] = 0),
          (t[4] = -n * o),
          (t[5] = a),
          (t[6] = o * r),
          (t[7] = 0),
          (t[8] = r),
          (t[9] = 0),
          (t[10] = n),
          (t[11] = 0),
          (t[12] = s.x),
          (t[13] = s.y),
          (t[14] = s.z),
          (t[15] = 1),
          (i |= e.WOR_PROJECTION));
      }
      if (i & e.LOC_TIP) {
        const t = this._cachedProps.maxTipOffsetSq;
        let s,
          n,
          r = this._locTipPoint.z,
          a = this._locTipPoint.y;
        (r * r + a * a > t &&
          ((s = Math.atan2(a, r)),
          (n = this._cachedProps.maxTipOffset),
          (this._locTipPoint.z = r = n * Math.cos(s)),
          (this._locTipPoint.y = a = n * Math.sin(s))),
          (this._tipMaxEscape = Math.sqrt(t - r * r) - a),
          (i |= e.WOR_PROJECTION));
      }
      if (
        (i & e.WOR_PROJECTION &&
          (dependencies.pi(this._locTipPoint, this._worTransform, r),
          dependencies.pi(this._locSupportPoint, this._worTransform, a),
          (i |= e.CORRECTION)),
        i & e.POTENTIAL_TOUCHES && (this._updatePotentialTouches(), (i |= e.CORRECTION)),
        i & e.CORRECTION)
      ) {
        if (this._correctWorTipAndSupportWithDetection()) {
          let t = 1 - Math.abs(a.y - this.lstWorSupportY) / 0.03;
          (t < 0.5 && (t = 0.5), this._lerpFactor > t && (this._lerpFactor *= t));
        }
        this.lstWorSupportY = a.y;
        let t = this._kissPoint,
          e = this._kissDir;
        (r.subtractToRef(a, e), e.normalize(), a.subtractToRef(s, t));
        let i = dependencies.di(e, 1, t, t.lengthSquared(), this._cachedProps.ballNTipRadiusSq);
        (t.copyFromFloats(a.x + i * e.x, a.y + i * e.y, a.z + i * e.z),
          this.onKissPropsChanged(t.x, t.y, t.z, e.x, e.y, e.z));
      }
    }
    updateAnimation(t) {
      const e = Math.PI;
      let i = this.animatedPosition,
        s = this.animatedRotation,
        n = this._rotation,
        r = this._position,
        a = this.needsUpdate;
      if (((this.needsUpdate = 0), 2 & a)) {
        const t = this.getKissDir(),
          i = this.getKissPoint();
        ((n.y = Math.atan2(t.x, t.z) - 0.5 * e),
          (n.z = Math.asin(t.y)),
          r.copyFromFloats(
            i.x + t.x * this._leadingSpace,
            i.y + t.y * this._leadingSpace,
            i.z + t.z * this._leadingSpace,
          ));
      }
      if (1 !== this._lerpFactor) {
        if (!((this._lerpFactor += 0.05) > 0.99)) {
          ((this.needsUpdate |= 1),
            (this._lerpFactor = this._lerpFactor * t + 1 - t),
            (i.x += (r.x - i.x) * this._lerpFactor),
            (i.y += (r.y - i.y) * this._lerpFactor),
            (i.z += (r.z - i.z) * this._lerpFactor),
            (s.x += (n.x - s.x) * this._lerpFactor),
            (s.z += (n.z - s.z) * this._lerpFactor));
          let a = n.y - s.y;
          return (
            a > e ? (a -= 2 * e) : a < -e && (a += 2 * e),
            (s.y += a * this._lerpFactor),
            this.needsUpdate
          );
        }
        this._lerpFactor = 1;
      }
      return (i.copyFrom(r), s.copyFrom(n), this.needsUpdate);
    }
    _updatePotentialTouches() {
      const t = this._cachedProps,
        e = this._balls;
      let i,
        _n,
        r = this._potentialTouches,
        a = t.stickLen + t.ballRadius + 0.1,
        o = a * a,
        l = this._worTargetPoint;
      if (((r.length = 0), e))
        for (let t = 0, a = e.length; t !== a; ++t)
          (i = e[t]).active &&
            0 !== i.number &&
            (_n = dependencies.Babylon.Vector3.DistanceSquared(l, i.position)) < o &&
            r.push(i);
      this._cushionBody && this._cushionBody.filter(this._worTargetPoint, a);
    }
    _correctWorTipAndSupportWithDetection() {
      let t,
        e,
        i,
        s,
        n = this._worTipPoint,
        r = this._worSupportPoint,
        a = this._cachedProps.ballRadius,
        o = this._cachedProps.midRadius,
        l = dependencies.mi.subVectors(r, n),
        h = dependencies.gi,
        c = dependencies.fi.setWithPointAnd2Dirs(n, l, h);
      if (c.isZeroNormal()) return !1;
      let d = dependencies.yi.crossVectors(c.normal, l).normalize(),
        u = dependencies.bi.empty();
      if (
        (dependencies._i(n, l, c, d, o, a, this._potentialTouches, u),
        this._cushionBody && this._cushionBody.detect(n, l, o, u),
        u.length > 0)
      ) {
        for (t = dependencies.ci, e = 0, i = 0, s = u.length; i !== s; ++i)
          u.array[i].escape > e && (e = u.array[i].escape);
        if (e - this._tipMaxEscape <= t)
          (d.scale(e),
            (n.x += d.x),
            (n.y += d.y),
            (n.z += d.z),
            (r.x += d.x),
            (r.y += d.y),
            (r.z += d.z));
        else {
          (e = this._tipMaxEscape) > t && ((n.x += e * d.x), (n.y += e * d.y), (n.z += e * d.z));
          let a = 0.5 * Math.PI,
            o = l;
          for (i = 0, s = u.length; i !== s; ++i) {
            let t = u.array[i];
            o.subVectors(t.center, n);
            let e = o.length(),
              s = Math.acos(o.dot(h) / e) - Math.asin(t.radius / e);
            s < a && (a = s);
          }
          let _ = dependencies.vi.setFromAngleAxis(c.normal, -a),
            p = l.vectorApplyQuaternion(_, h).scale(-this._locSupportPoint.x);
          ((r.x = n.x + p.x), (r.y = n.y + p.y), (r.z = n.z + p.z));
        }
        return !0;
      }
      return !1;
    }
  };
}
