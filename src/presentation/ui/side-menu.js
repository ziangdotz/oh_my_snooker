// Explicit live dependencies preserve initialization and shared state.
export default function createSideMenu(dependencies) {
  return class SideMenu extends dependencies.UiComponent {
    get clickedIndex() {
      return this._clickedIndex;
    }
    constructor(t, e) {
      (super(t, e),
        (this._clickedIndex = -1),
        (this._onItemHover = (t) => {
          let e = this._getButtonByElement(t.target);
          e && (e.hovered = 1);
        }),
        (this._onItemHoverOut = (t) => {
          let e = this._getButtonByElement(t.target);
          e && (e.hovered = 0);
        }),
        (this._onItemClick = (t) => {
          if (!this._isActive) return;
          let e = this._getButtonByElement(t.target);
          e &&
            e.enabled &&
            !e.selected &&
            ((e.selected = 1), (this._clickedIndex = e.index), this.deactivate());
        }));
    }
    _onActivate() {
      (this.unselectAll(),
        this.unhoverAll(),
        (this._clickedIndex = -1),
        (this._tween.timeScale = 1),
        super._onActivate());
    }
    _onDeactivate() {
      ((this._tween.timeScale = 1.3), super._onDeactivate());
    }
    _bindEvents() {
      (this.element.addEventListener('mouseover', this._onItemHover, !1),
        this.element.addEventListener('mouseout', this._onItemHoverOut, !1),
        this.element.addEventListener('click', this._onItemClick, !1));
    }
    _unbindEvents() {
      (this.element.removeEventListener('mouseover', this._onItemHover, !1),
        this.element.removeEventListener('mouseout', this._onItemHoverOut, !1),
        this.element.removeEventListener('click', this._onItemClick, !1));
    }
    unselectAll() {
      for (var t = this._bns, e = 0, i = t.length; e !== i; ++e) t[e].selected = 0;
    }
    unhoverAll() {
      for (var t = this._bns, e = 0, i = t.length; e !== i; ++e) t[e].hovered = 0;
    }
    update(t) {
      ((this._needsUpdate = !1),
        this._tween.needsUpdate && this._tween.update(t) && (this._needsUpdate = !0));
      for (var e = this._bns, i = 0, s = e.length; i !== s; ++i)
        e[i].needsUpdate && e[i].update() && (this._needsUpdate = !0);
      return this._needsUpdate;
    }
    _getButtonByElement(t) {
      for (var e = this._bns, i = 0, s = e.length; i !== s; ++i)
        if (e[i].element === t) return e[i];
      return null;
    }
    _createElement() {
      let t,
        e,
        i = [{ label: 'single play' }, { label: 'practice' }, { label: 'about' }];
      let s = document.createElement('div');
      s.className = 'game-side-menu';
      let n = [];
      for (let r = 0, a = i.length; r !== a; ++r) {
        'string' == typeof i[r] ? ((t = i[r]), (e = !1)) : ((t = i[r].label), (e = i[r].disabled));
        let a = new dependencies.MenuItem(this, t, r, e);
        (n.push(a), s.appendChild(a.element));
      }
      return ((this._bns = n), s);
    }
    _createTween() {
      let t = new dependencies.TweenGroup();
      const e = this._bns;
      let i = [];
      i.push(
        new dependencies.PropertyTween((t) => {
          0 === t.r
            ? t.displayed &&
              ((t.displayed = !1), (this._element.style.display = this._styleOpts.off))
            : t.displayed ||
              ((t.displayed = !0), (this._element.style.display = this._styleOpts.on));
        }).reset({ r: 0 }, { r: 1 }, dependencies.Easing.defaultEase, 0.016),
      );
      for (let t = 0, s = e.length; t !== s; ++t)
        i.push(
          new dependencies.ValueTween(e[t]).reset(
            { display: 0 },
            { display: 1 },
            dependencies.Easing.defaultEase,
            0.25,
            0.05 * t,
          ),
        );
      return t.reset(i);
    }
  };
}
