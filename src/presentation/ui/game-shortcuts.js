export default function createGameShortcuts({ ShortcutBar, PropertyTween, Easing }) {
  return class GameShortcuts extends ShortcutBar {
    _createElement() {
      const element = super._createElement();
      element.classList.add('game-ui-shortcuts');
      return element;
    }
    _createTween() {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return new PropertyTween(({ progress }) => {
        this.element.style.display = progress > 0 ? 'flex' : 'none';
        this.element.style.opacity = progress;
      }).reset({ progress: 0 }, { progress: 1 }, Easing.Power1.easeOut, reduced ? 0.016 : 0.16);
    }
    _onActivate() {
      this._tween.reset(
        { progress: 0 },
        { progress: 1 },
        Easing.Power1.easeOut,
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.016 : 0.16,
      );
      super._onActivate();
    }
  };
}
