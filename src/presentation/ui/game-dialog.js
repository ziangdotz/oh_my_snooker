/** Game panels reuse the modal stack and the application's existing Tween clock. */
export default function createGameDialog({
  ActionDialog,
  UiComponent,
  PropertyTween,
  Easing,
  dialogEvents,
}) {
  return class GameDialog extends ActionDialog {
    get managesGameMotion() {
      return true;
    }
    _createElement() {
      const element = super._createElement();
      element.classList.add('game-ui-panel');
      element.dataset.panel = this.id;
      element.setAttribute('role', 'dialog');
      element.setAttribute('aria-modal', 'true');
      this._head.id = 'game-panel-' + this.id;
      element.setAttribute('aria-labelledby', this._head.id);
      element.inert = true;
      return element;
    }
    _createTween() {
      const header = document.createElement('header');
      header.className = 'game-ui-panel-header';
      header.append(this._head);
      this.element.prepend(header);
      this._scrollBody = document.createElement('div');
      this._scrollBody.className = 'game-ui-panel-content';
      this._scrollBody.tabIndex = 0;
      this._scrollBody.setAttribute('aria-label', 'Panel content');
      for (const body of this._bodies) {
        this._scrollBody.append(body.container);
      }
      this.element.insertBefore(this._scrollBody, this._foot);
      for (const section of this.element.querySelectorAll('section[data-sid]')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'game-ui-choice';
        while (section.firstChild) {
          button.append(section.firstChild);
        }
        section.append(button);
      }
      // The original first menu action resumes play; avoid a duplicate footer action.
      this._foot.hidden = this.id === 'pauseBox';
      return new PropertyTween(({ progress }) => {
        this.element.style.display = progress > 0 ? 'flex' : 'none';
        this.element.style.opacity = progress;
        this.element.style.transform = 'translate3d(-50%,-50%,0)';
      }).reset({ progress: 0 }, { progress: 1 }, Easing.Power1.easeOut, this._duration());
    }
    _duration() {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.016 : 0.18;
    }
    requireUpdate() {
      super.requireUpdate();
      this.onMotionUpdate?.();
    }
    _onActivate() {
      this._openedOnce = true;
      this._closing = false;
      this._focusPending = true;
      this.element.inert = false;
      this._scrollBody.scrollTop = 0;
      this._tween.reset({ progress: 0 }, { progress: 1 }, Easing.Power1.easeOut, this._duration());
      this._tween.timeScale = 1;
      super._onActivate();
      this.requireUpdate();
    }
    _onDeactivate() {
      this._closing = this._openedOnce === true;
      this.element.inert = true;
      if (this._tween) {
        this._tween.timeScale = 1.25;
      }
      // ActionDialog emits CLOSE immediately; this extension waits for the exit Tween.
      UiComponent.prototype._onDeactivate.call(this);
    }
    _bindEvents() {
      super._bindEvents();
      this._onGameKey = (event) => this._handleGameKey(event);
      document.addEventListener('keydown', this._onGameKey, true);
    }
    _unbindEvents() {
      super._unbindEvents();
      document.removeEventListener('keydown', this._onGameKey, true);
    }
    _onEnabledChanged(enabled) {
      super._onEnabledChanged(enabled);
      this.element.inert = !enabled || !this.isActive;
      for (const button of this.element.querySelectorAll('.game-ui-choice')) {
        button.disabled = !enabled;
      }
    }
    _targets() {
      return [...this.element.querySelectorAll('button:not(:disabled), [tabindex="0"]')].filter(
        (node) => !node.closest('[hidden]'),
      );
    }
    get defaultFocusTarget() {
      return this.id === 'confirm'
        ? this._closeBn
        : this._targets().find((node) => node.classList.contains('game-ui-choice')) ||
            this._closeBn;
    }
    _focus(node) {
      node.focus({ preventScroll: true });
      if (this._scrollBody.contains(node) && node !== this._scrollBody) {
        const body = this._scrollBody.getBoundingClientRect();
        const target = node.getBoundingClientRect();
        if (target.top < body.top) {
          this._scrollBody.scrollTop += target.top - body.top;
        } else if (target.bottom > body.bottom) {
          this._scrollBody.scrollTop += target.bottom - body.bottom;
        }
      }
    }
    _handleGameKey(event) {
      if (!this.isActive || this.blocked || !this.enabled) {
        return;
      }
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        this._onCloseClick();
      } else if (event.key === 'Tab') {
        const targets = this._targets();
        const index = targets.indexOf(document.activeElement);
        const next =
          index < 0
            ? event.shiftKey
              ? targets.length - 1
              : 0
            : (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
        event.preventDefault();
        this._focus(targets[next]);
      } else if (
        ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key) &&
        document.activeElement.classList.contains('game-ui-choice')
      ) {
        const choices = [...this.element.querySelectorAll('.game-ui-choice')].filter(
          (node) => !node.closest('[hidden]'),
        );
        const index = choices.indexOf(document.activeElement);
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? choices.length - 1
              : (index + (event.key === 'ArrowUp' ? -1 : 1) + choices.length) % choices.length;
        event.preventDefault();
        this._focus(choices[next]);
      }
    }
    update(dt) {
      super.update(dt);
      if (this.isActive && this._focusPending && !this.blocked && !this.needsUpdate) {
        this._focusPending = false;
        this._focus(this.defaultFocusTarget);
      }
      if (!this.isActive && this._closing && this._tween.isComplete(true)) {
        this._closing = false;
        this.emit(dialogEvents.CLOSE, this);
      }
      return this.needsUpdate;
    }
  };
}
