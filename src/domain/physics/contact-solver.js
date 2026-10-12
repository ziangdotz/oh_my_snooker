export default function contactSolverModule(module, exports, loadModule) {
  'use strict';
  const PhysicsMonitor = loadModule('shared/diagnostics/physics-monitor'),
    VectorThree = loadModule('domain/math/vector-three'),
    r = VectorThree.EPSILON,
    a = new VectorThree(),
    o = new VectorThree(),
    l = new VectorThree(),
    h = new VectorThree(),
    c = new VectorThree();
  class ContactSolver {
    constructor() {
      this.maxIter = 4;
    }
    solveContact(t) {
      let e = t.transformLocVel2Imp,
        i = t.spaceTransformL2W,
        s = a,
        n = -1 - t.restitution;
      i.transformTranspose(t.getRelativeVelocity(), s);
      let r = s.x >= t.bounceThreshold ? -s.x : n * s.x,
        c = o.set(r, -s.y, -s.z),
        d = l,
        u = h;
      e.transform(c, d);
      let _ = Math.sqrt(d.y * d.y + d.z * d.z),
        p = d.x * t.friction;
      if (_ > p) {
        let t = p / _;
        ((d.y *= t), (d.z *= t));
      }
      ((p = d.x * t.rollingFriction),
        i.transform(d, u),
        t.bi.applyImpulseAtPoint(u, t.armI, p / t.armLenI),
        t.isSS && (u.scale(-1), t.bj.applyImpulseAtPoint(u, t.armJ, p / t.armLenJ)));
    }
    solveList(t, e) {
      PhysicsMonitor.startTick('solve');
      let i = t.entry;
      if (e) for (; i; ) (this.solveIsland(i), (i = i.next));
      else for (; i; ) (i.dirty && this.solveIsland(i), (i = i.next));
      PhysicsMonitor.stopTick('solve');
    }
    solveIsland(t) {
      t.dirty = !1;
      for (let e = 0, i = this.maxIter; e !== i && !this._solveMostUrgentChildren(t); ++e);
      this._sloveChildrenPene(t);
    }
    _solveMostUrgentChildren(t) {
      const e = r;
      let i, n, a, o;
      if (1 === t.totalItems)
        return (
          (i = t.itemEntry).getCloseSpeed() < -e &&
            (this.solveContact(i), PhysicsMonitor.count('nSolvedCts', 1)),
          !0
        );
      for (let r = 0, l = t.totalItems; r !== l; ++r) {
        for (i = t.itemEntry, n = 0, o = null; i; )
          ((a = i.getCloseSpeed()) < n && ((n = a), (o = i)), (i = i.next));
        if (!(o && n < -e)) return !0;
        (this.solveContact(o), PhysicsMonitor.count('nSolvedCts', 1));
      }
      return !1;
    }
    _sloveChildrenPene(t) {
      const e = r;
      let i = t.itemEntry,
        s = c;
      for (; i; ) {
        if (i.penetration < -e) {
          let t = i.penetration;
          (s.scaleVector(0.5 * -t, i.normal),
            i.bi.addPeneOffset(t, s),
            i.isSS && i.bj.addPeneOffset(t, s.scale(-1)));
        }
        i = i.next;
      }
    }
  }
  ((ContactSolver.sharedInstance = new ContactSolver()), (module.exports = ContactSolver));
}
