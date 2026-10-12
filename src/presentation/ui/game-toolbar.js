export default function createGameToolbar(Toolbar) {
  return class GameToolbar extends Toolbar {
    constructor(id) {
      super(id);
      const click = this._onClick;
      this._onClick = (event) => {
        const button = event.target.closest('button[data-action]');
        if (button && this.element.contains(button)) {
          click({ target: button });
        }
      };
    }
    _updateGroup() {
      super._updateGroup();
      for (const record of Object.values(this._buttons)) {
        if (record.enabled) {
          record.e.style.display = 'grid';
        }
      }
    }
    _createElement() {
      const element = super._createElement();
      element.classList.add('game-ui-toolbar');
      element.setAttribute('aria-label', 'Game controls');
      for (const [action, record] of Object.entries(this._buttons)) {
        const old = record.e;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'game-ui-icon-button control-button-opa';
        button.dataset.action = action;
        button.setAttribute('aria-label', action === 'pause' ? 'Pause game' : 'Replay last shot');
        button.title = action === 'pause' ? 'Pause game' : 'Replay last shot';
        button.style.display = old.style.display;
        const icon = document.createElement('span');
        icon.className = old.className.replace('control-button-opa', '').trim();
        icon.setAttribute('aria-hidden', 'true');
        button.append(icon);
        old.replaceWith(button);
        record.e = button;
      }
      return element;
    }
  };
}
