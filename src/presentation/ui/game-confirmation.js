export default function createGameConfirmation(ConfirmationDialog) {
  return class GameConfirmation extends ConfirmationDialog {
    data(message) {
      super.data(message);
      const practice = this.practice === true;
      if (message === 'Are you sure to restart the game?') {
        this.head(practice ? 'RESTART PRACTICE?' : 'RESTART GAME?');
        this._body.message('The current session will end and the table will be reset.');
        this._confirmBn.textContent = practice ? 'RESTART PRACTICE' : 'RESTART GAME';
      } else if (message === 'Are you sure to quit the game?') {
        this.head('RETURN TO THE MENU?');
        this._body.message(
          'Your current session will end. You can start a new game from the menu.',
        );
        this._confirmBn.textContent = 'QUIT TO MENU';
      } else {
        this.head('CONFIRM ACTION');
        this._confirmBn.textContent = 'CONFIRM';
      }
      this._confirmBn.classList.add('game-ui-danger-action');
      this._closeBn.textContent = 'CANCEL';
      return this;
    }
  };
}
