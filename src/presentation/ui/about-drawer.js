/** About shares the venue drawer's motion, modal stack and close lifecycle. */
export default function createAboutDrawer({ InteriorDesignDialog, aboutTemplate }) {
  return class AboutDrawer extends InteriorDesignDialog {
    _createElement() {
      const element = super._createElement();
      element.classList.remove('interior-venue-drawer');
      element.classList.add('interior-about-drawer');
      const title = element.querySelector('h2');
      title.id = 'interior-about-title';
      title.textContent = 'ABOUT';
      element.setAttribute('aria-labelledby', title.id);
      this._closeButton.setAttribute('aria-label', 'Close About');
      this._list.classList.add('interior-about-content');
      this._list.setAttribute('aria-label', 'About the game');
      this._list.tabIndex = 0;
      this._list.innerHTML = aboutTemplate;
      return element;
    }
    _handleKey(event) {
      if (!this.isActive || this._blocked || this._busy) {
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        // The focusable content region uses native keyboard scrolling.
        return;
      }
      if (event.key === 'Tab') {
        const targets = [
          ...this.element.querySelectorAll('button:not(:disabled), a[href], [tabindex="0"]'),
        ];
        const current = targets.indexOf(document.activeElement);
        const next =
          current < 0
            ? event.shiftKey
              ? targets.length - 1
              : 0
            : (current + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
        event.preventDefault();
        this._focusButton(targets[next]);
        return;
      }
      super._handleKey(event);
    }
  };
}
