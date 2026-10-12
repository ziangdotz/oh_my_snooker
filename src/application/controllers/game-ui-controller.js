/** Display existing match state; do not introduce another game state machine. */
export default function createGameUiController(MatchController, GameState) {
  return class GameUiController extends MatchController {
    constructor(application) {
      super(application);
      const restart = this._onRestartConfirm;
      const quit = this._onQuitConfirm;
      this._onRestartConfirm = () => {
        this._uiLayer.clearGameNotices();
        restart();
      };
      this._onQuitConfirm = () => {
        this._uiLayer.clearGameNotices();
        quit();
      };
    }
    _onModelGStateChanged(state) {
      super._onModelGStateChanged(state);
      this._displayState = state;
      this._syncGameStatus();
    }
    _onModelResponse(response) {
      super._onModelResponse(response);
      this._syncGameStatus();
    }
    _activateSubControl(name) {
      super._activateSubControl(name);
      this._syncGameStatus();
    }
    _syncGameStatus() {
      const scoreboard = this._uiLayer?.getRegisteredUI('scoreBar');
      if (!scoreboard) {
        return;
      }
      const ballOn = this._model.getContext('ballOn');
      const phase = this._activeSubControl?.name;
      if (phase === 'inHand' && !this._uiLayer.hasGameInstruction) {
        this._uiLayer.message('PLACE CUE BALL', '', 0, true, 'game-placement-instruction');
      } else if (phase !== 'inHand') {
        this._uiLayer.closeMessage('game-placement-instruction');
      }
      const status =
        phase === 'replay'
          ? 'REPLAY'
          : ballOn === 0
            ? 'FRAME COMPLETE'
            : this._displayState === GameState.SIMULATING
              ? 'BALLS IN MOTION'
              : this._displayState === GameState.JUDGING
                ? 'RESOLVING SHOT'
                : phase === 'inHand'
                  ? 'BALL IN HAND'
                  : this._model.getContext('playerIndex') === this._fpc.gPlayerIndex
                    ? 'YOUR TURN'
                    : 'OPPONENT TURN';
      scoreboard.setStatus(status);
    }
  };
}
