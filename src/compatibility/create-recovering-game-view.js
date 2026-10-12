import installSceneRecovery from './install-scene-recovery.js';

/** Add recovery to the preserved view without changing its update/scene algorithms. */
export default function createRecoveringGameView(GameView, Babylon) {
  return class RecoveringGameView extends GameView {
    _buildScene() {
      super._buildScene();
      installSceneRecovery(Babylon, this._scene, () => this.requireRender(2));
    }
  };
}
