// Explicit live dependencies preserve initialization and shared state.
export default function createShortcutBar(dependencies) {
  return class ShortcutBar extends dependencies.UiComponent {
    constructor(t) {
      (super(t, { on: 'flex' }),
        (this._currentGroup = -1),
        (this._allowAim = this._aimKey.visible),
        (this._allowPickUp = this._pickUpKey.visible));
    }
    _createElement() {
      let t = ShortcutBar.parseUI(dependencies.shortcutsTemplate),
        e = t.querySelector('.stand-group'),
        i = t.querySelector('.aim-group');
      ((this._groups = [this._makeElementWrapper(e, !0), this._makeElementWrapper(i, !0)]),
        (this._aimKey = this._makeElementWrapper(e.querySelector('.aim-key'), !0)),
        (this._pickUpKey = this._makeElementWrapper(e.querySelector('.pickup-key'), !0)),
        (this.moreBn = t.querySelector('.more-button')));
      let s = t.querySelectorAll('.assi-key');
      if (dependencies.browserDetector.a.mac)
        for (let t = 0, e = s.length; t !== e; ++t) s[t].innerHTML = 'cmd';
      return t;
    }
    _createTween() {
      return new dependencies.PropertyTween((t) => {
        0 !== t.r
          ? (t.displayed ||
              ((t.displayed = !0), (this._element.style.display = this._styleOpts.on)),
            (this._element.style.opacity = t.r))
          : !1 !== t.displayed &&
            ((t.displayed = !1), (this._element.style.display = this._styleOpts.off));
      })
        .reset({ r: 0 }, { r: 1 }, dependencies.Easing.Power1.easeIn, 0.15, 0.3)
        .pause(0);
    }
    _makeElementWrapper(t, e) {
      let i = Object.create(null);
      return ((i.e = t), (i.visible = e), i);
    }
    allowAim(t) {
      return (
        this._allowAim !== t && ((this._allowAim = t), this._setWrapperVisible(this._aimKey, t)),
        this
      );
    }
    allowPickUp(t) {
      return (
        this._allowPickUp !== t &&
          ((this._allowPickUp = t), this._setWrapperVisible(this._pickUpKey, t)),
        this
      );
    }
    setGroup(t) {
      return (
        this._currentGroup !== t &&
          ((this._currentGroup = t),
          1 === t
            ? (this._setWrapperVisible(this._groups[0], !1),
              this._setWrapperVisible(this._groups[1], !0))
            : (this._setWrapperVisible(this._groups[0], !0),
              this._setWrapperVisible(this._groups[1], !1))),
        this
      );
    }
    _setWrapperVisible(t, e) {
      t.visible !== e && ((t.visible = e), (t.e.style.display = e ? 'flex' : 'none'));
    }
  };
}
