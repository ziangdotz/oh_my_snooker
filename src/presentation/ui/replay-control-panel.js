// Explicit live dependencies preserve initialization and shared state.
export default function createReplayControlPanel(dependencies) {
  return class ReplayControlPanel extends dependencies.UiComponent {
    get isPlaying() {
      return this._isPlaying;
    }
    set isPlaying(t) {
      this._isPlaying !== t &&
        ((this._isPlaying = t),
        t
          ? ((this._playBn.style.display = 'none'), (this._pauseBn.style.display = 'flex'))
          : ((this._playBn.style.display = 'flex'), (this._pauseBn.style.display = 'none')));
    }
    setProgress(t) {
      this._progressLen.style.width = Math.round(1e4 * t) / 100 + '%';
    }
    slomo(t) {
      t ? this._progressLen.classList.add('slomo') : this._progressLen.classList.remove('slomo');
    }
    constructor(t) {
      (super(t, { on: 'flex' }),
        (this._isPlaying = !1),
        (this._onPauseClick = () => this.emit(dependencies.dialogEvents.ITEM_CLICK, 'pause')),
        (this._onPlayClick = () => this.emit(dependencies.dialogEvents.ITEM_CLICK, 'play')),
        (this._onCloseClick = () => this.emit(dependencies.dialogEvents.ITEM_CLICK, 'close')),
        (this.supportsPointer = !!window.PointerEvent),
        (this._isDragging = !1),
        (this._progressTotalLen = 0),
        (this._onProgressMouseDown = (t) => {
          ((this._isDragging = !0),
            this.supportsPointer && t.target.setPointerCapture(t.pointerId),
            (this._progressTotalLen = t.target.getBoundingClientRect().width));
          let e = t.offsetX / this._progressTotalLen;
          (e > 1 ? (e = 1) : e < 0 && (e = 0),
            this.emit(dependencies.dialogEvents.ITEM_CLICK, 'seek', e, !0));
        }),
        (this._onProgressMouseMove = (t) => {
          if (this._isDragging) {
            t.preventDefault();
            let e = t.offsetX / this._progressTotalLen;
            (e > 1 ? (e = 1) : e < 0 && (e = 0),
              this.emit(dependencies.dialogEvents.ITEM_CLICK, 'seek', e));
          }
        }),
        (this._onProgressMouseUp = (t) => {
          ((this._isDragging = !1),
            this.supportsPointer &&
              (t.preventDefault(), t.target.releasePointerCapture(t.pointerId)));
        }));
    }
    _createElement() {
      let t = ReplayControlPanel.parseUI(dependencies.replayControlsTemplate);
      return (
        (this._pauseBn = t.querySelector('.pause-button')),
        (this._playBn = t.querySelector('.play-button')),
        (this._closeBn = t.querySelector('.close-button')),
        (this._progressBar = t.querySelector('.progress-bar')),
        (this._progressLen = t.querySelector('.progress-len')),
        t
      );
    }
    _createTween() {
      return new dependencies.PropertyTween((t) => {
        0 !== t.r
          ? (t.displayed ||
              ((t.displayed = !0), (this._element.style.display = this._styleOpts.on)),
            (this._element.style.transform = 'translate3d(0,' + (40 - 40 * t.r) + 'px, 0)'))
          : !1 !== t.displayed &&
            ((t.displayed = !1), (this._element.style.display = this._styleOpts.off));
      })
        .reset({ r: 0 }, { r: 1 }, dependencies.Easing.Power1.easeInOut, 0.2)
        .pause(0);
    }
    _onDeactivate() {
      ((this._isDragging = !1), super._onDeactivate());
    }
    _bindEvents() {
      (this._pauseBn.addEventListener('click', this._onPauseClick, !1),
        this._playBn.addEventListener('click', this._onPlayClick, !1),
        this._closeBn.addEventListener('click', this._onCloseClick, !1),
        this.supportsPointer
          ? (this._progressBar.addEventListener('pointerdown', this._onProgressMouseDown, !1),
            this._progressBar.addEventListener('pointermove', this._onProgressMouseMove, !1),
            this._progressBar.addEventListener('pointerup', this._onProgressMouseUp, !1),
            this._progressBar.addEventListener('pointercancel', this._onProgressMouseUp, !1))
          : (this._progressBar.addEventListener('mousedown', this._onProgressMouseDown, !1),
            this._progressBar.addEventListener('mousemove', this._onProgressMouseMove, !1),
            this._progressBar.addEventListener('mouseup', this._onProgressMouseUp, !1),
            this._progressBar.addEventListener('mouseleave', this._onProgressMouseUp, !1)));
    }
    _unbindEvents() {
      (this._pauseBn.removeEventListener('click', this._onPauseClick, !1),
        this._playBn.removeEventListener('click', this._onPlayClick, !1),
        this._closeBn.removeEventListener('click', this._onCloseClick, !1),
        this.supportsPointer
          ? (this._progressBar.removeEventListener('pointerdown', this._onProgressMouseDown, !1),
            this._progressBar.removeEventListener('pointermove', this._onProgressMouseMove, !1),
            this._progressBar.removeEventListener('pointerup', this._onProgressMouseUp, !1),
            this._progressBar.removeEventListener('pointercancel', this._onProgressMouseUp, !1))
          : (this._progressBar.removeEventListener('mousedown', this._onProgressMouseDown, !1),
            this._progressBar.removeEventListener('mousemove', this._onProgressMouseMove, !1),
            this._progressBar.removeEventListener('mouseup', this._onProgressMouseUp, !1),
            this._progressBar.removeEventListener('mouseleave', this._onProgressMouseUp, !1)));
    }
  };
}
