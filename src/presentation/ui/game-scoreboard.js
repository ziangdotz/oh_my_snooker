export default function createGameScoreboard(Scoreboard) {
  return class GameScoreboard extends Scoreboard {
    constructor(id) {
      super(id);
      this._styleOpts.on = 'block';
    }
    _createElement() {
      const element = super._createElement();
      element.classList.add('game-ui-hud');
      element.setAttribute('aria-label', 'Scoreboard');
      this._status = document.createElement('div');
      this._status.className = 'game-ui-status';
      this._status.setAttribute('role', 'status');
      element.append(this._status);
      return element;
    }
    resetPlayers(players) {
      super.resetPlayers(players);
      if (players.length > 1) {
        this._groups[1].e.style.display = 'grid';
      }
      for (const group of this._groups) {
        group.head.e.title = group.head.value;
      }
      this.element.dataset.mode = players.length === 1 ? 'practice' : 'match';
      return this;
    }
    syncResults(players, playerIndex, ballOn) {
      super.syncResults(players, playerIndex, ballOn);
      for (let index = 0; index < this._groups.length; index++) {
        const group = this._groups[index];
        group.e.classList.toggle('game-ui-current-player', index === playerIndex);
        group.e.setAttribute(
          'aria-label',
          group.head.value +
            ', score ' +
            group.pts.value +
            (index === playerIndex ? ', current turn' : ''),
        );
        group.ballOn.e.setAttribute('role', 'img');
        group.ballOn.e.setAttribute(
          'aria-label',
          index === playerIndex
            ? 'Target: ' +
                (['none', 'red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black'][ballOn] ||
                  'colour')
            : 'Waiting turn',
        );
      }
    }
    setStatus(text) {
      if (this._status.textContent !== text) {
        this._status.textContent = text;
      }
    }
  };
}
