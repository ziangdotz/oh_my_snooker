// Explicit live dependencies preserve initialization and shared state.
export default function createAiDifficultyDialog(dependencies) {
  return class AiDifficultyDialog extends dependencies.ActionDialog {
    constructor(t) {
      (super(t, void 0), this.head('SELECT LEVEL')._addBoxClass('difficulty-box'));
    }
    _createElement() {
      let t = super._createElement(),
        e = this._createBody(!0);
      e.empty();
      let i = dependencies.aiRegistry.getInfoList();
      for (let t = 0, n = i.length; t !== n; ++t) {
        let n = AiDifficultyDialog.parseUI(dependencies.aiDifficultyTemplate);
        n.setAttribute('data-sid', i[t].userId);
        let r = n.querySelector('.ai-name');
        r.innerHTML = i[t].displayName;
        let a = n.querySelector('.diff-dots'),
          o = n.querySelector('.diff-desp'),
          l = i[t].level;
        l <= 3
          ? ((o.innerHTML = 'EASY'), r.classList.add('easy'))
          : l < 5
            ? ((o.innerHTML = 'NORMAL'), r.classList.add('normal'))
            : ((o.innerHTML = 'HARD'), r.classList.add('hard'));
        let h = '';
        for (var s = 0; s < 10; ++s)
          ((h +=
            l > 0.5
              ? '<div class="diff-dot diff-dot-full"></div>'
              : l > 0
                ? '<div class="diff-dot diff-dot-half"></div>'
                : '<div class="diff-dot"></div>'),
            (l -= 1));
        ((a.innerHTML = h), e.pushContent(n));
      }
      return t;
    }
  };
}
