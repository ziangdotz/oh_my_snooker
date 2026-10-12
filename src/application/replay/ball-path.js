// Explicit live dependencies preserve initialization and shared state.
export default function createBallPath(dependencies) {
  return class BallPath {
    constructor() {}
    static bTrackToPath(t, e, i, s) {
      const n = t.data,
        r = t.stride,
        a = t.totalFrames * r,
        o = dependencies.BallTrack.dataOffsetX,
        l = dependencies.BallTrack.dataOffsetY,
        h = dependencies.BallTrack.dataOffsetZ,
        c = dependencies.BallTrack.dataOffsetActiveSleep;
      e.length = 0;
      for (let t = r, i = a; t !== i; t += r)
        2 === n[t + c] && n[t + l] >= s && e.push(n[t], n[t + o], n[t + h], 1);
      BallPath.douglasPucker(e, i);
    }
    static douglasPucker(t, e) {
      let i = dependencies.pathScratch;
      for (let e = 0, s = t.length; e !== s; ++e) i[e] = t[e];
      ((t.length = 4),
        BallPath._douglasPuckerInternal(i, 0, i.length - 4, e * e, t),
        (i.length = 0));
    }
    static _douglasPuckerInternal(t, e, i, s, n) {
      if (e === i) return;
      let r = t[e + 1],
        a = t[e + 2],
        o = t[i + 1],
        l = t[i + 2],
        h = o - r,
        c = l - a,
        d = h * h + c * c,
        u = s,
        _ = -1;
      for (let s = e + 4, n = i; s !== n; s += 4) {
        let e,
          i = t[s + 1],
          n = t[s + 2],
          p = i - r,
          f = n - a,
          g = p * h + f * c;
        if (g < 1e-6) e = p * p + f * f;
        else if (g >= d - 1e-6) {
          let t = i - o,
            s = n - l;
          e = t * t + s * s;
        } else e = p * p + f * f - (g * g) / d;
        e > u && ((u = e), (_ = s));
      }
      -1 !== _
        ? (BallPath._douglasPuckerInternal(t, e, _, s, n),
          BallPath._douglasPuckerInternal(t, _, i, s, n))
        : n.push(t[i], t[i + 1], t[i + 2], t[i + 3]);
    }
  };
}
