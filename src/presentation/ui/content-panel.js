// Explicit live dependencies preserve initialization and shared state.
export default function createContentPanel(dependencies) {
  return class ContentPanel {
    static _createBodyCopy() {
      let t = document.createElement('p');
      return ((t.className = 'box-body-copy'), t);
    }
    static getMessageTypeClass(t) {
      return dependencies.messageClassNames[t];
    }
    get container() {
      return this._container;
    }
    get state() {
      return this._state;
    }
    constructor(t) {
      ((this._container = document.createElement('div')),
        (this._container.className = 'box-body'),
        (this._state = 0),
        (this._copy = null),
        (this._messageType = 0),
        t && t.appendChild(this._container));
    }
    empty() {
      let t = this._container;
      for (; t.firstChild; ) t.removeChild(t.firstChild);
      return (this._state, dependencies.PanelState.EMPTY, this);
    }
    message(t, e = 0) {
      if (
        (this._state !== dependencies.PanelState.MESSAGE &&
          (this._state !== dependencies.PanelState.EMPTY && this.empty(),
          this._copy || (this._copy = ContentPanel._createBodyCopy()),
          this._container.appendChild(this._copy),
          (this._state = dependencies.PanelState.MESSAGE)),
        (this._copy.innerHTML = t || ''),
        this._messageType !== e)
      ) {
        let t = this._messageType;
        (0 !== t && this._copy.classList.remove(dependencies.messageClassNames[t]),
          (this._messageType = e),
          0 !== e && this._copy.classList.add(dependencies.messageClassNames[e]));
      }
      return this;
    }
    pushContent(t) {
      return (
        this._container.appendChild(t),
        (this._state = dependencies.PanelState.CONTENT),
        this
      );
    }
    replaceContent(t) {
      return (
        (this._container.innerHTML = t),
        (this._state = dependencies.PanelState.CONTENT),
        this
      );
    }
  };
}
