/** Keeps preserved menu actions while replacing its presentation motion. */
export default function createInteriorSideMenu(dependencies) {
  const ITEM_DURATION = 0.36;
  const FADE_DURATION = 0.27;
  const ITEM_STAGGER = 0.018;
  const ENTER_TRAVEL = 8;
  const EXIT_TRAVEL = 3;
  const EXIT_DURATION = 0.16;
  const REDUCED_DURATION = 0.016;
  return class InteriorSideMenu extends dependencies.SideMenu {
    _createElement() {
      const element = super._createElement();
      element.classList.add('interior-home-menu');
      const item = new dependencies.MenuItem(this, 'interior design', 3, false);
      item.element.classList.add('interior-menu-item');
      item.element.setAttribute('role', 'button');
      item.element.setAttribute('tabindex', '0');
      item.element.setAttribute('aria-haspopup', 'dialog');
      this._interiorItem = item;
      element.insertBefore(item.element, this._bns[2].element);
      this._bns.splice(2, 0, item);
      const moreItem = new dependencies.MenuItem(this, 'One more thing...', 4, false);
      moreItem.element.classList.add('interior-more-menu-item');
      moreItem.element.querySelector('.inner').textContent = 'One more thing...';
      moreItem.element.setAttribute('aria-haspopup', 'dialog');
      this._moreItem = moreItem;
      element.insertBefore(moreItem.element, this._bns[1].element);
      this._bns.splice(1, 0, moreItem);
      this._aboutItem = this._bns.at(-1);
      this._aboutItem.element.classList.add('interior-about-menu-item');
      this._aboutItem.element.setAttribute('aria-haspopup', 'dialog');
      for (const [position, button] of this._bns.entries()) {
        button.element.dataset.position = String(position + 1).padStart(2, '0');
        button.element.setAttribute('role', 'button');
        button.element.setAttribute('tabindex', '0');
      }
      this._onMenuKey = (event) => {
        const button = this._getButtonByElement(event.target);
        if (!button || !this.isActive || this.element.inert) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          button.element.click();
        } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const buttons = this._bns.filter((entry) => entry.enabled);
          const index = buttons.indexOf(button);
          const next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
          buttons[next].element.focus();
        }
      };
      this._onMenuFocus = (event) => {
        const button = this._getButtonByElement(event.target);
        if (button) {
          button.hovered = Number(event.type === 'focusin');
        }
      };
      return element;
    }
    _createTween() {
      this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._motionEntering = true;
      this._motionStates = this._bns.map(() => ({ opacity: 0, y: ENTER_TRAVEL }));
      this._motionStarts = this._motionStates.map((state) => ({ ...state }));
      this._motionDuration = ITEM_DURATION + ITEM_STAGGER * (this._bns.length - 1);
      return new dependencies.PropertyTween(({ progress }) => {
        if (!this._preparingMotion) {
          this._renderMotion(progress);
        }
      }).reset(
        { progress: 0 },
        { progress: 1 },
        dependencies.Easing.defaultEase,
        this._motionDuration,
      );
    }
    _onActivate() {
      super._onActivate();
      this.element.inert = false;
      this._prepareMotion(true);
    }
    _onDeactivate() {
      super._onDeactivate();
      this.element.inert = true;
      this._prepareMotion(false);
    }
    _prepareMotion(entering) {
      this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this._motionEntering = entering;
      this._motionStarts = this._motionStates.map((state) => ({
        opacity: state.opacity,
        y: this._reducedMotion ? 0 : entering && state.opacity === 0 ? ENTER_TRAVEL : state.y,
      }));
      this._motionDuration = this._reducedMotion
        ? REDUCED_DURATION
        : entering
          ? ITEM_DURATION + ITEM_STAGGER * (this._bns.length - 1)
          : EXIT_DURATION;
      // Capture the visible pose, then prepare the inherited forward/reverse lifecycle.
      this._preparingMotion = true;
      this._tween.reset(
        { progress: 0 },
        { progress: 1 },
        dependencies.Easing.defaultEase,
        this._motionDuration,
      );
      if (!entering) {
        this._tween.pause(this._tween.totalLifeTime, true);
      }
      this._preparingMotion = false;
      this._tween.timeScale = 1;
    }
    _renderMotion(progress) {
      const elapsed = this._motionEntering ? progress : 1 - progress;
      for (const [index, item] of this._bns.entries()) {
        const start = this._motionStarts[index];
        const time = elapsed * this._motionDuration - index * ITEM_STAGGER;
        const position = this._reducedMotion
          ? elapsed
          : this._motionEntering
            ? dependencies.Easing.Power3.easeOut(this._clampMotion(time / ITEM_DURATION))
            : elapsed * elapsed;
        const fade = this._reducedMotion
          ? elapsed
          : this._smoothFade(this._motionEntering ? time / FADE_DURATION : elapsed);
        const targetOpacity = this._motionEntering ? 1 : 0;
        const targetY = this._reducedMotion ? 0 : this._motionEntering ? 0 : start.y - EXIT_TRAVEL;
        const state = this._motionStates[index];
        state.opacity = start.opacity + (targetOpacity - start.opacity) * fade;
        state.y = start.y + (targetY - start.y) * position;
        item.display = state.opacity;
      }
      const visible = this._motionStates.some((state) => state.opacity > 0);
      this.element.style.display = visible ? this._styleOpts.on : this._styleOpts.off;
    }
    _clampMotion(value) {
      return Math.max(0, Math.min(1, value));
    }
    _smoothFade(value) {
      const progress = this._clampMotion(value);
      return progress * progress * (3 - 2 * progress);
    }
    setCurrentInterior(design) {
      const current = design?.displayName || 'Wall study';
      this._interiorItem.element.setAttribute(
        'aria-label',
        'Interior design, current venue: ' + current,
      );
    }
    focusInterior() {
      this._interiorItem.element.focus();
    }
    focusMoreThings() {
      this._moreItem.element.focus();
    }
    focusAbout() {
      this._aboutItem.element.focus({ preventScroll: true });
    }
    update(dt) {
      const needsUpdate = super.update(dt);
      // Preserved items still own hover/selection; the extension owns their visual motion.
      for (const [index, item] of this._bns.entries()) {
        item.element.style.removeProperty('background-color');
        const inner = item.element.querySelector('.inner');
        inner.style.removeProperty('color');
        inner.style.removeProperty('transform');
        item.element.style.opacity = item.display;
        item.element.style.transform = this._motionTransform(this._motionStates[index].y);
        item.element.classList.toggle('is-highlighted', Boolean(item.hovered || item.selected));
      }
      return needsUpdate;
    }
    _motionTransform(offset) {
      return 'translate3d(0,' + (this._reducedMotion ? 0 : offset) + 'px,0)';
    }
    _bindEvents() {
      super._bindEvents();
      this.element.addEventListener('keydown', this._onMenuKey);
      this.element.addEventListener('focusin', this._onMenuFocus);
      this.element.addEventListener('focusout', this._onMenuFocus);
    }
    _unbindEvents() {
      super._unbindEvents();
      this.element.removeEventListener('keydown', this._onMenuKey);
      this.element.removeEventListener('focusin', this._onMenuFocus);
      this.element.removeEventListener('focusout', this._onMenuFocus);
    }
  };
}
