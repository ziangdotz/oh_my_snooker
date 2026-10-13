import createHotseatSettings from '../../shared/data/hotseat-settings.js';

/** Local setup replaces the contents of the existing multiplayer drawer. */
export default function createMoreThingsDialog(dependencies) {
  const { validateHotseatNames } = createHotseatSettings();
  return class MoreThingsDialog extends dependencies.InteriorDesignDialog {
    constructor(id) {
      super(id);
      this._onBack = () => {
        if (this._page === 'setup' && !this._busy && !this._blocked) {
          this._saveDraft();
          this.emit('draft-change', this._draft, 'overview');
          this._showOverview();
        } else {
          this._onClose();
        }
      };
      this._onDraftInput = () => {
        this._error.textContent = '';
        this._nameInputs.forEach((input) => input.removeAttribute('aria-invalid'));
        this._saveDraft();
      };
      this._onSetupClick = (event) => {
        if (!this.isActive || this._blocked || this._busy) {
          return;
        }
        if (event.target.closest('[data-hotseat-setup]')) {
          this._showSetup();
        }
      };
      this._onSubmit = (event) => {
        event.preventDefault();
        if (this._busy || this._blocked || !this.isActive) {
          return;
        }
        this._saveDraft();
        const result = validateHotseatNames(this._draft.names);
        this._error.textContent = result.error;
        if (result.error) {
          const input = this._nameInputs[result.invalidIndex ?? 1];
          input.setAttribute('aria-invalid', 'true');
          input.focus({ preventScroll: true });
          return;
        }
        this.emit('start-match', { names: result.names, venue: this._draft.venue });
      };
    }
    _createElement() {
      const element = super._createElement();
      element.classList.remove('interior-venue-drawer');
      element.classList.add('interior-more-things');
      const title = element.querySelector('h2');
      title.id = 'interior-more-things-title';
      title.textContent = 'PLAY TOGETHER';
      element.setAttribute('aria-labelledby', title.id);
      this._closeButton.setAttribute('aria-label', 'Close PLAY TOGETHER');
      this._list.setAttribute('aria-label', 'Play together');
      return element;
    }
    data({ designs, currentId, draft, page = 'overview' }) {
      this._designs = designs;
      this._draft = draft || { names: ['', ''], venue: currentId };
      if (!designs.some((design) => design.id === this._draft.venue)) {
        this._draft.venue = currentId;
      }
      this._showOverview();
      if (page === 'setup') {
        this._showSetup();
      }
      return this;
    }
    _showOverview() {
      this._busy = false;
      this._page = 'overview';
      this.element.querySelector('h2').textContent = 'PLAY TOGETHER';
      this._startButton?.remove();
      this._backButton.textContent = 'BACK';
      this._list.replaceChildren();
      const options = document.createElement('div');
      options.className = 'interior-more-options';
      for (const [title, description, mode] of [
        ['TWO-PLAYER MATCH', 'Share one computer and take turns.', 'SAME COMPUTER'],
        ['ROOMS', 'Create a private room or join a friend.', 'PLAY ONLINE'],
      ]) {
        const local = mode === 'SAME COMPUTER';
        const card = document.createElement(local ? 'button' : 'article');
        if (local) {
          card.type = 'button';
          card.dataset.hotseatSetup = '';
        }
        card.className = 'interior-more-option';
        card.classList.toggle('is-featured', mode === 'SAME COMPUTER');
        const label = document.createElement('span');
        label.className = 'interior-more-eyebrow';
        label.textContent = mode;
        const heading = document.createElement('h3');
        heading.textContent = title;
        const copy = document.createElement('p');
        copy.textContent = description;
        const status = document.createElement('span');
        status.className = 'interior-more-status';
        status.textContent = local ? 'SET UP A MATCH ↗' : 'COMING SOON';
        card.append(label, heading, copy, status);
        options.append(card);
      }
      this._list.append(options);
      this._closeButton.disabled = false;
      this._backButton.disabled = false;
      if (this.isActive && !this._blocked) {
        this._focusButton(options.querySelector('button'));
      }
    }
    _showSetup() {
      this._page = 'setup';
      this.element.querySelector('h2').textContent = 'TWO-PLAYER MATCH';
      this._list.replaceChildren();
      const form = document.createElement('form');
      form.id = 'hotseat-setup-form';
      form.className = 'hotseat-setup-form';
      const names = document.createElement('div');
      names.className = 'hotseat-players';
      this._nameInputs = [0, 1].map((index) => {
        const field = document.createElement('label');
        field.className = 'hotseat-name-field';
        const label = document.createElement('span');
        label.textContent = 'PLAYER ' + (index + 1);
        const input = document.createElement('input');
        input.type = 'text';
        input.name = 'player-' + (index + 1);
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.placeholder = label.textContent;
        input.value = this._draft.names[index];
        input.setAttribute('aria-describedby', 'hotseat-error');
        field.append(label, input);
        names.append(field);
        return input;
      });
      const venues = document.createElement('fieldset');
      venues.className = 'hotseat-venues';
      const legend = document.createElement('legend');
      legend.textContent = 'SELECT VENUE';
      const grid = document.createElement('div');
      grid.className = 'hotseat-venue-grid';
      for (const design of this._designs) {
        const label = document.createElement('label');
        label.className = 'hotseat-venue';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'venue';
        input.value = design.id;
        input.checked = design.id === this._draft.venue;
        const image = document.createElement('img');
        image.src = design.preview;
        image.alt = '';
        image.width = 320;
        image.height = 180;
        const title = document.createElement('span');
        title.textContent = design.code + ' · ' + design.displayName;
        label.append(input, image, title);
        grid.append(label);
      }
      venues.append(legend, grid);
      this._error = document.createElement('p');
      this._error.id = 'hotseat-error';
      this._error.className = 'hotseat-error';
      this._error.setAttribute('role', 'status');
      form.append(names, this._error, venues);
      this._list.append(form);
      this._startButton = document.createElement('button');
      this._startButton.type = 'submit';
      this._startButton.className = 'default-button hotseat-start';
      this._startButton.textContent = 'START MATCH';
      this._startButton.setAttribute('form', form.id);
      this._backButton.parentElement.append(this._startButton);
      this._setupFocusPending = true;
      this.requireUpdate();
    }
    _saveDraft() {
      if (this._page === 'setup') {
        this._draft.names = this._nameInputs.map((input) => input.value);
        this._draft.venue = this._list.querySelector('input[name="venue"]:checked').value;
        this.emit('draft-change', this._draft);
      }
    }
    setBusy() {
      this._busy = true;
      for (const input of this.element.querySelectorAll('input, button')) {
        input.disabled = true;
      }
      this._error.textContent = 'Preparing your table…';
    }
    restoreSetup() {
      this._busy = false;
      for (const input of this.element.querySelectorAll('input, button')) {
        input.disabled = false;
      }
      this._error.textContent = 'Match not started. Your setup is saved; try again when ready.';
      this._focusButton(this._startButton);
    }
    _bindEvents() {
      super._bindEvents();
      this._backButton.removeEventListener('click', this._onClose);
      this._backButton.addEventListener('click', this._onBack);
      this._list.addEventListener('click', this._onSetupClick);
      this._list.addEventListener('input', this._onDraftInput);
      this.element.addEventListener('submit', this._onSubmit);
    }
    _unbindEvents() {
      this._saveDraft();
      this._backButton.removeEventListener('click', this._onBack);
      this._list.removeEventListener('click', this._onSetupClick);
      this._list.removeEventListener('input', this._onDraftInput);
      this.element.removeEventListener('submit', this._onSubmit);
      super._unbindEvents();
    }
    update(dt) {
      super.update(dt);
      if (this._setupFocusPending && this.isActive && !this._blocked) {
        this._setupFocusPending = false;
        this._focusButton(this._nameInputs[0]);
      }
      return this.needsUpdate;
    }
    _handleKey(event) {
      if (event.key === 'Tab' && this.isActive && !this._blocked && !this._busy) {
        const targets = [
          ...this.element.querySelectorAll('button:not(:disabled), input:not(:disabled)'),
        ].filter((target) => target.type !== 'radio' || target.checked);
        const index = targets.indexOf(document.activeElement);
        const next = (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
        event.preventDefault();
        this._focusButton(targets[next]);
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        return;
      }
      super._handleKey(event);
    }
  };
}
