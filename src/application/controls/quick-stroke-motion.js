export default function createQuickStrokeMotion(StrokeMotion) {
  return class QuickStrokeMotion extends StrokeMotion {
    launch(controller) {
      super.launch(controller);
      const previousPreparation = this._dura_s1;
      this._dura_s1 *= 0.65;
      this._duration -= previousPreparation - this._dura_s1;
      return this._dura_s1 + this._dura_s2;
    }
  };
}
