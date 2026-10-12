export default function createImmediateGuideControl(PlayerTurnControl, controlEvents) {
  return class ImmediateGuideControl extends PlayerTurnControl {
    bindUI(layer, instances) {
      super.bindUI(layer, instances);
      this._guideLayer = layer;
    }

    _onActvate() {
      const showGuide = this._needsPopNaviBox > 0;
      this._needsPopNaviBox = 0;
      super._onActvate();
      if (showGuide) {
        this._evtBus.emit(controlEvents.POP_BOX, 'controlsNaviBox');
        // Commit focus and modal blocking before the next input event, without advancing time.
        this._guideLayer.update(0);
      }
    }
  };
}
