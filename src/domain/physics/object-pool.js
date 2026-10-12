export default function objectPoolModule(module, exports, loadModule) {
  'use strict';
  module.exports = class ObjectPool {
    get size() {
      return this.pool.length;
    }
    get nInUse() {
      let t = this.pool,
        e = 0;
      for (let i = 0, s = t.length; i !== s; ++i) t[i].inUse && e++;
      return e;
    }
    constructor(t, e, i) {
      this.pool = [];
      for (let t = 0; t !== i; ++t) this.pool[t] = new e(this, t);
      ((this.freedIndices = new Uint16Array(i)),
        (this.maxFreedIndex = i - 1),
        (this.freedIndex = -1),
        (this.poolIndex = -1),
        (this.itemClass = e),
        (this.maxExpCount = Math.max(1, i)),
        (this.name = t));
    }
    freeIndex(t) {
      this.freedIndex < this.maxFreedIndex && (this.freedIndices[++this.freedIndex] = t);
    }
    dispose() {
      let t = this.pool;
      for (let e = 0, i = t.length; e < i; ++e) t[e].dispose();
    }
    indexAt(t) {
      return this.pool[t];
    }
    freeAll() {
      let t = this.pool;
      for (let e = 0, i = t.length; e < i; ++e) t[e].free();
      ((this.freedIndex = -1), (this.poolIndex = -1));
    }
    acquire() {
      let t,
        e = this.pool;
      if (-1 !== this.freedIndex)
        return ((t = e[this.freedIndices[this.freedIndex]]), this.freedIndex--, t.activate());
      for (let i = 0, s = e.length; i !== s; ++i)
        if (!(t = e[++this.poolIndex % s]).inUse) return t.activate();
      let i = e.length;
      this.poolIndex = i;
      for (let t = 0, s = Math.min(this.maxExpCount, Math.floor(Math.floor(i / 3) + 1)); t < s; ++t)
        e.push(new this.itemClass(this, e.length));
      return (
        console.warn('::: POOL EXPANDED ::: ' + e.length + '(' + this.name + ')'),
        e[this.poolIndex].activate()
      );
    }
    log() {
      let t = this.pool;
      console.log('===== ObjectPool: (' + t.length + ') =====');
      for (var e = 0, i = t.length; e !== i; ++e)
        console.log('\t>inUse: ' + t[e].inUse + ': ' + t[e]);
      console.log('=============================================\n');
    }
  };
}
