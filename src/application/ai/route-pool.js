// Explicit live dependencies preserve initialization and shared state.
export default function createRoutePool(dependencies) {
  return class RoutePool {
    get length() {
      return this._length;
    }
    constructor() {
      this.routes = [];
      for (let t = 0, e = 20; t !== e; ++t) this.routes[t] = RoutePool.makeRoute();
      this._length = 0;
    }
    getAtIndex(t) {
      return this.routes[t];
    }
    next(t, e, i, s, n, r) {
      let a = this.routes[this._length++];
      return (
        a || ((a = RoutePool.makeRoute()), this.routes.push(a)),
        (a.pkIndex = -1),
        (a.ballBIndex = -1),
        (a.dx = t),
        (a.dy = e),
        (a.dz = i),
        (a.fbSpin = s),
        (a.powerFactor = n),
        (a.priority = r),
        a
      );
    }
    clear() {
      this._length = 0;
    }
    static makeRoute() {
      return Object.create(null);
    }
  };
}
