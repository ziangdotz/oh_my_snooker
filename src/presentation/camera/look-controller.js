// Explicit live dependencies preserve initialization and shared state.
export default function createLookController(dependencies) {
  return class LookController {
    constructor(t, e) {
      ((this._dirtyFlag = e),
        (this._weakParent = t),
        (this._followingTarget = null),
        (this._isFollowing = !1),
        (this._eyeTarget = Object.create(null)),
        (this._eyeTarget.x = new dependencies.LinearController(0.5, 0.25, 0.5, 3e-4)),
        (this._eyeTarget.y = new dependencies.LinearController(0.5, 0.25, 0.5, 3e-4)),
        (this._eyeTarget.z = new dependencies.LinearController(0.5, 0.25, 0.5, 3e-4)));
      const i = () => {
        this._weakParent.needsUpdate |= this._dirtyFlag;
      };
      for (var s in this._eyeTarget) this._eyeTarget[s].onUpdateRequired(i);
      ((this._followSpd = new dependencies.PropertyTween((t) => {
        var e = this._eyeTarget;
        ((e.x.gain = t.gain), (e.y.gain = t.gain), (e.z.gain = t.gain));
      })
        .reset({ gain: 0.05 }, { gain: 0.26 }, dependencies.Easing.defaultEase, 0.35)
        .end()),
        (this._origin = Object.create(null)),
        (this._origin.x = 0),
        (this._origin.y = 0),
        (this._origin.z = 0));
    }
    reset(t, e, i, s, n, r) {
      const a = 0.5 * s,
        o = 0.5 * n,
        l = this._origin;
      (this._isFollowing && this.unfollow(),
        (l.x = t),
        (l.y = e + r + 0.03),
        (l.z = i),
        this._eyeTarget.x.reset(l.x),
        this._eyeTarget.y.reset(l.y),
        this._eyeTarget.z.reset(l.z),
        this._eyeTarget.x.clamp(l.x - a, l.x + a),
        this._eyeTarget.z.clamp(l.z - o, l.z + o),
        this._followSpd.end());
    }
    follow(t) {
      ((this._followingTarget = t),
        (this._isFollowing = !0),
        (this._weakParent.needsUpdate |= this._dirtyFlag),
        this._followSpd.pause(0));
    }
    unfollow() {
      ((this._followingTarget = null), (this._isFollowing = !1), this._followSpd.play());
    }
    moveLookAt(t, e, i) {
      this._isFollowing && this.unfollow();
      const s = i.forward,
        n = i.side,
        r = this._eyeTarget;
      let a = (e *= 1.5) * s.x + t * n.x,
        o = e * s.z + t * n.z;
      (r.x.move(a), r.z.move(o));
    }
    lookTo(t, e, i) {
      this._isFollowing && this.unfollow();
      const s = this._eyeTarget;
      i
        ? (s.x.reset(t), s.z.reset(e), this._followSpd.end())
        : (s.x.tgt !== t && s.z.tgt !== e && this._followSpd.play(0), s.x.to(t), s.z.to(e));
    }
    resetLookAt() {
      const t = this._origin;
      return this.lookTo(t.x, t.z, !1);
    }
    update(t, e) {
      const i = this._eyeTarget;
      let s,
        n = !1;
      for (s in (this._isFollowing &&
        (i.x.to(this._followingTarget.position.x),
        i.z.to(this._followingTarget.position.z),
        (n = !0)),
      this._followSpd.needsUpdate && this._followSpd.update(t),
      i))
        (i[s].needsUpdate && i[s].update() && (n = !0), (e[s] = i[s].crt));
      return n;
    }
  };
}
