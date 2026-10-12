export default function gameRecordsModule(module, exports) {
  const i = {
    makeUserInfo: function (t, e, i, s) {
      let n = Object.create(null);
      return ((n.userId = t), (n.displayName = e), (n.level = i), (n.stickName = s), n);
    },
    makeGContext: function () {
      let t = Object.create(null);
      return ((t.nRounds = 0), (t.inHand = 0), (t.playerIndex = -1), (t.ballOn = 0), t);
    },
    makeSimulatorResult: function () {
      let t = Object.create(null);
      return (
        (t.nKissed = 0),
        (t.firstKissIndex = 0),
        (t.pottedIndices = []),
        (t.outOfBoundsIndices = []),
        t
      );
    },
    makeRefResult: function () {
      let t = Object.create(null);
      return ((t.score = 0), (t.foulCode = 0), t);
    },
  };
  module.exports = i;
}
