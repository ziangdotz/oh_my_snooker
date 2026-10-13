/** Present the existing result data without changing penalty or winner calculations. */
export default function createGameResults(Dialog, practice) {
  return class GameResults extends Dialog {
    data(data) {
      super.data({
        ...data,
        players: data.players.map((player) => ({
          ...player,
          displayName: '',
          accuracy: player.accuracy,
          brk: player.brk,
          maxbrk: player.maxbrk,
        })),
      });
      if (!practice) {
        data.players.forEach((player, index) => {
          this._names[index].textContent = player.displayName.toUpperCase();
        });
        if (data.players.every((player) => player.type === 0)) {
          const scores = data.players.map(
            (player, index) => player.pts - data.players[1 - index].penalty,
          );
          this._head.textContent =
            scores[0] === scores[1]
              ? 'DRAW'
              : data.players[scores[0] > scores[1] ? 0 : 1].displayName.toUpperCase() + ' WINS';
          this._head.className = 'box-head bright-copy';
        }
      }
      this.element.classList.add('game-ui-results');
      this._retryBn.textContent = 'PLAY AGAIN';
      this._closeBn.textContent = 'MAIN MENU';
      if (practice) {
        this.head('RESULTS');
        this._foulsValue.textContent = String(Math.abs(data.players[0].penalty));
      } else {
        const label = this._head.textContent;
        this._head.textContent = label === 'DARW' ? 'DRAW' : label;
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
