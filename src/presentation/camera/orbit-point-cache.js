/** Preserve the original definition and evaluation order. */
export default function createOrbitPointCache(dependencies) {
  return new (class {
    get count() {
      return this._count;
    }
    constructor() {
      ((this.points = []), (this._pointCache = []), (this._count = 0));
    }
    clear() {
      return ((this._count = 0), (this.points.length = 0), this);
    }
    add(t, e) {
      let i = this._pointCache[this.count];
      return (
        i ? i.set(t, e) : ((i = new dependencies.VectorTwo(t, e)), this._pointCache.push(i)),
        (this.points[this._count++] = i),
        this
      );
    }
    setInfinity() {
      return ((this._count = 1 / 0), (this.points.length = 0), this);
    }
  })();
}
