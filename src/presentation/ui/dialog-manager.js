// Explicit live dependencies preserve initialization and shared state.
export default function createDialogManager(dependencies) {
  return class DialogManager {
    get isBlocked() {
      return this._isBlocked;
    }
    constructor(t, e) {
      ((this._container = t),
        (this._gameCanvas = e),
        (this._registeredUI = Object.create(null)),
        (this._registeredBox = Object.create(null)),
        (this._activeBoxStack = []),
        (this.needsUpdate = 0),
        (this._isBlocked = !1),
        (this._block = document.createElement('div')));
      let i = this._block.style;
      ((i.position = 'absolute'),
        (i.display = 'none'),
        (i.width = '100%'),
        (i.height = '100%'),
        (i.top = '0'),
        (i.left = '0'),
        (i.backgroundColor = 'rgba(0,0,0,0.4)'),
        (i.zIndex = dependencies.DialogZIndex.GAME_BOX + ''),
        this._container.appendChild(this._block),
        (this._msgAutoCloseTimer = -1),
        (this._msgId = void 0),
        (this._bMsgBox = new dependencies.ToastDialog('msg')),
        this._setZIndex(this._bMsgBox, dependencies.DialogZIndex.MESSAGE_BOX),
        this._container.appendChild(this._bMsgBox.element),
        this._bMsgBox.on(dependencies.dialogEvents.USER_CLOSE, () => {
          this.closeMessage();
        }),
        (this._onBoxUserClose = (t) => {
          t.deactivate();
        }),
        (this._onBoxClosed = (t) => {
          t.removeAllListeners();
          let e = this._activeBoxStack,
            i = e.indexOf(t);
          -1 !== i &&
            (e.splice(i, 1), (this.needsUpdate |= dependencies.DialogDirtyFlags.ACTIVE_BOX_DIRTY));
        }),
        this.registerBox(new dependencies.ConfirmationDialog('confirm')));
    }
    registerUI(t) {
      let e = t.id;
      if (!this._registeredUI[e])
        return ((this._registeredUI[e] = t), this._container.appendChild(t.element), t);
    }
    hasRegisteredUI(t) {
      return !!this._registeredUI[t];
    }
    getRegisteredUI(t) {
      return this._registeredUI[t];
    }
    registerBox(t) {
      let e = t.id;
      this._registeredBox[e] ||
        ((this._registeredBox[e] = t), this._container.appendChild(t.element));
    }
    hasRegisteredBox(t) {
      return !!this._registeredBox[t];
    }
    popBox(t, e) {
      let i = this._activeBoxStack,
        s = this._registeredBox[t];
      return (
        void 0 !== e && s.data(e),
        s
          .activate()
          .on(dependencies.dialogEvents.USER_CLOSE, this._onBoxUserClose)
          .on(dependencies.dialogEvents.CLOSE, this._onBoxClosed),
        (s.blocked = !0),
        i.push(s),
        this._setZIndex(s, dependencies.DialogZIndex.GAME_BOX + i.length),
        (this.needsUpdate |= dependencies.DialogDirtyFlags.ACTIVE_BOX_DIRTY),
        s
      );
    }
    closeBox(t) {
      this._registeredBox[t].deactivate();
    }
    confirm(t, e) {
      return this.popBox('confirm', t).on(dependencies.dialogEvents.CONFIRM, e);
    }
    message(t, e, i = 0, s = !1, n, r) {
      if ((this._bMsgBox.head(t).data(e, i).activate().pin(s), (this._msgId = n), s))
        this._msgAutoCloseTimer = -1;
      else {
        if (void 0 !== r) this._msgAutoCloseTimer = r;
        else {
          let i = t ? t.length : 0,
            s = e.length;
          ((this._msgAutoCloseTimer = 1 + 0.08 * (i + s)),
            this._msgAutoCloseTimer > 15 && (this._msgAutoCloseTimer = 15));
        }
        this.needsUpdate |= dependencies.DialogDirtyFlags.MESSAGE_AUTO_CLOSE;
      }
    }
    closeMessage(t) {
      (void 0 !== t && t !== this._msgId) ||
        (this._bMsgBox.deactivate(), (this._msgAutoCloseTimer = -1), (this._msgId = void 0));
    }
    update(t) {
      let e = this.needsUpdate;
      if (
        ((this.needsUpdate = 0),
        this._msgAutoCloseTimer > 0 &&
          ((this._msgAutoCloseTimer -= t) <= 0
            ? this.closeMessage()
            : (this.needsUpdate |= dependencies.DialogDirtyFlags.MESSAGE_AUTO_CLOSE)),
        e & dependencies.DialogDirtyFlags.ACTIVE_BOX_DIRTY)
      ) {
        let t = this._activeBoxStack,
          e = t.length,
          i = !1;
        for (let s = 0; s !== e; ++s) ((t[s].blocked = s !== e - 1), t[s].lockScreen && (i = !0));
        this._isBlocked !== i
          ? ((this._isBlocked = i),
            i
              ? ((this._block.style.display = 'block'), this._gameCanvas.blur())
              : ((this._block.style.display = 'none'), this._gameCanvas.focus()))
          : i || this._gameCanvas.focus();
      }
    }
    _setZIndex(t, e) {
      t.element.style.zIndex = e;
    }
  };
}
