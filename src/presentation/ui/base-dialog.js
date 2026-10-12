// Explicit live dependencies preserve initialization and shared state.
export default function createBaseDialog(dependencies) {
  return class BaseDialog extends dependencies.UiComponent {
    constructor(t, e) {
      (super(t, e),
        (this._isPinning = !1),
        (this._onCloseClick = () => {
          this.emit(dependencies.dialogEvents.USER_CLOSE, this);
        }));
    }
    _createElement() {
      let t = document.createElement('div');
      return (
        (t.className = 'game-box'),
        (this._element = t),
        (this._head = this._createBoxHead(t)),
        (this._closeBn = null),
        t
      );
    }
    _createBoxHead(t) {
      let e = document.createElement('h1');
      return ((e.className = 'box-head bright-copy'), t && t.appendChild(e), e);
    }
    _createCloseIcon(t) {
      let e = document.createElement('div');
      return ((e.className = 'close-icon-s sprite close-button'), t && t.appendChild(e), e);
    }
    _bindEvents() {
      this._closeBn && this._closeBn.addEventListener('click', this._onCloseClick, !1);
    }
    _unbindEvents() {
      this._closeBn && this._closeBn.removeEventListener('click', this._onCloseClick, !1);
    }
    _addBoxClass(...t) {
      let e = this._element.classList;
      for (let i = 0, s = t.length; i !== s; ++i) e.add(t[i]);
      return this;
    }
    head(t) {
      return ((this._head.innerHTML = t || ''), this);
    }
    data(t, e) {
      throw new Error('BaseGameBox.data needs to be overridden');
    }
    pin(t) {
      return (
        this._isPinning !== t &&
          ((this._isPinning = t),
          this._closeBn && (this._closeBn.style.display = t ? 'none' : 'block')),
        this
      );
    }
  };
}
