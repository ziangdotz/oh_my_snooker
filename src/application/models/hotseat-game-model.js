/** Two human identities share the original referee and round-result implementation. */
export default function createHotseatGameModel(SnookerGameModel, dependencies) {
  return class HotseatGameModel extends SnookerGameModel {
    get isHotseat() {
      return this._hotseat;
    }
    asyncLaunch(callback) {
      const config = dependencies.session.config;
      this._hotseat = Boolean(config);
      if (!config) {
        super.asyncLaunch(callback);
        return;
      }
      this.release();
      this._nextOpener = 0;
      this._changeState(dependencies.GameState.a.PENDING);
      const settings = dependencies.localGameSettings;
      const definition = Object.fromEntries(
        ['sceneId', 'ballSet', 'ballRadius', 'ballMass'].map((key) => [
          key,
          settings.getGameDefineData(key),
        ]),
      );
      const info = settings.getLocalUserInfo();
      for (const [index, displayName] of config.names.entries()) {
        this._players.push(
          new dependencies.Player.a(
            { ...info, userId: 'hotseat-player-' + (index + 1), displayName },
            dependencies.Player.a.PLAYER_TYPE_USER,
          ),
        );
      }
      definition.stickName = [info.stickName];
      this._locRef = dependencies.refereeRegistry.a.getInstance(
        settings.getGameDefineData('refId'),
      );
      callback(definition);
    }
    reqReset(simulator) {
      if (!this.isHotseat) {
        return super.reqReset(simulator);
      }
      const states = dependencies.GameState.a;
      if (this.gState & (states.ERROR | states.NO_GAME)) {
        return;
      }
      const pending = this.gState === states.PENDING;
      this._changeState(states.JUDGING);
      return this._onResetResponse(simulator, pending, this._nextOpener++ % 2, 0);
    }
  };
}
