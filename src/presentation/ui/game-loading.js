/** Internal game waits share the venue loading surface without taking over its recovery state. */
export default function createGameLoading() {
  const transition = document.getElementById('interior-transition');
  const element = transition.cloneNode(true);
  element.removeAttribute('id');
  element.removeAttribute('aria-labelledby');
  element.setAttribute('role', 'status');
  element.setAttribute('aria-label', 'Preparing the game');
  element.setAttribute('aria-busy', 'true');
  element.classList.remove('interior-transition');
  element.classList.add('game-ui-loading');
  element.dataset.state = 'loading';
  element.dataset.displayPhase = 'content';
  element.hidden = true;
  for (const node of element.querySelectorAll('[id]')) {
    node.removeAttribute('id');
  }
  element.querySelector('.interior-transition-actions').remove();
  element.querySelector('h2').textContent = 'Preparing the table';
  element.querySelector('.interior-loading-status').textContent = 'SETTING UP YOUR GAME...';
  element.querySelector('.interior-transition-message').textContent =
    'Getting your game ready. Please wait.';
  document.body.append(element);
  return {
    show() {
      // Initial launch and venue changes already have their own visible loading/recovery card.
      element.hidden = !transition.hidden;
    },
    hide() {
      element.hidden = true;
    },
  };
}
