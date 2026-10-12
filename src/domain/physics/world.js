export default function worldModule(module, exports, loadModule) {
  'use strict';
  const IslandList = loadModule('domain/physics/island-list'),
    ObjectPool = loadModule('domain/physics/object-pool'),
    BallContact = loadModule('domain/physics/ball-contact'),
    BallSurfaceContact = loadModule('domain/physics/ball-surface-contact'),
    o = (loadModule('domain/physics/ball-body'), loadModule('domain/physics/rigid-body')),
    Contact = loadModule('domain/physics/contact'),
    CollisionStack = loadModule('domain/physics/collision-stack'),
    PhysicsConstants = loadModule('domain/physics/physics-constants'),
    ContactSolver = loadModule('domain/physics/contact-solver'),
    BallMotion = loadModule('domain/physics/ball-motion'),
    PhysicsMonitor = loadModule('shared/diagnostics/physics-monitor'),
    CueTipContact = loadModule('domain/physics/cue-tip-contact'),
    f = (t) => {},
    g = (t) => {};
  module.exports = class World {
    get stepSize() {
      return this._stepSize;
    }
    set stepSize(t) {
      this._stepSize !== t &&
        ((this._stepSize = t),
        (o.minEnergy =
          Math.round(
            PhysicsConstants.gravity.length() * t * (1 - Math.pow(o.baseSleepBias, t)) * 0.5 * 1e3,
          ) / 1e3),
        (o.maxEnergy = 4.5 * o.minEnergy),
        (o.wakeUpEnergy = 1.4 * o.minEnergy),
        Contact.gt.scaleVector(2.3 * t, PhysicsConstants.gravity));
    }
    get environmentReady() {
      return this._environmentReady;
    }
    get timestamp() {
      throw new Error('No more timestamp, use evolution');
    }
    get evolution() {
      return this._evolution;
    }
    constructor() {
      ((this.accumulator = 0),
        (this.meshBody = null),
        (this.balls = []),
        (this.qCDSP = []),
        (this.qCDSS = []),
        (this.ssSkips = []),
        (this.p2a = []),
        (this.rechecks = []),
        (this.nRechecks = 0),
        (this.cActings = new IslandList(44)),
        (this.cPendings = new CollisionStack()),
        (this.spPool = new ObjectPool('sp', BallContact, 70)),
        (this.ssPool = new ObjectPool('ss', BallSurfaceContact, 70)),
        (this._environmentReady = !1),
        (this.internalStep = this.__internalStep_error),
        (this.nAwakened = 0),
        (this.touchPresolveHandler = f),
        (this.outOfBoundsHandler = g),
        (this.useStrictMode = !0),
        (this.solver = ContactSolver.sharedInstance),
        (this.lowestBoundY = -Number.MAX_VALUE),
        (this._maxSteps = 10),
        (this.stepSize = 0.0167),
        (this._evolution = 0));
    }
    static makeSerialData() {
      let t = Object.create(null);
      return ((t.balls = []), (t.mbid = ''), (t.evolution = 0), t);
    }
    static copySerialDataAToB(t, e) {
      ((e.evolution = t.evolution), (e.mbid = t.mbid));
      for (let i = 0, s = t.balls.length; i !== s; ++i) e.balls[i] = t.balls[i];
      e.balls.length = t.balls.length;
    }
    onTouchPresolve(t) {
      void 0 !== t && (this.touchPresolveHandler = t);
    }
    onOutOfBounds(t) {
      void 0 !== t && (this.outOfBoundsHandler = t);
    }
    clearCallbacks() {
      ((this.touchPresolveHandler = f), (this.outOfBoundsHandler = g));
    }
    shoot(t, e) {
      (this.tipContact || (this.tipContact = new CueTipContact(0.15)),
        this.tipContact.resetTip(t, e),
        this.solver.solveContact(this.tipContact),
        this.tipContact.free(),
        t.wakeUp());
    }
    _breakEnvironment() {
      ((this._environmentReady = !1),
        (this.internalStep = this.__internalStep_error),
        this.cPendings.freeAll(),
        this.cActings.freeAll(),
        this.spPool.freeAll(),
        this.ssPool.freeAll(),
        (this.qCDSP.length = 0),
        (this.qCDSS.length = 0),
        (this.ssSkips.length = 0),
        (this.p2a.length = 0));
    }
    _rebuildEnvironment() {
      this._environmentReady = !0;
      let t = this.balls,
        e = this.meshBody.nPolygons,
        i = e;
      for (let i = 0, s = t.length; i !== s; ++i)
        ((t[i].uid = e++), PhysicsConstants.setBallFrictionAndRestitution(t[i]));
      (this.cActings.resize(e, i), (this.internalStep = this.__internalStep__));
    }
    emptyMeshBody() {
      (this._environmentReady && this._breakEnvironment(), (this.meshBody = null));
    }
    emptyBalls() {
      this._environmentReady && this._breakEnvironment();
      for (let t = 0, e = this.balls.length; t !== e; ++t) this.balls[t].dispose();
      this.balls.length = 0;
    }
    reset() {
      let t = this.balls,
        e = this.meshBody;
      if (this._environmentReady) {
        if (
          (this.cPendings.freeAll(),
          this.cActings.freeAll(),
          this.spPool.freeAll(),
          this.ssPool.freeAll(),
          0 !== this.nRechecks)
        )
          throw new Error('logic error: nRechecks not zero when reset');
      } else this._rebuildEnvironment();
      (BallMotion.initIslands(t, e, this.cActings, this.ssPool, this.spPool), this._evolution++);
    }
    serialize(t) {
      if (!this._environmentReady)
        throw new Error('serialize should be called after environmentReady');
      t.balls.length = 0;
      const e = this.balls;
      for (let i = 0, s = e.length; i !== s; ++i) e[i].serialize(t.balls);
      return ((t.evolution = this._evolution), (t.mbid = this.meshBody.id), t);
    }
    deserialize(t) {
      if (!this._environmentReady)
        throw new Error('deserialize should be called after environmentReady');
      if (t.mbid !== this.meshBody.id)
        throw new Error(
          'deserialize data error: mbid not match: ' + t.mbid + ', ' + this.meshBody.id,
        );
      const e = this.balls;
      this.nAwakened = 0;
      let i = 0;
      for (let s = 0, n = e.length; s !== n; ++s)
        ((i = e[s].deserialize(t.balls, i)), e[s].active && !e[s].asleep && this.nAwakened++);
      (this.reset(), (this._evolution = t.evolution));
    }
    addBall(t) {
      if (this._environmentReady) throw new Error('addBall after environmentReady');
      this.balls.push(t);
    }
    setMeshBody(t) {
      if (this._environmentReady) throw new Error('setMeshBody after environmentReady');
      ((this.meshBody = t), (this.lowestBoundY = t.lowestPosition.y));
    }
    inactivateBall(t) {
      if (!t.active) return;
      let e = t.uid;
      ((t.active = !1), this.cActings.removeAllContactsWithId(e));
      let i,
        s = this.cPendings.stack;
      for (let t = 0, n = s.length; t !== n; ++t)
        ((i = s[t]).idi !== e && i.idj !== e) || (i.markedAsKilled = !0);
    }
    step(t) {
      (PhysicsMonitor.clear(), PhysicsMonitor.startTick('step'));
      let e = this._stepSize,
        i = this._maxSteps,
        s = 0;
      for (this.accumulator += t; this.accumulator >= e && s < i; )
        ((this.accumulator -= e), s++, this.internalStep());
      if (0 === s) {
        this.nAwakened = 0;
        let t = this.balls;
        for (let e = 0, i = t.length; e !== i; ++e) t[e].active && !t[e].asleep && this.nAwakened++;
      }
      return (
        PhysicsMonitor.count('nSteps', s),
        PhysicsMonitor.count('nIslands', this.cActings.nIslands),
        PhysicsMonitor.count('nPendings', this.cPendings.length),
        PhysicsMonitor.count('nAwakened', this.nAwakened),
        PhysicsMonitor.stopTick('step'),
        PhysicsMonitor.end(),
        s * e
      );
    }
    markRecheck(t) {
      (this.nRechecks++, this.rechecks.push(t));
    }
    flushRechecks(t, e) {
      let i,
        s = this.rechecks,
        n = this.cPendings,
        r = BallMotion;
      for (let a = 0, o = s.length; a !== o; ++a)
        if ((i = s[a]).isOutdated()) i.free();
        else if (i.isSS) {
          if (
            !i.bi.active ||
            !i.bj.active ||
            -1 !== t.indexOf(i.bi) ||
            -1 !== t.indexOf(i.bj) ||
            (0 === i.bi.vState && 0 === i.bj.vState) ||
            !r.ccdSS(i.bi, i.bj, e, i)
          ) {
            i.free();
            continue;
          }
          n.add(i);
        } else
          i.bi.active && 0 !== i.bi.vState && r.ccdSP(i.bi, i.bj, Number.MAX_VALUE, i)
            ? n.add(i)
            : i.free();
      ((s.length = 0), (this.nRechecks = 0));
    }
    __internalStep_error() {
      throw new Error('Reset should be called explicitly before any simulation start');
    }
    __internalStep__() {
      let t = this.balls,
        e = this.cActings,
        i = this.cPendings,
        s = BallMotion,
        n = this.solver,
        r = this.ssPool,
        a = this.spPool,
        l = this.p2a,
        h = this.qCDSP,
        d = this.qCDSS,
        p = this.ssSkips,
        f = PhysicsConstants.islandUpdMinDisSq,
        g = o.vStates.ZERO,
        m = o.vStates.SLOWER,
        y = null,
        v = null,
        b = this.useStrictMode,
        x = 0,
        S = 0,
        C = 0,
        I = 0,
        T = this._stepSize;
      (PhysicsMonitor.count('internalStep', 1),
        this._evolution++,
        b ? i.removeAllSS() : (g = m),
        s.updateIslands(e, !0));
      for (let e = 0, i = t.length; e !== i; ++e) t[e].active && t[e].predVelocities(T);
      n.solveList(e, !0);
      for (let e = 0, i = t.length; e !== i; ++e)
        (y = t[e]).active &&
          (y.vState > m ? (y.cdRound++, h.push(y), d.push(y)) : y.vState > g && d.push(y));
      for (; x < T || h.length; ) {
        if (((S = T - x), (C = b ? S : Number.MAX_VALUE), ++I > 100))
          throw new Error('Loop overflow: ' + I);
        if ((PhysicsMonitor.count('iteration', 1), 0 !== h.length)) {
          for (let t = 0, n = h.length; t < n; ++t) s.updateSPToi(h[t], this.meshBody, a, e, i);
          h.length = 0;
        }
        if ((this.nRechecks && this.flushRechecks(d, C), 0 !== d.length)) {
          for (let n = 0, a = d.length; n < a; ++n)
            (s.updateSSToi(d[n], t, r, e, p, C, i), p.push(d[n].uid));
          ((d.length = 0), (p.length = 0));
        }
        if (
          (PhysicsMonitor.startTick('pending_step'),
          (S = i.step2(S, l)),
          PhysicsMonitor.stopTick('pending_step'),
          0 === l.length)
        ) {
          this.nAwakened = 0;
          let e = this.lowestBoundY;
          for (let i = 0, s = t.length; i !== s; ++i)
            t[i].active &&
              (t[i].step(S) || this.nAwakened++,
              t[i].position.y < e && (this.inactivateBall(t[i]), this.outOfBoundsHandler(t[i])));
          0 === this.nAwakened && (i.freeAll(), (this.accumulator = 0));
          break;
        }
        if (S > 0) {
          ((x += S), (this.nAwakened = 0));
          for (let e = 0, i = t.length; e !== i; ++e)
            t[e].active && !t[e].step(S) && this.nAwakened++;
          for (let t = 0, i = l.length; t !== i; ++t)
            ((v = l[t]).bi.steppedLenSq > f && e.markReupdate(v.idi),
              v.isSS && v.bj.steppedLenSq > f && e.markReupdate(v.idj));
          s.updateIslands(e, !1);
          for (let e = 0, i = t.length; e !== i; ++e)
            (y = t[e]).active && y.predictionDirty && t[e].predVelocities(T - x);
        }
        for (let t = 0, i = l.length; t !== i; ++t)
          !(v = l[t]).bi.active || (v.isSS && !v.bj.active)
            ? v.free()
            : 0 === v.life
              ? (e.add(v), v.startResting(), this.touchPresolveHandler(v))
              : this.markRecheck(v);
        ((l.length = 0), n.solveList(e, !1));
        for (let e = 0, s = t.length; e !== s; ++e)
          (y = t[e]).active &&
            (y.vState > m
              ? (y.cdRound++, h.push(y), d.push(y))
              : y.vState > g && (i.outdateAllSSWithId(y.uid), d.push(y)));
      }
    }
  };
}
