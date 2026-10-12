/** Preserve the original definition and evaluation order. */
export default function createTableUiAtlas() {
  return {
    w: 512,
    h: 512,
    cache: {},
    frames: {
      shadow: { x: 43, y: 307, w: 162, h: 162 },
      gs1: { x: 286, y: 14, w: 208, h: 208 },
      gs2: { x: 148, y: 12, w: 125, h: 176, headH: 30 },
      gs3: { x: 12, y: 12, w: 125, h: 176, headH: 30 },
      powerTrack: { x: 12, y: 200, w: 16, h: 40 },
      respot0: { x: 221, y: 244, w: 166, h: 166 },
      respot1: { x: 383, y: 383, w: 120, h: 120 },
    },
    getFrame: function (t) {
      return this.frames[t];
    },
    getUVs: function (t) {
      let e = this.cache[t];
      if (!e) {
        const i = this.frames[t];
        if (!i) {
          throw new Error('Frame [' + t + '] not found...');
        }
        const s = this.w,
          n = this.h,
          r = i.x,
          a = i.y,
          o = i.w,
          l = i.h;
        ((e = [
          r / s,
          (n - (a + l)) / n,
          (r + o) / s,
          (n - (a + l)) / n,
          (r + o) / s,
          (n - a) / n,
          r / s,
          (n - a) / n,
        ]),
          (this.cache[t] = e));
      }
      return e;
    },
  };
}
