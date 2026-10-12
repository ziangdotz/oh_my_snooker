export default function eventEmitterModule(module, exports, loadModule) {
  'use strict';
  const s = (t, e, i) => {
      let s, n;
      if ('function' != typeof i) throw new TypeError('"listener" argument must be a function');
      return (
        (s = t._events)
          ? (n = s[e])
          : ((s = t._events = Object.create(null)), (t._eventsCount = 0)),
        n
          ? 'function' == typeof n
            ? (n = s[e] = [n, i])
            : n.push(i)
          : ((n = s[e] = i), ++t._eventsCount),
        t
      );
    },
    n = (t, e) => {
      for (var i = e, s = i + 1, n = t.length; s < n; i += 1, s += 1) t[i] = t[s];
      t.pop();
    };
  let r = [];
  const a = (t, e, i) => {
      for (let s = 0; s < i; ++s) e[s] = t[s];
      return e;
    },
    o = (t) => {
      let e = t.length,
        i = a(t, r, e);
      for (let t = 0; t < e; ++t) i[t]();
      i.length = 0;
    },
    l = (t, e) => {
      let i = t.length,
        s = a(t, r, i);
      for (let t = 0; t < i; ++t) s[t](e);
      s.length = 0;
    },
    h = (t, e, i) => {
      let s = t.length,
        n = a(t, r, s);
      for (let t = 0; t < s; ++t) n[t](e, i);
      n.length = 0;
    },
    c = (t, e) => {
      let i = t.length,
        s = a(t, r, i);
      for (let t = 0; t < i; ++t) s[t](...e);
      s.length = 0;
    };
  module.exports = class EventEmitter {
    constructor() {
      ((this._events = Object.create(null)),
        (this._eventsCount = 0),
        (this.emit = this._emit),
        (this.on = this._on));
    }
    _on(t, e) {
      return s(this, t, e);
    }
    _emit(t, ...e) {
      const i = this._events;
      let s,
        n,
        r = 'error' === t;
      if (i) r = r && null == i.error;
      else if (!r) return !1;
      if (r) {
        if ((e.length > 0 && (s = e[0]), s instanceof Error)) throw s;
        {
          let t = new Error('Unhandled "error" emitted. (' + s + ')');
          throw ((t.message = s), t);
        }
      }
      if (!(n = i[t])) return !1;
      switch (e.length) {
        case 0:
          'function' == typeof n ? n() : o(n);
          break;
        case 1:
          'function' == typeof n ? n(e[0]) : l(n, e[0]);
          break;
        case 2:
          'function' == typeof n ? n(e[0], e[1]) : h(n, e[0], e[1]);
          break;
        default:
          'function' == typeof n ? n(...e) : c(n, e);
      }
      return !0;
    }
    removeAllListeners(t) {
      let e = this._events;
      return e
        ? (void 0 === t
            ? ((this._events = Object.create(null)), (this._eventsCount = 0))
            : e[t] &&
              (0 == --this._eventsCount ? (this._events = Object.create(null)) : delete e[t]),
          this)
        : this;
    }
    removeListener(t, e) {
      let i, s, r, a;
      if ('function' != typeof e) throw new TypeError('"listener" argument must be a function');
      if (!(s = this._events)) return this;
      if (!(i = s[t])) return this;
      if (i === e || i.listener === e)
        0 == --this._eventsCount ? (this._events = Object.create(null)) : delete s[t];
      else if ('function' != typeof i) {
        for (r = -1, a = i.length - 1; a >= 0; a--)
          if (i[a] === e || i[a].listener === e) {
            r = a;
            break;
          }
        if (r < 0) return this;
        (0 === r ? i.shift() : n(i, r), 1 === i.length && (s[t] = i[0]));
      }
      return this;
    }
  };
}
