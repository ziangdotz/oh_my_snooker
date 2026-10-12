// Explicit live dependencies preserve initialization and shared state.
export default function createPocketCamera(dependencies) {
  return class PocketCamera {
    constructor() {
      ((this._camProps0123 = new Float32Array(20)), (this._pocketTestRadiusSq = 0.0324));
    }
    resetWithPlayArea(t) {
      let e = t.position.x,
        i = t.position.y,
        s = t.position.z,
        n = t.size.w / 2,
        r = t.size.h / 2,
        a = this._camProps0123;
      ((a[0] = e + n + 1),
        (a[1] = i + 1.1),
        (a[2] = s + r + 1.2),
        (a[3] = 0.48),
        (a[4] = 0.6),
        (a[5] = a[0]),
        (a[6] = a[1]),
        (a[7] = s - r - 1.2),
        (a[8] = a[3]),
        (a[9] = a[4]),
        (a[10] = e + 0.9 * n),
        (a[11] = i + 0.4),
        (a[12] = s + r + 1),
        (a[13] = 0.5),
        (a[14] = 0.75),
        (a[15] = a[10]),
        (a[16] = a[11]),
        (a[17] = s - r - 1),
        (a[18] = a[13]),
        (a[19] = a[14]));
    }
    pocketCameraForPath(t, e, i) {
      let s,
        n,
        r,
        a,
        o,
        _l,
        h,
        c,
        _d,
        u,
        _,
        _p,
        f,
        g = e.pockets,
        m = e.size.w / 2,
        y = e.size.w / 3,
        v = e.size.h / 2,
        b = this._pocketTestRadiusSq;
      for (let x = t.length - 4; x > 0; x -= 4)
        if (
          ((s = t[x + 1]),
          (n = t[x + 2]),
          (_d =
            (r =
              (c =
                g[
                  (h =
                    2 * (o = s < -m ? 0 : s >= m ? 2 : Math.floor((s + m) / y)) +
                    (_l = n < -v ? 0 : n >= v ? 1 : Math.floor((n + v) / v)))
                ]).position.x - s) *
              r +
            (a = c.position.z - n) * a) < b &&
            ((u = t[x - 3]),
            (f = n - (_ = t[x - 2])),
            (_p = s - u) * (r = c.position.x - u) + f * (a = c.position.z - _) > 0))
        ) {
          if (2 !== o) {
            let e = this._camProps0123,
              s = 5 * h;
            (i.set(e[s], e[s + 1], e[s + 2]), this.updatePathZoom(t, i, e[s + 3], e[s + 4]));
          } else {
            i.y = e.position.y + 0.26;
            let t = 0.65,
              s = Math.sqrt(r * r + a * a);
            ((i.x = c.position.x + (r / s) * t), (i.z = c.position.z + (a / s) * t));
          }
          return h;
        }
      return -1;
    }
    updatePathZoom(t, e, i, s) {
      let n,
        r,
        a = e.x,
        o = e.z,
        l = s - i;
      for (let e = 0, s = t.length; e !== s; e += 4) {
        ((n = a - t[e + 1]), (r = o - t[e + 2]));
        let s = Math.sqrt(n * n + r * r);
        (s < 1 ? (s = 1) : s > 6 && (s = 6), (t[e + 3] = i + (1 - (s - 1) / 5) * l));
      }
    }
  };
}
