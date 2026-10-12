// Explicit live dependencies preserve initialization and shared state.
export default function createToolbar(dependencies) {
  return class Toolbar extends dependencies.UiComponent {
    constructor(t) {
      (super(t, { on: 'flex' }),
        (this._group = 0),
        (this._onClick = (t) => {
          let e = t.target.dataset.action;
          e && this.emit(dependencies.dialogEvents.ITEM_CLICK, e);
        }),
        (this._lower = !1));
    }
    _createElement() {
      let t = document.createElement('div');
      return (
        (t.className = 'ingame-controls'),
        (this._buttons = Object.create(null)),
        this._addButton('replay', dependencies.ToolbarGroup.REPLAY, 'replay-icon', t),
        this._addButton('pause', dependencies.ToolbarGroup.PAUSE, 'pause-icon', t),
        t
      );
    }
    _addButton(t, e, i, s) {
      let n = document.createElement('div');
      ((n.className = i + ' sprite control-button-opa'),
        (n.dataset.action = t),
        (n.style.display = 'none'),
        s.appendChild(n));
      let r = Object.create(null);
      ((r.enabled = !1), (r.group = e), (r.e = n), (this._buttons[t] = r));
    }
    setGroup(t) {
      this._group !== t && ((this._group = t), this._updateGroup());
    }
    setLocationLower(t) {
      this._lower !== t &&
        ((this._lower = t),
        t ? this._element.classList.add('lower') : this._element.classList.remove('lower'));
    }
    _updateGroup() {
      const t = this._buttons,
        e = this._group;
      let i;
      for (let s in t) {
        let n = !!((i = t[s]).group & e);
        n !== i.enabled && ((i.enabled = n), (i.e.style.display = n ? 'block' : 'none'));
      }
    }
    _bindEvents() {
      this._element.addEventListener('click', this._onClick, !1);
    }
    _unbindEvents() {
      this._element.removeEventListener('click', this._onClick, !1);
    }
  };
}
