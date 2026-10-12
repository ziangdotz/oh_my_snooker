// Explicit live dependencies preserve initialization and shared state.
export default function createUiComponent(dependencies) {
  return class UiComponent extends dependencies.EventEmitter.a {
    static parseUI(t) {
      return (
        (dependencies.uiParserElement.innerHTML = t),
        dependencies.uiParserElement.firstChild
      );
    }
    get needsUpdate() {
      return this._needsUpdate;
    }
    get active() {
      throw new Error('Naming change: use isActing instead');
    }
    get isActive() {
      return this._isActive;
    }
    get element() {
      return this._element;
    }
    get id() {
      return this._id;
    }
    constructor(t, e) {
      (super(),
        (this._id = t),
        (this.group = 0),
        (this._styleOpts = Object.create(null)),
        e
          ? ((this._styleOpts.propName = e.propName || 'display'),
            (this._styleOpts.on = e.on || 'block'),
            (this._styleOpts.off = e.off || 'none'))
          : ((this._styleOpts.propName = 'display'),
            (this._styleOpts.on = 'block'),
            (this._styleOpts.off = 'none')),
        (this._element = this._createElement()),
        (this._tween = this._createTween()),
        this._tween &&
          this._tween.onUpdateRequired(() => {
            this.requireUpdate();
          }),
        (this._needsUpdate = !1),
        (this._isActive = !0),
        this.deactivate(!0));
    }
    _createElement() {
      throw new Error('BaseUIComponent._createElement: override me, and DO NOT call super!');
    }
    _createTween() {
      return null;
    }
    requireUpdate() {
      this._needsUpdate = !0;
    }
    activate(t) {
      return (
        this._isActive ||
          ((this._isActive = !0),
          this._onActivate(),
          this._tween
            ? t
              ? this._tween.end()
              : this._tween.play()
            : (this._element.style[this._styleOpts.propName] = this._styleOpts.on)),
        this
      );
    }
    _onActivate() {
      this._bindEvents();
    }
    _bindEvents() {}
    deactivate(t) {
      return (
        this._isActive &&
          ((this._isActive = !1),
          this._onDeactivate(),
          this._tween
            ? t
              ? this._tween.pause(0)
              : this._tween.reverse()
            : (this._element.style[this._styleOpts.propName] = this._styleOpts.off)),
        this
      );
    }
    _onDeactivate() {
      this._unbindEvents();
    }
    _unbindEvents() {}
    update(t) {
      return (
        (this._needsUpdate = !1),
        this._tween && this._tween.needsUpdate && this._tween.update(t) && (this._needsUpdate = !0),
        this._needsUpdate
      );
    }
  };
}
