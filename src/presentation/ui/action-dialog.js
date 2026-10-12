// Explicit live dependencies preserve initialization and shared state.
export default function createActionDialog(dependencies) {
  return class ActionDialog extends dependencies.BaseDialog {
    get enabled() {
      return this._enabled;
    }
    get blocked() {
      return this._blocked;
    }
    set blocked(t) {
      if (this._blocked !== t) {
        this._blocked = t;
        let e = !t && this._enabled;
        this._composedEnabled !== e && ((this._composedEnabled = e), this._onEnabledChanged(e));
      }
    }
    _setEnabled(t) {
      if (this._enabled !== t) {
        this._enabled = t;
        let e = t && !this._blocked;
        this._composedEnabled !== e && ((this._composedEnabled = e), this._onEnabledChanged(e));
      }
    }
    get lockScreen() {
      return this._lockScreen;
    }
    static _emitItemClickAction(t, e) {
      let i = void 0,
        s = void 0,
        n = null,
        r = e.currentTarget,
        a = e.target;
      for (
        ;
        a !== r &&
        (i || void 0 === (n = a.dataset) || (i = n.action || void 0),
        'SECTION' !== a.tagName || void 0 === (s = a.dataset.sid));

      )
        a = a.parentNode;
      s && t.emit(dependencies.dialogEvents.ITEM_CLICK, s, i);
    }
    constructor(t, e) {
      (super(t, e),
        (this._lockScreen = !0),
        (this._enabled = !0),
        (this._blocked = !1),
        (this._composedEnabled = !0),
        this._addBoxClass('stack-box'),
        (this._onBodyClick = (t) => ActionDialog._emitItemClickAction(this, t)));
    }
    _createElement() {
      let t = super._createElement();
      return (
        (this._foot = document.createElement('div')),
        (this._foot.className = 'box-foot'),
        (this._buttons = []),
        (this._bodies = []),
        (this._clickableBodies = []),
        (this._closeBn = this._createButton('CANCEL')),
        t.appendChild(this._foot),
        t
      );
    }
    _createButton(t, e = !1) {
      let i = document.createElement('button');
      return (
        (i.className = 'default-button'),
        (i.innerHTML = t),
        e ? this._foot.insertBefore(i, this._foot.firstChild) : this._foot.appendChild(i),
        this._buttons.push(i),
        i
      );
    }
    _createBody(t) {
      let e = new dependencies.ContentPanel();
      return (
        this._element.insertBefore(e.container, this._foot),
        this._bodies.push(e),
        t && this._clickableBodies.push(e),
        e
      );
    }
    _onActivate() {
      super._onActivate();
    }
    _onDeactivate() {
      (super._onDeactivate(), this.emit(dependencies.dialogEvents.CLOSE, this));
    }
    _bindEvents() {
      super._bindEvents();
      let t = this._clickableBodies;
      for (let e = 0, i = t.length; e !== i; ++e)
        t[e].container.addEventListener('click', this._onBodyClick, !1);
    }
    _unbindEvents() {
      super._unbindEvents();
      let t = this._clickableBodies;
      for (let e = 0, i = t.length; e !== i; ++e)
        t[e].container.removeEventListener('click', this._onBodyClick, !1);
    }
    closeLabel(t) {
      return (this._closeBn && (this._closeBn.innerHTML = t), this);
    }
    _onEnabledChanged(t) {
      const e = this._buttons,
        i = this._bodies;
      for (let i = 0, s = e.length; i !== s; ++i) e[i].disabled = !t;
      for (let e = 0, s = i.length; e !== s; ++e)
        t ? i[e].container.classList.remove('disabled') : i[e].container.classList.add('disabled');
    }
  };
}
