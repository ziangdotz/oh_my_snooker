export default function collisionIslandModule(module, exports, loadModule) {
  'use strict';
  module.exports = class CollisionIsland {
    constructor(t, e) {
      ((this.weakParent = t),
        (this.id = e),
        (this.inUse = !1),
        (this.itemEntry = null),
        (this.itemTail = null),
        (this.next = null),
        (this.prev = null),
        (this.totalItems = 0),
        (this.dirty = !1),
        (this.needsUpdate = !1),
        (this.needsPure = !1));
    }
    activate() {
      return ((this.inUse = !0), this);
    }
    getGroundContact(t) {
      let e = this.itemEntry;
      for (; e; ) {
        if (!e.isSS && e.idi === t && e.bj.ground) return e;
        e = e.next;
      }
      return null;
    }
    free() {
      ((this.next = null),
        (this.prev = null),
        (this.itemEntry = null),
        (this.itemTail = null),
        (this.totalItems = 0),
        (this.inUse = !1),
        (this.dirty = !1),
        (this.needsUpdate = !1),
        (this.needsPure = !1),
        this.weakParent.freeIndex(this.id));
    }
    dispose() {
      ((this.weakParent = null),
        (this.next = null),
        (this.prev = null),
        (this.itemEntry = null),
        (this.itemTail = null),
        console.warn("TODO: Island.dispose doesn't confirmed!!!"));
    }
    setEntry(t) {
      ((t.next = null),
        (t.prev = null),
        (this.itemEntry = this.itemTail = t),
        (this.totalItems = 1),
        (this.dirty = !0));
    }
    remove(t) {
      let e = t.prev,
        i = t.next;
      (e ? (e.next = i) : (this.itemEntry = i),
        i ? (i.prev = e) : (this.itemTail = e),
        (this.dirty = !0),
        this.totalItems--,
        (t.prev = null),
        (t.next = null));
    }
    push(t) {
      ((this.itemTail.next = t),
        (t.prev = this.itemTail),
        (t.next = null),
        (this.itemTail = t),
        this.totalItems++,
        (this.dirty = !0));
    }
    merge(t) {
      ((this.itemTail.next = t.itemEntry),
        (t.itemEntry.prev = this.itemTail),
        (this.itemTail = t.itemTail),
        (this.totalItems += t.totalItems),
        (this.dirty = !0));
    }
    toString() {
      let t = this.itemEntry;
      if (t) {
        let e = 'Island ' + this.id + ': {count:' + this.totalItems + ', items:[' + t.label;
        for (t = t.next; t; ) ((e += ',' + t.label), (t = t.next));
        return e + '], tail: ' + this.itemTail.label + '}';
      }
      return 'Island ' + this.id + ': {count:0, items:[]}';
    }
  };
}
