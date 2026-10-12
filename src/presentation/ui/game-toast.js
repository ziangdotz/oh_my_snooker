export default function createGameToast(ToastDialog) {
  return class GameToast extends ToastDialog {
    _createElement() {
      const element = super._createElement();
      element.classList.add('game-ui-notice');
      element.setAttribute('role', 'status');
      element.setAttribute('aria-live', 'polite');
      element.setAttribute('aria-atomic', 'true');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'game-ui-dismiss close-button';
      button.textContent = '×';
      button.setAttribute('aria-label', 'Dismiss notification');
      this._closeBn.replaceWith(button);
      this._closeBn = button;
      return element;
    }
    data(body, kind = 0) {
      super.data(body, kind);
      this.element.dataset.kind = String(kind);
      this.element.setAttribute('role', kind === 3 ? 'alert' : 'status');
      this.element.setAttribute('aria-live', kind === 3 ? 'assertive' : 'polite');
      return this;
    }
  };
}
