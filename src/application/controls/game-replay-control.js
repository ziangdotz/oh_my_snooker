/** Route focused replay UI keys to the existing replay actions. */
export default function createGameReplayControl(ReplayControl) {
  return class GameReplayControl extends ReplayControl {
    constructor(...args) {
      super(...args);
      const onItemClick = this._onControlItemClick;
      this._onControlItemClick = (action, ...data) => {
        if (action === 'camera') {
          this._setCamCtlIndex(this._activeCamCtlIndex + 1);
        } else if (action === 'slow-on') {
          this._play();
          this._movieClip.timeScale = 0.25;
          this._ui.slomo(true);
        } else if (action === 'slow-off') {
          this._movieClip.timeScale = 1;
          this._ui.slomo(false);
        } else {
          onItemClick(action, ...data);
        }
      };
    }
    _onDeactvate() {
      this._movieClip.timeScale = 1;
      this._ui.slomo(false);
      super._onDeactvate();
    }
  };
}
