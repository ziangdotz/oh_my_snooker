// Explicit live dependencies preserve initialization and shared state.
export default function createValueTween(dependencies) {
  return class ValueTween extends dependencies.Tween {
    constructor(t) {
      (super(), (this.target = t), (this.from = null), (this.change = null));
    }
    reset(t, e, i, s, n = 0) {
      if (t && this.target) {
        for (var r in ((this.from = t), (this.change = {}), t))
          this.change[r] = r in e ? e[r] - t[r] : 0;
        return this.resetBase(i, s, n);
      }
      return this.clear();
    }
    clear() {
      return ((this.from = null), (this.change = null), super.clear());
    }
    dispose() {
      ((this.target = null), super.dispose());
    }
    render(t) {
      this.renderedRatio = t;
      let e = this.from,
        i = this.change,
        s = this.target;
      for (let n in e) s[n] = e[n] + i[n] * t;
    }
  };
}
