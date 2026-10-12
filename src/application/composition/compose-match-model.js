import createSnookerGameModel from '../models/snooker-game-model.js';
/** Own this type family and its shared state once per game composition. */
export default function composeMatchModel(dependencies) {
  let nextStartingPlayer = 0;
  const SnookerGameModel = createSnookerGameModel({
    get BaseGameModel() {
      return dependencies.BaseGameModel;
    },
    get GameState() {
      return dependencies.GameState;
    },
    get Player() {
      return dependencies.Player;
    },
    get aiRegistry() {
      return dependencies.aiRegistry;
    },
    get gameRecords() {
      return dependencies.gameRecords;
    },
    get localGameSettings() {
      return dependencies.localGameSettings;
    },
    get nextStartingPlayer() {
      return nextStartingPlayer;
    },
    set nextStartingPlayer(value) {
      nextStartingPlayer = value;
    },
    get refereeRegistry() {
      return dependencies.refereeRegistry;
    },
  });

  return { SnookerGameModel };
}
