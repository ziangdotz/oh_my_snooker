/** Present the existing result data without changing penalty or winner calculations. */
export default function createGameResults(Dialog, practice) {
  return class GameResults extends Dialog {
    data(data) {
      super.data(data);
      this.element.classList.add('game-ui-results');
      this._retryBn.textContent = 'PLAY AGAIN';
      this._closeBn.textContent = 'MAIN MENU';
      if (practice) {
        this.head('RESULTS');
        this._foulsValue.textContent = String(Math.abs(data.players[0].penalty));
      } else {
        const label = this._head.textContent;
        this.head(label === 'DARW' ? 'DRAW' : label);
        for (let index = 0; index < this._fouls.length; index++) {
          this._fouls[index].textContent = String(Math.abs(data.players[index].penalty));
        }
      }
      for (const label of this.element.querySelectorAll('.fouls-label')) {
        label.textContent = 'PENALTY POINTS';
      }
      return this;
    }
  };
}
