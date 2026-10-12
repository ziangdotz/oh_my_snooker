// Explicit live dependencies preserve initialization and shared state.
export default function createToastDialog(dependencies) {
  return class ToastDialog extends dependencies.BaseDialog {
    constructor(t, e) {
      (super(t, e), this._addBoxClass('message-box'), (this._msgType = 0));
    }
    _createElement() {
      let t = super._createElement();
      return (
        (this._body = new dependencies.ContentPanel(t)),
        (this._closeBn = this._createCloseIcon(t)),
        t
      );
    }
    _createBoxHead(t) {
      let e = document.createElement('h3');
      return ((e.className = 'box-head'), t && t.appendChild(e), e);
    }
    data(t, e = 0) {
      if ((this._body.message(t), e !== this._msgType)) {
        let t = this._msgType;
        (0 !== t && this._head.classList.remove(dependencies.ContentPanel.getMessageTypeClass(t)),
          (this._msgType = e),
          0 !== e && this._head.classList.add(dependencies.ContentPanel.getMessageTypeClass(e)));
      }
      return this;
    }
  };
}
