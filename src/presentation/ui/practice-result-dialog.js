// Explicit live dependencies preserve initialization and shared state.
export default function createPracticeResultDialog(dependencies) {
  return class PracticeResultDialog extends dependencies.ActionDialog {
    constructor(t) {
      (super(t, void 0),
        this.head('RESULTS').closeLabel('BACK'),
        (this._onRetryClick = () => this.emit('retry')));
    }
    _createElement() {
      let t = super._createElement();
      this._retryBn = this._createButton('RETRY', !0);
      let e = this._createBody(!1).replaceContent(dependencies.practiceResultTemplate);
      return (
        (dependencies.practiceResultTemplate = null),
        (this._timeValue = e.container.querySelector('.time')),
        (this._ptsValue = e.container.querySelector('.pts')),
        (this._brkValue = e.container.querySelector('.brk')),
        (this._foulsLabel = e.container.querySelector('.fouls-label')),
        (this._foulsValue = e.container.querySelector('.fouls')),
        (this._accuracyValue = e.container.querySelector('.accuracy')),
        t
      );
    }
    data(t) {
      this._timeValue.innerHTML = dependencies.objectUtils.a.toTimeString(t.time);
      let e = t.players[0];
      return (
        (this._ptsValue.innerHTML = e.pts),
        (this._brkValue.innerHTML = e.maxbrk),
        (this._foulsValue.innerHTML = e.penalty),
        e.penalty < 0
          ? (this._foulsLabel.classList.add('error-copy'),
            this._foulsValue.classList.add('error-copy'))
          : (this._foulsLabel.classList.remove('error-copy'),
            this._foulsValue.classList.remove('error-copy')),
        (this._accuracyValue.innerHTML = (100 * e.accuracy).toFixed(1) + '%'),
        this
      );
    }
    _bindEvents() {
      (super._bindEvents(), this._retryBn.addEventListener('click', this._onRetryClick, !1));
    }
    _unbindEvents() {
      (this._retryBn.removeEventListener('click', this._onRetryClick, !1), super._unbindEvents());
    }
  };
}
