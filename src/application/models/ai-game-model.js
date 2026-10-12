// Explicit live dependencies preserve initialization and shared state.
export default function createAiGameModel(dependencies) {
  return class AiGameModel extends dependencies.BaseGameModel {
    constructor() {
      super();
    }
    asyncLaunch(t) {
      let e = Object.create(null);
      ((e.sceneId = dependencies.localGameSettings.getGameDefineData('sceneId')),
        (e.ballSet = dependencies.localGameSettings.getGameDefineData('ballSet')),
        (e.ballRadius = dependencies.localGameSettings.getGameDefineData('ballRadius')),
        t(e));
    }
    setSelectedAIIndex(t) {
      dependencies.aiRegistry.setSelectedIndex(t);
    }
  };
}
