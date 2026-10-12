/** Preserve the original definition and evaluation order. */
export default function createEasing() {
  return {
    defaultEase: function (t) {
      return t;
    },
    Power1: {
      easeIn: function (t) {
        return t * t;
      },
      easeOut: function (t) {
        return 2 * t - t * t;
      },
      easeInOut: function (t) {
        return t < 0.5 ? 2 * t * t : 4 * t - 2 * t * t - 1;
      },
    },
    Power2: {
      easeIn: function (t) {
        return t * t * t;
      },
      easeOut: function (t) {
        return 1 - (t = 1 - t) * t * t;
      },
      easeInOut: function (t) {
        return t < 0.5 ? 4 * t * t * t : 1 - (t = 1 - t) * t * t * 4;
      },
    },
    Power3: {
      easeIn: function (t) {
        return t * t * t * t;
      },
      easeOut: function (t) {
        return 1 - (t = 1 - t) * t * t * t;
      },
      easeInOut: function (t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - (t = 1 - t) * t * t * t * 8;
      },
    },
    Power4: {
      easeIn: function (t) {
        return t * t * t * t * t;
      },
      easeOut: function (t) {
        return 1 - (t = 1 - t) * t * t * t * t;
      },
      easeInOut: function (t) {
        return t < 0.5 ? 16 * t * t * t * t * t : 1 - (t = 1 - t) * t * t * t * t * 16;
      },
    },
    Back: {
      _p1: 1.70158,
      _p2: 2.5949095,
      easeIn: function (t) {
        return t * t * ((this._p1 + 1) * t - this._p1);
      },
      easeOut: function (t) {
        return (t -= 1) * t * ((this._p1 + 1) * t + this._p1) + 1;
      },
      easeInOut: function (t) {
        return (t *= 2) < 1
          ? 0.5 * t * t * ((this._p2 + 1) * t - this._p2)
          : 0.5 * ((t -= 2) * t * ((this._p2 + 1) * t + this._p2) + 2);
      },
    },
  };
}
