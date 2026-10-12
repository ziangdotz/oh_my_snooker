// Explicit live dependencies preserve initialization and shared state.
export default function createPauseDialog(dependencies) {
  return class PauseDialog extends dependencies.ActionDialog {
    constructor(t) {
      (super(t, void 0), this.head('PAUSED').closeLabel('RESUME')._addBoxClass('pause-box'));
    }
    _createElement() {
      let t = super._createElement();
      this._body = this._createBody(!0);
      let e = [
        { label: 'RESUME', sid: 'resume' },
        { label: 'RESTART', sid: 'restart' },
        { label: 'CONTROLS GUIDE', sid: 'controls_guide' },
        { label: 'QUIT', sid: 'quit' },
      ];
      for (let t = 0, i = e.length; t !== i; ++t) {
        let i = document.createElement('section');
        ((i.className = 'line-section ss-l clickable-section'),
          i.setAttribute('data-sid', e[t].sid),
          (i.innerHTML = e[t].label),
          this._body.pushContent(i));
      }
      return t;
    }
  };
}
