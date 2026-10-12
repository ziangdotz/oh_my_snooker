/** Interior drawer participates in the existing dialog stack and home update loop. */
export default function createInteriorDesignDialog(dependencies) {
  return class InteriorDesignDialog extends dependencies.UiComponent {
    constructor(id) {
      super(id);
      this._blocked = true;
      this._busy = false;
      this._onClose = () => {
        if (!this._busy && !this._blocked) {
          this.emit(dependencies.dialogEvents.USER_CLOSE, this);
        }
      };
      this._onSelect = (event) => {
        const button = event.target.closest('[data-design-id]');
        if (button && !this._busy && !this._blocked && this.isActive) {
          this.emit(dependencies.dialogEvents.ITEM_CLICK, button.dataset.designId);
        }
      };
      this._onKey = (event) => this._handleKey(event);
    }
    get lockScreen() {
      return true;
    }
    get blocked() {
      return this._blocked;
    }
    set blocked(value) {
      this._blocked = value;
    }
    _createElement() {
      const element = document.createElement('aside');
      element.className = 'interior-drawer interior-venue-drawer';
      element.setAttribute('role', 'dialog');
      element.setAttribute('aria-modal', 'true');
      element.setAttribute('aria-labelledby', 'interior-drawer-title');
      element.inert = true;
      const header = document.createElement('header');
      header.className = 'interior-drawer-header';
      const title = document.createElement('h2');
      title.id = 'interior-drawer-title';
      title.textContent = 'SELECT VENUE';
      this._closeButton = document.createElement('button');
      this._closeButton.className = 'interior-close';
      this._closeButton.textContent = '×';
      this._closeButton.setAttribute('aria-label', 'Close venue selection');
      header.append(title, this._closeButton);
      this._list = document.createElement('div');
      this._list.className = 'interior-design-list';
      this._list.setAttribute('aria-label', 'Available venues');
      const footer = document.createElement('footer');
      footer.className = 'interior-drawer-footer';
      this._backButton = document.createElement('button');
      this._backButton.className = 'default-button';
      this._backButton.textContent = 'BACK';
      footer.append(this._backButton);
      element.append(header, this._list, footer);
      return element;
    }
    _createTween() {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return new dependencies.PropertyTween(({ progress }) => {
        this.element.style.display = progress > 0 ? 'flex' : 'none';
        this.element.style.transform = 'translate3d(' + (1 - progress) * 100 + '%,0,0)';
        this.element.style.opacity = progress;
      }).reset(
        { progress: 0 },
        { progress: 1 },
        dependencies.Easing.Power1.easeOut,
        reduced ? 0.016 : 0.32,
      );
    }
    data({ designs, currentId }) {
      this._busy = false;
      this._list.replaceChildren();
      this._closeButton.disabled = false;
      this._backButton.disabled = false;
      for (const design of designs) {
        const selected = design.id === currentId;
        const button = document.createElement('button');
        button.className = 'interior-design-option';
        button.dataset.designId = design.id;
        button.setAttribute('aria-pressed', String(selected));
        const preview = document.createElement('span');
        preview.className = 'interior-design-preview';
        preview.dataset.code = design.code;
        const image = document.createElement('img');
        image.src = design.preview;
        image.alt = '';
        image.width = 320;
        image.height = 180;
        image.addEventListener(
          'error',
          () => {
            image.hidden = true;
            preview.classList.add('is-fallback');
          },
          { once: true },
        );
        preview.append(image);
        const copy = document.createElement('span');
        copy.className = 'interior-design-copy';
        const code = document.createElement('span');
        code.className = 'interior-design-code';
        code.textContent = design.code;
        const name = document.createElement('strong');
        name.textContent = design.displayName;
        const description = document.createElement('span');
        description.className = 'interior-design-description';
        description.textContent = design.description;
        const badge = document.createElement('span');
        badge.className = 'interior-design-badge';
        badge.textContent = selected ? '● CURRENT VENUE' : 'ENTER VENUE ↗';
        copy.append(code, name, description, badge);
        button.append(preview, copy);
        this._list.append(button);
      }
      return this;
    }
    setBusy(id) {
      this._busy = true;
      for (const button of this.element.querySelectorAll('button')) {
        button.disabled = true;
        if (button.dataset.designId) {
          button.setAttribute('aria-pressed', String(button.dataset.designId === id));
        }
      }
    }
    _onActivate() {
      this._closing = false;
      this._focusPending = true;
      this.element.inert = false;
      this._tween.timeScale = 1;
      super._onActivate();
      this.requireUpdate();
    }
    _onDeactivate() {
      this._closing = true;
      this.element.inert = true;
      if (this._tween) {
        this._tween.timeScale = 1.25;
      }
      super._onDeactivate();
    }
    _bindEvents() {
      this._closeButton.addEventListener('click', this._onClose);
      this._backButton.addEventListener('click', this._onClose);
      this._list.addEventListener('click', this._onSelect);
      document.addEventListener('keydown', this._onKey);
    }
    _unbindEvents() {
      this._closeButton.removeEventListener('click', this._onClose);
      this._backButton.removeEventListener('click', this._onClose);
      this._list.removeEventListener('click', this._onSelect);
      document.removeEventListener('keydown', this._onKey);
    }
    update(dt) {
      super.update(dt);
      if (this.isActive && this._focusPending) {
        if (this._blocked) {
          this.requireUpdate();
        } else {
          this._focusPending = false;
          this._focusButton(this._list.querySelector('[aria-pressed="true"]') || this._closeButton);
        }
      }
      if (!this.isActive && this._closing && this._tween.isComplete(true)) {
        this._closing = false;
        this.emit(dependencies.dialogEvents.CLOSE, this);
      }
      return this.needsUpdate;
    }
    _focusButton(button) {
      // Focusing a transformed drawer must not scroll the hidden-overflow game container.
      button.focus({ preventScroll: true });
      if (this._list.contains(button)) {
        const list = this._list.getBoundingClientRect();
        const target = button.getBoundingClientRect();
        if (target.top < list.top) {
          this._list.scrollTop += target.top - list.top;
        } else if (target.bottom > list.bottom) {
          this._list.scrollTop += target.bottom - list.bottom;
        }
      }
    }
    _handleKey(event) {
      if (!this.isActive || this._blocked || this._busy) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this._onClose();
      } else if (event.key === 'Tab') {
        const buttons = [...this.element.querySelectorAll('button:not(:disabled)')];
        const current = buttons.indexOf(document.activeElement);
        const next = (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        event.preventDefault();
        this._focusButton(buttons[next]);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const options = [...this._list.querySelectorAll('button')];
        const current = options.indexOf(document.activeElement);
        const next =
          (current + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
        event.preventDefault();
        this._focusButton(options[next]);
      }
    }
  };
}
