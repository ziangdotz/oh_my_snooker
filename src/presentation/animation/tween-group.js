// Explicit live dependencies preserve initialization and shared state.
export default function createTweenGroup(dependencies) {
  return class TweenGroup extends dependencies.Tween {
    constructor() {
      (super(),
        (this.tweens = null),
        (this.onChildRequireUpdate = () => {
          this.requireUpdate();
        }));
    }
    reset(t, e, i = 0) {
      if (t) {
        (this._removeAllTweens(), (this.tweens = t));
        for (var s = 0, n = 0, r = t.length; n !== r; ++n)
          (t[n].totalLifeTime > s && (s = t[n].totalLifeTime),
            t[n].on(dependencies.Tween.updEvtType, this.onChildRequireUpdate));
        return this.resetBase(e, s, i);
      }
      return this.clear();
    }
    clear() {
      return (this._removeAllTweens(), super.clear());
    }
    _removeAllTweens() {
      if (this.tweens) {
        let t = this.tweens;
        for (let e = t.length - 1; e > -1; --e) t[e].dispose();
        this.tweens = null;
      }
    }
    dispose() {
      ((this.onChildRequireUpdate = null), super.dispose());
    }
    render(t) {
      this.renderedRatio = t;
      let e,
        i,
        s = t * this.duration,
        n = this.tweens;
      for (let t = 0, r = n.length; t !== r; ++t)
        (((e = n[t]).time = s),
          (i = s - e.delay) < 0 ? (i = 0) : i > e.duration && (i = e.duration),
          e.renderedTime !== i && ((e.renderedTime = i), e.render(e.ease(i / e.duration))));
    }
  };
}
