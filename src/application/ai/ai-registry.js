/** Preserve the original definition and evaluation order. */
export default function createAiRegistry(dependencies) {
  return new (class {
    constructor() {
      const t = new dependencies.AiRoutePlanner();
      ((this._selectedIndex = -1),
        (this._list = [
          {
            instance: t,
            userInfo: dependencies.gameRecords.a.makeUserInfo('ai1', 'AI-1', 2.5, 'stickAlpha'),
            range: 1.9,
            abf: 1.2,
            bcf: 1.6,
            chaoticSeed: 3,
            mpm: 0.8,
            bpm: 1.2,
          },
          {
            instance: t,
            userInfo: dependencies.gameRecords.a.makeUserInfo('ai2', 'AI-2', 4, 'stickAlpha'),
            range: 2.5,
            abf: 1,
            bcf: 1,
            chaoticSeed: 3,
            mpm: 0.7,
            bpm: 1,
          },
          {
            instance: t,
            userInfo: dependencies.gameRecords.a.makeUserInfo('ai3', 'AI-3', 5, 'stickAlpha'),
            range: 3.3,
            abf: 0.72,
            bcf: 0.82,
            chaoticSeed: 2,
            mpm: 0.45,
            bpm: 0.8,
          },
        ]));
    }
    setSelectedIndex(t) {
      this._selectedIndex = t;
    }
    getSelectedAIInfo() {
      return this._selectedIndex < 0 || this._selectedIndex >= this._list.length
        ? null
        : this._list[this._selectedIndex].userInfo;
    }
    getSelectedAIInstance() {
      if (this._selectedIndex < 0 || this._selectedIndex >= this._list.length) {
        return null;
      }
      {
        const t = this._list[this._selectedIndex],
          e = t.instance;
        return (e.setFactors(t), e);
      }
    }
    getInfoList() {
      const t = [],
        e = this._list;
      for (let i = 0, s = e.length; i !== s; ++i) {
        t[i] = e[i].userInfo;
      }
      return t;
    }
  })();
}
