export default function createGameReplay(ReplayControlPanel, dialogEvents, Easing) {
  return class GameReplay extends ReplayControlPanel {
    _createElement() {
      const element = super._createElement();
      element.classList.add('game-ui-replay');
      return element;
    }
    _createTween() {
      return super
        ._createTween()
        .reset(
          { r: 0 },
          { r: 1 },
          Easing.Power1.easeInOut,
          window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.016 : 0.2,
        );
    }
    _onActivate() {
      this._tween.reset(
        { r: 0 },
        { r: 1 },
        Easing.Power1.easeInOut,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.016 : 0.2,
      );
      super._onActivate();
    }
    _onDeactivate() {
      const hadFocus = this.element.contains(document.activeElement);
      super._onDeactivate();
      if (hadFocus) {
        document.getElementById('game-view')?.focus({ preventScroll: true });
      }
    }
    setProgress(progress) {
      super.setProgress(progress);
      this._accessibleProgress = progress;
      const percent = String(Math.round(progress * 100));
      if (this._progressBar.getAttribute('aria-valuenow') !== percent) {
        this._progressBar.setAttribute('aria-valuenow', percent);
        this._progressBar.setAttribute('aria-valuetext', percent + '% through the replay');
      }
    }
    slomo(enabled) {
      super.slomo(enabled);
      this.element.dataset.slomo = String(enabled);
    }
    _bindEvents() {
      super._bindEvents();
      this._onSeekKey = (event) => {
        const keys = { ArrowLeft: -0.02, ArrowRight: 0.02 };
        if (event.key === 'Home' || event.key === 'End' || Object.hasOwn(keys, event.key)) {
          event.preventDefault();
          event.stopPropagation();
          const progress =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? 1
                : Math.max(0, Math.min(1, (this._accessibleProgress || 0) + keys[event.key]));
          this.emit(dialogEvents.ITEM_CLICK, 'seek', progress, true);
        }
      };
      this._onReplayKey = (event) => {
        if (event.code === 'Space') {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) {
            this.emit(dialogEvents.ITEM_CLICK, this.isPlaying ? 'pause' : 'play');
          }
        } else if (['KeyC', 'KeyS', 'Escape'].includes(event.code)) {
          event.preventDefault();
          event.stopPropagation();
          if (!event.repeat) {
            if (event.code === 'KeyS') {
              this._slowHeld = true;
            }
            this.emit(
              dialogEvents.ITEM_CLICK,
              event.code === 'KeyC' ? 'camera' : event.code === 'KeyS' ? 'slow-on' : 'close',
            );
          }
        }
      };
      this._releaseSlow = () => {
        if (this._slowHeld) {
          this._slowHeld = false;
          this.emit(dialogEvents.ITEM_CLICK, 'slow-off');
        }
      };
      this._onReplayKeyUp = (event) => {
        if (event.code === 'KeyS') {
          event.stopPropagation();
          this._releaseSlow();
        }
      };
      this._onReplayFocusOut = (event) => {
        if (!this.element.contains(event.relatedTarget)) {
          this._releaseSlow();
        }
      };
      this._progressBar.addEventListener('keydown', this._onSeekKey);
      this.element.addEventListener('keydown', this._onReplayKey);
      this.element.addEventListener('keyup', this._onReplayKeyUp);
      this.element.addEventListener('focusout', this._onReplayFocusOut);
    }
    _unbindEvents() {
      super._unbindEvents();
      this._progressBar.removeEventListener('keydown', this._onSeekKey);
      this.element.removeEventListener('keydown', this._onReplayKey);
      this.element.removeEventListener('keyup', this._onReplayKeyUp);
      this.element.removeEventListener('focusout', this._onReplayFocusOut);
      this._slowHeld = false;
    }
  };
}
