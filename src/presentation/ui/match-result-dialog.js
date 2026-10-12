// Explicit live dependencies preserve initialization and shared state.
export default function createMatchResultDialog(dependencies) {
  return class MatchResultDialog extends dependencies.ActionDialog {
    constructor(t) {
      (super(t, void 0), this.closeLabel('BACK'), (this._onRetryClick = () => this.emit('retry')));
    }
    _createElement() {
      let t = super._createElement();
      this._retryBn = this._createButton('RETRY', !0);
      let e = this._createBody(!1).replaceContent(dependencies.matchResultTemplate);
      return (
        (dependencies.matchResultTemplate = null),
        (this._timeValue = e.container.querySelector('.time')),
        (this._names = [e.container.querySelector('.name0'), e.container.querySelector('.name1')]),
        (this._pts = [e.container.querySelector('.pts0'), e.container.querySelector('.pts1')]),
        (this._brks = [e.container.querySelector('.brk0'), e.container.querySelector('.brk1')]),
        (this._fouls = [
          e.container.querySelector('.fouls0'),
          e.container.querySelector('.fouls1'),
        ]),
        (this._accuracies = [
          e.container.querySelector('.accuracy0'),
          e.container.querySelector('.accuracy1'),
        ]),
        t
      );
    }
    data(t) {
      this._timeValue.innerHTML = dependencies.objectUtils.a.toTimeString(t.time);
      let e = t.players,
        i = e[0],
        s = e[1],
        n = i.pts - s.penalty,
        r = s.pts - i.penalty;
      return (
        MatchResultDialog._setLabel(
          this._names,
          i.displayName.toUpperCase(),
          s.displayName.toUpperCase(),
        ),
        MatchResultDialog._setLabel(this._pts, n, r, !0),
        MatchResultDialog._setLabel(this._brks, i.maxbrk, s.maxbrk),
        MatchResultDialog._setLabel(this._fouls, i.penalty, s.penalty),
        MatchResultDialog._setLabel(
          this._accuracies,
          (100 * i.accuracy).toFixed(1) + '%',
          (100 * s.accuracy).toFixed(1) + '%',
        ),
        n > r
          ? (this.head('YOU WIN!'),
            (this._head.className = 'box-head success-copy'),
            this._names[0].classList.add('success-copy'),
            this._names[1].classList.remove('success-copy'))
          : n < r
            ? (this.head('YOU LOSE'),
              (this._head.className = 'box-head error-copy'),
              this._names[0].classList.remove('success-copy'),
              this._names[1].classList.add('success-copy'))
            : (this.head('DARW'),
              (this._head.className = 'box-head bright-copy'),
              this._names[0].classList.remove('success-copy'),
              this._names[1].classList.remove('success-copy')),
        this
      );
    }
    static _setLabel(t, e, i, s = !1) {
      ((t[0].innerHTML = e),
        (t[1].innerHTML = i),
        s &&
          (t[0].classList.remove('success-copy'),
          t[1].classList.remove('success-copy'),
          e > i
            ? t[0].classList.add('success-copy')
            : e < i && t[1].classList.add('success-copy')));
    }
    _bindEvents() {
      (super._bindEvents(), this._retryBn.addEventListener('click', this._onRetryClick, !1));
    }
    _unbindEvents() {
      (this._retryBn.removeEventListener('click', this._onRetryClick, !1), super._unbindEvents());
    }
  };
}
