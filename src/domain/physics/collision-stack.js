export default function collisionStackModule(module, exports, loadModule) {
  const s = loadModule('domain/physics/physics-constants').tPrecision;
  class CollisionStack {
    get length() {
      return this.stack.length;
    }
    constructor() {
      ((this.__stack1 = []),
        (this.__stack2 = []),
        (this.stack = this.__stack1),
        (this.idleStack = this.__stack2),
        (this.__stackOrderDirty = !1));
    }
    freeAll() {
      let t = this.stack;
      for (let e = 0, i = t.length; e !== i; ++e) t[e].free();
      ((t.length = 0), (this.__stackOrderDirty = !1));
    }
    add(t) {
      ((t.markedAsKilled = !1), (this.__stackOrderDirty = !0), this.stack.push(t));
    }
    removeAllSS() {
      let t,
        e = this.stack,
        i = this.idleStack,
        s = -1;
      for (let n = 0, r = e.length; n !== r; ++n) (t = e[n]).isSS ? t.free() : (i[++s] = t);
      ((e.length = 0), (this.stack = i), (this.idleStack = e));
    }
    outdateAllSSWithId(t) {
      let e = this.stack,
        i = null;
      for (let s = 0, n = e.length; s !== n; ++s)
        !(i = e[s]).isSS || (i.idi !== t && i.idj !== t) || (i.markedAsKilled = !0);
    }
    resort() {
      this.__stackOrderDirty = !1;
      let t,
        e = this.stack,
        i = this.idleStack,
        s = -1;
      for (let n = 0, r = e.length; n !== r; ++n) (t = e[n]).isOutdated() ? t.free() : (i[++s] = t);
      ((e.length = 0), i.sort(CollisionStack.TOISorter), (this.stack = i), (this.idleStack = e));
    }
    step2(t, e) {
      let i,
        n,
        r,
        a,
        o = s,
        l = !1,
        h = t;
      if (this.__stackOrderDirty)
        for (this.resort(), a = n = (i = this.stack).length; a > 0 && (r = i[--a]).toi <= h; )
          (e.push(r), n--, l || ((l = !0), (h = Math.min(t, r.toi + o))));
      else
        for (a = n = (i = this.stack).length; a > 0; )
          if ((r = i[--a]).isOutdated()) (r.free(), n--);
          else {
            if (!(r.toi <= h)) break;
            (e.push(r), n--, l || ((l = !0), (h = Math.min(t, r.toi + o))));
          }
      if (((i.length = n), 0 !== e.length && (t = e[e.length - 1].toi), t > 0))
        for (let e = 0, s = i.length; e !== s; ++e) (((r = i[e]).toi -= t), (r.life += t));
      return t;
    }
    log(t, e) {
      let i = '',
        s = 0;
      if (void 0 === e)
        for (let e = 0, n = this.stack.length; e !== n; ++e) {
          let n = this.stack[e];
          (t && n.isOutdated()) || ((i += n.toString() + '\n'), s++);
        }
      else
        for (let n = 0, r = this.stack.length; n !== r; ++n) {
          let r = this.stack[n];
          (t && r.isOutdated()) ||
            (-1 === e.indexOf(r.idi) && -1 === e.indexOf(r.idj)) ||
            ((i += r.toString() + '\n'), s++);
        }
      0 === s
        ? console.log('Not found.')
        : (console.log('--- LOG STACK:(' + s + '/' + this.stack.length + ') -------------------'),
          console.log(i + '\n/////////////////////////////////////'));
    }
  }
  ((CollisionStack.TOISorter = function (t, e) {
    let i = e.toi - t.toi;
    return 0 !== i ? i : e.penetration - t.penetration;
  }),
    (module.exports = CollisionStack));
}
