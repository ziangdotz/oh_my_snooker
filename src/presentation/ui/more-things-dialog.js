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
      const introduction = document.createElement('p');
      introduction.className = 'interior-more-introduction';
      introduction.textContent = 'More ways to play together are on the way.';
      this._list.append(introduction);
      for (const [title, description] of [
        ['ROOMS', 'Create or join a room.'],
        ['TWO-PLAYER MATCH', 'Challenge another player.'],
      ]) {
        const card = document.createElement('article');
        card.className = 'interior-more-option';
        const heading = document.createElement('h3');
        heading.textContent = title;
        const copy = document.createElement('p');
        copy.textContent = description;
        const status = document.createElement('span');
        status.className = 'interior-more-status';
        status.textContent = 'COMING SOON';
        card.append(heading, copy, status);
        this._list.append(card);
      }
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
