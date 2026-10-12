export default function playerModule(module, exports) {
  class Player {
    get id() {
      return this._userId;
    }
    get type() {
      return this._type;
    }
    get displayName() {
      return this._userInfo.displayName;
    }
    constructor(t, e) {
      ((this._userInfo = t),
        (this._userId = t.userId),
        (this._type = e),
        (this.pts = 0),
        (this.penalty = 0),
        (this._brk = 0),
        (this._maxBrk = 0),
        (this.shootingCount = 0),
        (this.scoreCount = 0));
    }
    get maxbrk() {
      return this._maxBrk;
    }
    get brk() {
      return this._brk;
    }
    set brk(t) {
      ((this._brk = t), this._maxBrk < t && (this._maxBrk = t));
    }
    get accuracy() {
      return 0 === this.shootingCount ? 0 : this.scoreCount / this.shootingCount;
    }
    clearScores() {
      ((this.pts = 0),
        (this.penalty = 0),
        (this._brk = 0),
        (this._maxBrk = 0),
        (this.shootingCount = 0),
        (this.scoreCount = 0));
    }
    getInfoData(t) {
      return this._userInfo[t];
    }
    dispose() {
      this._userInfo = null;
    }
  }
  ((Player.PLAYER_TYPE_USER = 0),
    (Player.PLAYER_TYPE_AI = 1),
    (Player.PLAYER_TYPE_REMOTE = 2),
    (module.exports = Player));
}
