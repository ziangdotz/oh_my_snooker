/** Interior loading/recovery surface independent of the WebGL engine. */
export default function createInteriorDesignTransitionView({ onRetry, onBack, fonts }) {
  // The HTML owns the first paint. Adopt its nodes without hiding, replacing,
  // or reparenting the visible card and its already-created loading animation.
  const element = document.getElementById('interior-transition');
  const title = element.querySelector('#interior-transition-title');
  const message = element.querySelector('.interior-transition-message');
  const status = element.querySelector('.interior-loading-status');
  const actions = element.querySelector('.interior-transition-actions');
  const retry = element.querySelector('[data-action="retry"]');
  const back = element.querySelector('[data-action="back"]');
  let handingOff = false;
  function updateDisplayPhase() {
    element.dataset.displayPhase =
      handingOff || element.dataset.fontState === 'pending' ? 'handoff' : 'content';
  }
  function settleFontState(state) {
    element.dataset.fontState = state;
    updateDisplayPhase();
    if (element.dataset.state === 'error') {
      retry.focus();
    }
  }
  fonts.ready().then(settleFontState);
  retry.addEventListener('click', onRetry);
  back.addEventListener('click', onBack);
  return {
    loading(name, { handoff = false } = {}) {
      handingOff = handoff;
      element.hidden = false;
      element.dataset.state = 'loading';
      title.textContent = name;
      status.textContent = 'LOADING VENUE...';
      message.textContent = 'Preparing the venue and lighting. Returning to the lounge when ready.';
      actions.hidden = true;
      updateDisplayPhase();
    },
    fail(details = {}) {
      handingOff = false;
      element.hidden = false;
      element.dataset.state = 'error';
      title.textContent = details.title || 'Venue unavailable';
      message.textContent = details.message || 'Please try again or return to your previous venue.';
      status.textContent = 'VENUE UNAVAILABLE';
      actions.hidden = false;
      updateDisplayPhase();
      retry.focus();
    },
    hide() {
      element.hidden = true;
    },
  };
}
