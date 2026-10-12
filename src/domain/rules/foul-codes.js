export default function foulCodesModule(module, exports) {
  const i = Object.create(null);
  ((i.MISS_TARGET = 1),
    (i.ILLEGAL_FIRST_HIT = 2),
    (i.ILLEGAL_POTTING = 4),
    (i.POTTING_CUE_BALL = 8),
    (i.OFF_TABLE = 16));
  const s = [
    '',
    'MISS TARGET',
    'ILLEGAL FIRST HIT',
    'ILLEGAL POTTING',
    'POTTING THE CUE BALL',
    'OFF TABLE',
  ];
  module.exports = {
    FoulCode: i,
    getFoulDescription: (t) => {
      let e = '',
        i = 1,
        n = 1,
        r = !1;
      for (; i <= t; ) (i & t && ((e += r ? ', ' + s[n] : s[n]), (r = !0)), (i <<= 1), n++);
      return r ? e + '.' : e;
    },
  };
}
