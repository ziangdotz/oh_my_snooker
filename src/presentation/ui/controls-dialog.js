// Explicit live dependencies preserve initialization and shared state.
export default function createControlsDialog(dependencies) {
  return class ControlsDialog extends dependencies.ActionDialog {
    constructor(t) {
      (super(t, void 0),
        this.head('CONTROLS GUIDE').closeLabel('CLOSE')._addBoxClass('controls-guide-box'));
    }
    _createElement() {
      let t = super._createElement();
      ((this._body = this._createBody(!1).replaceContent(dependencies.controlsTemplate)),
        (dependencies.controlsTemplate = null));
      let e = t.querySelectorAll('.assi-key');
      if (dependencies.browserDetector.a.mac)
        for (let t = 0, i = e.length; t !== i; ++t) e[t].innerHTML = 'cmd';
      return t;
    }
    _onDeactivate() {
      ((this._body.container.scrollTop = 0), super._onDeactivate());
    }
  };
}
