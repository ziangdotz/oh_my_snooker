/** Future multiplayer entry uses the same drawer motion, close and focus lifecycle. */
export default function createMoreThingsDialog(dependencies) {
  return class MoreThingsDialog extends dependencies.InteriorDesignDialog {
    _createElement() {
      const element = super._createElement();
      element.classList.remove('interior-venue-drawer');
      element.classList.add('interior-more-things');
      const title = element.querySelector('h2');
      title.id = 'interior-more-things-title';
      title.textContent = 'One more thing...';
      element.setAttribute('aria-labelledby', title.id);
      this._closeButton.setAttribute('aria-label', 'Close One more thing...');
      this._list.setAttribute('aria-label', 'Play together');
      return element;
    }
    data() {
      this._busy = false;
      this._list.replaceChildren();
      const options = document.createElement('div');
      options.className = 'interior-more-options';
      for (const [title, description, mode] of [
        ['TWO-PLAYER MATCH', 'Share one computer and take turns.', 'SAME COMPUTER'],
        ['ROOMS', 'Create a private room or join a friend.', 'PLAY ONLINE'],
      ]) {
        const card = document.createElement('article');
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
        status.textContent = 'COMING SOON';
        card.append(label, heading, copy, status);
        options.append(card);
      }
      this._list.append(options);
      return this;
    }
    _handleKey(event) {
      // Informational cards have no selection action; Tab reaches Close and Back.
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        return;
      }
      super._handleKey(event);
    }
  };
}
