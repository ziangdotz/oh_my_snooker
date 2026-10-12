// Explicit live dependencies preserve initialization and shared state.
export default function createMenuItem(dependencies) {
  return class MenuItem {
    get needsUpdate() {
      return this._needsUpdate;
    }
    get element() {
      return this._element;
    }
    get display() {
      return this._display;
    }
    set display(t) {
      this._display !== t &&
        ((this._display = t),
        (this._needsUpdate = !0),
        this._weakParent && this._weakParent.requireUpdate());
    }
    get selected() {
      return this._selected;
    }
    set selected(t) {
      ((t *= this._enabled),
        this._selected !== t &&
          ((this._selected = t),
          (this._needsUpdate = !0),
          this._weakParent && this._weakParent.requireUpdate()));
    }
    get hovered() {
      return this._hovered;
    }
    set hovered(t) {
      ((t *= this._enabled),
        this._hovered !== t &&
          ((this._hovered = t),
          (this._needsUpdate = !0),
          this._weakParent && this._weakParent.requireUpdate()));
    }
    get enabled() {
      return this._enabled;
    }
    get index() {
      return this._index;
    }
    constructor(t, e, i, s) {
      ((this._element = document.createElement('div')),
        (this._element.className = 'side-button'),
        (this._inner = document.createElement('div')),
        (this._inner.className = 'inner label-div-420'),
        (this._inner.innerHTML = e.toUpperCase()),
        this._element.appendChild(this._inner),
        (this._element.style.display = 'none'),
        (this._isHidding = !0),
        (this._needsUpdate = !1),
        (this._weakParent = t),
        (this._index = i),
        s ? ((this._element.className += ' disabled'), (this._enabled = 0)) : (this._enabled = 1),
        (this._display = 0),
        (this._selected = 0),
        (this._hovered = 0),
        (this._width = 0),
        (this._height = 0),
        (this._renderedDisplay = -1),
        (this._renderedOutterColor = -1),
        (this._renderedInnerColor = -1));
    }
    update() {
      this._needsUpdate = !1;
      const t = this._element;
      if (this._display < 1e-6)
        return (this._isHidding || ((this._isHidding = !0), (t.style.display = 'none')), !1);
      {
        this._isHidding && ((this._isHidding = !1), (t.style.display = 'inline-block'));
        let e = t.style,
          i = this._inner.style;
        if (this._width <= 0) {
          let i = t.getBoundingClientRect();
          if (0 === i.width) return ((e.visibility = 'hidden'), (this._needsUpdate = !0), !0);
          ((e.visibility = 'inherit'), (this._width = i.width), (this._height = i.height));
        }
        let s = this._display;
        if (s !== this._renderedDisplay) {
          this._renderedDisplay = s;
          let t = dependencies.Easing.Power1.easeOut(s > 0.15 ? 1 : s / 0.15) - 1,
            n = dependencies.Easing.Power1.easeInOut(s) - 1;
          ((e.transform = 'translate3d(' + this._width * t + 'px,0,0)'),
            (i.transform = 'translate3d(' + 2 * this._width * n + 'px,0,0)'));
        }
        if (this._enabled) {
          let t,
            n = this._hovered || this._selected,
            r = 1 - s + n * s,
            a = 1 - n;
          (r !== this._renderedOutterColor &&
            ((this._renderedOutterColor = r),
            (t = Math.round(255 * r)),
            (e.backgroundColor = 'rgba(' + t + ',' + t + ',' + t + ', 0.9)')),
            a !== this._renderedInnerColor &&
              ((this._renderedInnerColor = a),
              (t = Math.round(213 * a)),
              (i.color = 'rgb(' + t + ',' + t + ',' + t + ')')));
        }
        return this._needsUpdate;
      }
    }
  };
}
