/** A single local camera/input owner follows the referee's current human player. */
export default function createHotseatMatchController(MatchController, GameState, ControllerState) {
  return class HotseatMatchController extends MatchController {
    _createPlayerControllers() {
      if (!this._model.isHotseat) {
        super._createPlayerControllers();
        return;
      }
      this._fpc.reset(
        this._gView,
        this._simulator,
        this._model,
        0,
        this._model.players[0].getInfoData('stickName'),
      );
      this._playerCtls.push(this._fpc);
    }
    _onModelResponse(response) {
      const index = this._model.getContext('playerIndex');
      if (this._model.isHotseat && (index !== this._fpc.gPlayerIndex || response === 'restart')) {
        // Recording has already been saved by PlayerTurnControl before judgment.
        // Unbinding cancels held keys, dragging and unfinished cue movement.
        this._activeSubControl?.deactivate();
        this._fpc.deactivate();
        this._fpc._gPlayerIndex = index;
        if (this._state === ControllerState.ACTING) {
          this._fpc.syncEnter(this._model.getControllerSetting(), this._gView.camera.position);
        }
        this._fpc.gotoState0(true);
      }
      super._onModelResponse(response);
    }
    _syncGameStatus() {
      super._syncGameStatus();
      if (
        this._model.isHotseat &&
        this._displayState === GameState.READY &&
        this._model.getContext('ballOn') !== 0 &&
        this._activeSubControl?.name !== 'replay'
      ) {
        const player = this._model.players[this._model.getContext('playerIndex')];
        const phase =
          this._activeSubControl?.name === 'inHand' ? ' · BALL IN HAND' : ' · YOUR TURN';
        this._uiLayer?.getRegisteredUI('scoreBar')?.setStatus(player.displayName + phase);
      }
    }
  };
}
