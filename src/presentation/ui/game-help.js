/** Help owns keyboard focus while it is open, including the first-play introduction. */
export default function createGameHelp(Dialog) {
  return class GameHelp extends Dialog {
    constructor(id) {
      super(id);
      this._lockScreen = true;
      this.element.setAttribute('aria-modal', 'true');
    }
  };
}
