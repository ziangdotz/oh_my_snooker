export default function islandListModule(module, exports, loadModule) {
  'use strict';
  const ObjectPool = loadModule('domain/physics/object-pool'),
    CollisionIsland = loadModule('domain/physics/collision-island'),
    r = loadModule('domain/math/vector-three').EPSILON,
    a = [];
  module.exports = class IslandList {
    get entry() {
      return (this.needsPure && this.__pureIslands(), this.__entry);
    }
    get tail() {
      return (this.needsPure && this.__pureIslands(), this.__tail);
    }
    constructor(t) {
      ((this.pool = new ObjectPool('island', CollisionIsland, t)),
        (this.__entry = null),
        (this.__tail = null),
        (this.idMap = null),
        (this.__pureMap = null),
        (this.ssIdCounter = null),
        (this.restingGrid = []),
        (this.width = 0),
        (this.height = 0),
        (this.dataWidth = 0),
        (this.dataHeight = 0),
        (this.ssIdStart = 0),
        (this.nIslands = 0),
        (this.totalItems = 0),
        (this.needsPure = !1));
    }
    resize(t, e) {
      this.ssIdStart = e;
      let i = t,
        s = t - e,
        n = !1;
      if (
        (s > this.dataHeight &&
          ((n = !0),
          (this.dataHeight = s),
          (this.idMap = new Int8Array(s)),
          (this.__pureMap = new Int8Array(s)),
          (this.ssIdCounter = new Uint8Array(s))),
        i > this.dataWidth && ((n = !0), (this.dataWidth = i)),
        n)
      ) {
        let t = this.restingGrid;
        t.length = 0;
        for (let e = 0, n = s; e !== n; ++e) t[e] = new Uint8Array(i);
      }
      ((this.width = i), (this.height = s), this.freeAll());
    }
    freeAll() {
      (this.pool.freeAll(), (this.__entry = null), (this.__tail = null));
      let t = this.width,
        e = this.height,
        i = this.idMap;
      for (let t = 0; t !== e; ++t) i[t] = -1;
      let s = this.ssIdCounter;
      for (let t = 0; t !== e; ++t) s[t] = 0;
      let n = this.restingGrid;
      for (let i = 0; i !== e; ++i) {
        let e = n[i];
        for (let i = 0; i !== t; ++i) e[i] = 0;
      }
      ((this.nIslands = 0), (this.totalItems = 0), (this.needsUpdate = !1));
    }
    isResting(t, e) {
      {
        let i = this.restingGrid[t - this.ssIdStart][e];
        if (0 !== i && 1 !== i)
          throw (this.log(), new Error('resting grid error: ' + i + 'idi,idj: ' + t + '->' + e));
        return 0 !== i;
      }
    }
    markReupdate(t) {
      this.needsPure && this.__pureIslands();
      let e = this.pool.indexAt(this.idMap[t - this.ssIdStart]);
      e && (e.needsUpdate = !0);
    }
    getNContacts(t) {
      return this.ssIdCounter[t - this.ssIdStart];
    }
    getIslandByIdi(t) {
      let e = this.idMap[t - this.ssIdStart];
      return -1 !== e ? this.pool.indexAt(e) : null;
    }
    add(t) {
      ((t.markedAsKilled = !1), t.isSS ? this.__addSS(t) : this.__addSP(t), this.totalItems++);
    }
    __addSP(t) {
      this.needsPure && this.__pureIslands();
      let e,
        i = this.idMap,
        s = t.idi - this.ssIdStart,
        n = i[s];
      (this.ssIdCounter[s]++,
        this.restingGrid[s][t.idj]++,
        -1 !== n
          ? (e = this.pool.indexAt(n)).push(t)
          : ((e = this.pool.acquire()).setEntry(t),
            (i[s] = e.id),
            this.__tail
              ? ((this.__tail.next = e), (e.prev = this.__tail), (this.__tail = e))
              : ((this.__entry = e), (this.__tail = e)),
            this.nIslands++));
    }
    __addSS(t) {
      this.needsPure && this.__pureIslands();
      let e = this.idMap,
        i = this.pool,
        s = t.idi - this.ssIdStart,
        n = t.idj - this.ssIdStart,
        r = e[s],
        a = e[n];
      if (
        (this.ssIdCounter[s]++,
        this.ssIdCounter[n]++,
        this.restingGrid[s][t.idj]++,
        this.restingGrid[n][t.idi]++,
        -1 !== r)
      ) {
        let s = i.indexAt(r);
        if (-1 !== a && r !== a) {
          let t = i.indexAt(a);
          (s.merge(t), this.__removeIsland(t));
          for (let t = 0, i = this.height; t !== i; ++t) e[t] === a && (e[t] = r);
        } else e[n] = r;
        s.push(t);
      } else if (-1 !== a) (i.indexAt(a).push(t), (e[s] = a));
      else {
        let i = this.pool.acquire();
        (i.setEntry(t),
          (e[s] = i.id),
          (e[n] = i.id),
          this.__tail
            ? ((this.__tail.next = i), (i.prev = this.__tail), (this.__tail = i))
            : ((this.__entry = i), (this.__tail = i)),
          this.nIslands++);
      }
    }
    __removeIsland(t) {
      let e = t.prev,
        i = t.next;
      (e ? (e.next = i) : (this.__entry = i),
        i ? (i.prev = e) : (this.__tail = e),
        this.nIslands--,
        t.free());
    }
    __pureIslands() {
      this.needsPure = !1;
      let t = this.__entry;
      for (; t; ) (t.needsPure && this.__pureIsland(t), (t = t.next));
    }
    removeAllContactsWithId(t) {
      let e = this.idMap,
        i = this.ssIdStart,
        s = t - i,
        n = this.ssIdCounter;
      if (-1 === e[s]) {
        if (0 !== n[s]) throw new Error('HERER>>>>');
        return;
      }
      let r = this.pool.indexAt(e[s]),
        a = this.restingGrid,
        o = r.itemEntry,
        l = null,
        h = -1;
      for (; o; )
        ((l = o.next),
          o.idi === t
            ? (this.totalItems--,
              a[s][o.idj]--,
              r.remove(o),
              o.free(),
              o.isSS && (a[(h = o.idj - i)][t]--, 0 == --n[h] && (e[h] = -1)))
            : o.idj === t &&
              (this.totalItems--,
              a[s][o.idi]--,
              r.remove(o),
              o.free(),
              a[(h = o.idi - i)][t]--,
              0 == --n[h] && (e[h] = -1)),
          (o = l));
      ((n[s] = 0),
        (e[s] = -1),
        0 === r.totalItems
          ? this.__removeIsland(r)
          : r.totalItems > 1 && ((r.needsPure = !0), (this.needsPure = !0)));
    }
    remove(t, e) {
      this.totalItems--;
      let i = this.idMap,
        s = t.idi - this.ssIdStart,
        n = this.pool.indexAt(i[s]),
        r = this.ssIdCounter,
        a = this.restingGrid;
      if ((n.remove(t), t.isSS)) {
        let e = t.idj - this.ssIdStart,
          o = !0;
        (a[s][t.idj]--,
          a[e][t.idi]--,
          0 == --r[s] && ((i[s] = -1), (o = !1)),
          0 == --r[e] && ((i[e] = -1), (o = !1)),
          0 === n.totalItems
            ? this.__removeIsland(n)
            : o && ((n.needsPure = !0), (this.needsPure = !0)));
      } else
        (a[s][t.idj]--, 0 == --r[s] && (i[s] = -1), 0 === n.totalItems && this.__removeIsland(n));
      e && t.free();
    }
    __pureIsland(t) {
      let e,
        i,
        s = this.__pureMap,
        n = this.idMap,
        r = a,
        o = t.itemEntry,
        l = 0,
        h = 0,
        c = 0,
        d = this.ssIdStart,
        u = 0,
        _ = 0;
      for (let t = 0, e = this.height; t !== e; ++t) s[t] = -1;
      for (r[h] = t; o; ) {
        for (
          c = t.id,
            s[(u = o.idi - d)] = h,
            n[u] = c,
            o.isSS && ((s[(_ = o.idj - d)] = h), (n[_] = c)),
            e = o,
            i = o.next,
            l = 1;
          i;

        ) {
          if (((u = i.idi - d), (_ = i.idj - d), s[u] === h))
            ((n[u] = c), i.isSS && ((s[_] = h), (n[_] = c)), (e = i), l++);
          else {
            if (s[_] !== h) break;
            ((s[u] = h), (n[u] = c), (n[_] = c), (e = i), l++);
          }
          i = i.next;
        }
        for (i = e.next; i; )
          ((u = i.idi - d),
            (_ = i.idj - d),
            (s[u] !== h && s[_] !== h) ||
              ((s[u] = h),
              (n[u] = c),
              i.isSS && ((s[_] = h), (n[_] = c)),
              (i.prev.next = i.next),
              i.next && (i.next.prev = i.prev),
              e.next && (e.next.prev = i),
              (i.next = e.next),
              (e.next = i),
              (i.prev = e),
              (e = i),
              l++),
            (i = i.next));
        ((i = e.next),
          (o.prev = null),
          (e.next = null),
          (t.itemEntry = o),
          (t.itemTail = e),
          (t.totalItems = l),
          (t.needsPure = !1),
          (o = i) && (r[++h] = t = this.pool.acquire()));
      }
      for (let e = 1, i = r.length; e < i; ++e)
        ((t = r[e]),
          (this.__tail.next = t),
          (t.prev = this.__tail),
          (this.__tail = t),
          (t.dirty = !0),
          this.nIslands++);
      r.length = 0;
    }
    logIslandByIds(t) {
      let e = this.entry,
        i = this.ssIdStart,
        s = '',
        n = 0;
      for (; e; ) {
        let r = e.itemEntry;
        for (; r; ) {
          if (-1 !== t.indexOf(r.idi - i) || -1 !== t.indexOf(r.idj - i)) {
            ((s += e.toString() + '\n'), n++);
            break;
          }
          r = r.next;
        }
        e = e.next;
      }
      (console.log('--- Island List:(' + n + ') ----------------'),
        console.log(s),
        console.log('/////////////////////////////////////'));
    }
    logPenes() {
      let t = this.entry,
        e = r,
        i = 0;
      for (; t; ) {
        let s = t.itemEntry;
        for (; s; )
          (s.penetration < -e && (console.log('pene: ' + s.penetration + ',' + s.label), i++),
            (s = s.next));
        t = t.next;
      }
      console.log('pene in island: ' + i);
    }
    log(t) {
      console.log('--- Island List:(' + this.nIslands + ') ----------------');
      let e = this.entry,
        i = this.ssIdStart;
      for (; e; ) (console.log('\t>' + e.toString()), (e = e.next));
      let s = [];
      for (let t = 0, e = this.height; t !== e; ++t)
        0 !== this.ssIdCounter[t] && s.push(t + i + '(' + this.ssIdCounter[t] + ')');
      (console.log('\tcounter: [' + s.join(',') + ']'),
        t && (console.log('\n'), this.pool.log()),
        console.log('/////////////////////////////////////'));
    }
  };
}
