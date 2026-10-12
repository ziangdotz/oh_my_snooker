// Explicit live dependencies preserve initialization and shared state.
export default function createScoreboard(dependencies) {
  return class Scoreboard extends dependencies.UiComponent {
    get playerCount() {
      return this._playerCount;
    }
    constructor(t, e) {
      (super(t, e), (this._playerCount = 2));
    }
    _createElement() {
      let t = Scoreboard.parseUI(dependencies.scoreboardTemplate);
      return (
        (this._groups = [
          Scoreboard._makeGroup(t.querySelector('.left')),
          Scoreboard._makeGroup(t.querySelector('.right')),
        ]),
        t
      );
    }
    static _makeGroup(t) {
      let e = Object.create(null);
      return (
        (e.head = Object.create(null)),
        (e.head.value = ''),
        (e.head.e = t.querySelector('.head')),
        (e.pts = Object.create(null)),
        (e.pts.value = NaN),
        (e.pts.e = t.querySelector('.pts')),
        (e.brk = Object.create(null)),
        (e.brk.value = NaN),
        (e.brk.e = t.querySelector('.brk')),
        (e.ballOn = Object.create(null)),
        (e.ballOn.value = 0),
        (e.ballOn.e = t.querySelector('.ball-on-icon')),
        (e.e = t),
        (e.visible = !0),
        e
      );
    }
    static setGroupLabel(t, e, i) {
      let s = t[e];
      s.value !== i && ((s.value = i), (s.e.innerHTML = i));
    }
    static setGroupBallOn(t, e) {
      e !== t.ballOn.value &&
        ((t.ballOn.value = e), (t.ballOn.e.className = 'ball-on-icon snooker b-' + e));
    }
    resetPlayers(t) {
      let e = t[0],
        i = t[1],
        s = this._groups[1];
      return (
        Scoreboard.setGroupLabel(this._groups[0], 'head', e.displayName.toUpperCase()),
        i
          ? (s.visible ||
              ((s.visible = !0),
              (s.e.style.display = 'block'),
              this._element.classList.remove('single')),
            Scoreboard.setGroupLabel(s, 'head', i.displayName.toUpperCase()),
            (this._playerCount = 2))
          : (s.visible &&
              ((s.visible = !1),
              (s.e.style.display = 'none'),
              this._element.classList.add('single')),
            (this._playerCount = 1)),
        this
      );
    }
    syncResults(t, e, i) {
      let s = t[0],
        n = t[1],
        r = this._groups[0];
      (Scoreboard.setGroupLabel(r, 'brk', s.brk), Scoreboard.setGroupBallOn(r, 0 === e ? i : 0));
      let a = s.pts;
      if (n) {
        let t = this._groups[1];
        (Scoreboard.setGroupLabel(t, 'brk', n.brk),
          Scoreboard.setGroupBallOn(t, 1 === e ? i : 0),
          Scoreboard.setGroupLabel(t, 'pts', n.pts - s.penalty),
          (a -= n.penalty));
      }
      Scoreboard.setGroupLabel(r, 'pts', a);
    }
  };
}
