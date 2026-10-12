// Explicit live dependencies preserve initialization and shared state.
export default function createPathFollower(dependencies) {
  return class PathFollower {
    constructor() {
      ((this._data = []), (this._renderedDataIndex = 0));
    }
    update(t, e) {
      let i = this._data,
        s = this._renderedDataIndex,
        n = i.length - 10;
      for (; e >= i[s + 1] && s < n; ) s += 10;
      for (; e < i[s] && s >= 10; ) s -= 10;
      this._renderedDataIndex = s;
      let r = (e - i[s]) / (i[s + 1] - i[s]),
        a = (r = r < 0 ? 0 : r > 1 ? 1 : dependencies.Easing.Power1.easeInOut(r)) * r;
      return (
        (t.x = i[s + 2] + i[s + 4] * r + i[s + 6] * a),
        (t.z = i[s + 3] + i[s + 5] * r + i[s + 7] * a),
        i[s + 8] + (i[s + 9] - i[s + 8]) * r
      );
    }
    resetDataWithPath(t) {
      let e = this._data;
      if (((e.length = 0), t.length < 4)) return;
      let i = t.length / 4;
      if (1 === i) {
        let i = t[0],
          s = t[1],
          n = t[2],
          r = t[3];
        e.push(i, 36e4, s, n, 0, 0, 0, 0, r, r);
      } else if (2 === i) {
        let i = t[0],
          s = t[1],
          n = t[2],
          r = t[3],
          a = t[4],
          o = t[5],
          l = t[6],
          h = t[7];
        e.push(i, a + 0.4, s, n, 0.5 * (o - s), 0.5 * (l - n), 0, 0, r, h);
      } else
        for (let s = 0, n = i - 2; s !== n; ++s) {
          let i = 4 * s,
            r = t[i],
            a = t[i + 1],
            o = t[i + 2],
            l = t[i + 3],
            h = t[i + 4],
            c = t[i + 5],
            d = t[i + 6],
            u = t[i + 7],
            _ = t[i + 8],
            p = t[i + 9],
            f = t[i + 10],
            g = t[i + 11];
          (0 === s && ((a -= c - a), (o -= d - o), (r -= h - r), (l -= u - l)),
            s === n - 1 &&
              ((p += 0.9 * (p - c)), (f += 0.9 * (f - d)), (_ += _ - h + 0.4), (g += g - u)),
            e.push(
              0.5 * (r + h),
              0.5 * (h + _),
              0.5 * (a + c),
              0.5 * (o + d),
              c - a,
              d - o,
              0.5 * (a - 2 * c + p),
              0.5 * (o - 2 * d + f),
              0.5 * (l + u),
              0.5 * (g + u),
            ));
        }
      return ((this._renderedDataIndex = 0), this);
    }
  };
}
