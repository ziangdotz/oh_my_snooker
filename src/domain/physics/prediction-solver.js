export default function predictionSolverModule(module, exports, loadModule) {
  'use strict';
  const ContactSolver = loadModule('domain/physics/contact-solver'),
    n = loadModule('domain/math/vector-three').EPSILON;
  class PredictionSolver extends ContactSolver {
    constructor() {
      (super(), (this.callback = null), (this.interrupt = !1));
    }
    reset(t) {
      this.callback = t;
    }
    solveList(t, e) {
      if (this.interrupt) return;
      let i = t.entry;
      if (e)
        for (; i; ) {
          if ((this.solveIsland(i), this.interrupt)) return;
          i = i.next;
        }
      else
        for (; i; ) {
          if (i.dirty && (this.solveIsland(i), this.interrupt)) return;
          i = i.next;
        }
    }
    solveIsland(t) {
      t.dirty = !1;
      for (let e = 0, i = this.maxIter; e !== i && !this._solveMostUrgentChildren(t); ++e);
      this._sloveChildrenPene(t);
    }
    _solveMostUrgentChildren(t) {
      const e = n;
      let i, s, r, a;
      if (1 === t.totalItems)
        return (
          !((i = t.itemEntry).getCloseSpeed() < -e && (this.solveContact(i), this.callback(i))) ||
          ((this.interrupt = !0), !0)
        );
      for (let n = 0, o = t.totalItems; n !== o; ++n) {
        for (i = t.itemEntry, s = 0, a = null; i; )
          ((r = i.getCloseSpeed()) < s && ((s = r), (a = i)), (i = i.next));
        if (!(a && s < -e)) return !0;
        if ((this.solveContact(a), this.callback(a))) return ((this.interrupt = !0), !0);
      }
      return !1;
    }
  }
  ((PredictionSolver.sharedInstance = new PredictionSolver()), (module.exports = PredictionSolver));
}
