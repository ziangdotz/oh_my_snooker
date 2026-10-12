// Explicit live dependencies preserve initialization and shared state.
export default function createInputState(dependencies) {
  return class InputState {
    get state() {
      return this._state;
    }
    set state(t) {
      this._state !== t &&
        ((this._state = t), this._enabled && (this._cancelKeyboards(t), this._onPointerUp()));
    }
    get enabled() {
      return this._enabled;
    }
    set enabled(t) {
      this._enabled !== t &&
        ((this._enabled = t), t || (this._cancelKeyboards(0), this._onPointerUp()));
    }
    constructor() {
      ((this._enabled = !0),
        (this._state = 0),
        (this.supportsPointer = !!window.PointerEvent),
        (this._evtList = Object.create(null)),
        (this._keyList = Object.create(null)),
        (this._pointerList = Object.create(null)),
        (this._isDragging = !1),
        (this._onKeyDown = (t) => {
          if (t.repeat || !this._enabled) return;
          if (t.altKey || t.metaKey) return (t.preventDefault(), this._cancelKeyboards(0));
          const e = this._keyList[t.keyCode + ''];
          e &&
            e.ss & this._state &&
            !e.triggered &&
            (t.preventDefault(), (e.triggered = !0), e.down());
        }),
        (this._onKeyUp = (t) => {
          const e = this._keyList[t.keyCode + ''];
          e && e.triggered && (t.preventDefault(), (e.triggered = !1), void 0 !== e.up && e.up());
        }),
        (this._onPointerDown = null),
        (this._onPointerDownPressOnly = (t) => {
          if (!this._enabled) return;
          const e = this._pointerList.press;
          e.ss & this._state && e.fn(t.clientX, t.clientY, t.altKey || t.metaKey);
        }),
        (this._onPointerDownDragOnly = (t) => {
          if (this._isDragging || !this._enabled) return;
          this._pointerList.drag.ss & this._state &&
            ((this._isDragging = !0),
            this.supportsPointer && t.target.setPointerCapture(t.pointerId));
        }),
        (this._onPointerDownPressAndDrag = (t) => {
          (this._onPointerDownDragOnly(t), this._onPointerDownPressOnly(t));
        }),
        (this._onPointerMove = null),
        (this._onPointerMoveNoFrag = (t) => {
          if (!this._enabled) return;
          t.preventDefault();
          const e = this._pointerList.move;
          e.ss & this._state && e.fn(t.clientX, t.clientY, t.altKey || t.metaKey);
        }),
        (this._onPointerMoveDragOnly = (t) => {
          if (!this._isDragging || !this._enabled) return;
          t.preventDefault();
          const e = this._pointerList.drag;
          e.ss & this._state && e.fn(t.movementX, t.movementY, t.altKey || t.metaKey);
        }),
        (this._onPointerMoveAndDrag = (t) => {
          (this._onPointerMoveNoFrag(t), this._onPointerMoveDragOnly(t));
        }),
        (this._onPointerUp = (t) => {
          this._isDragging &&
            ((this._isDragging = !1),
            t &&
              (t.preventDefault(),
              this.supportsPointer && t.target.releasePointerCapture(t.pointerId)));
        }),
        (this._onWheel = (t) => {
          if (!this._enabled) return;
          const e = this._pointerList.wheel;
          if (e.ss & this._state) {
            t.preventDefault();
            let i = t.deltaY * (1 + 39 * t.deltaMode);
            e.fn(i, t.altKey || t.metaKey);
          }
        }),
        (this._onBlur = () => {
          (this._cancelKeyboards(0), this._onPointerUp());
        }));
    }
    initialize(t, e) {
      const i = this._evtList;
      let s = !1;
      if (void 0 !== t) {
        let e = 0;
        this._keyList = Object.create(null);
        for (let i in t) {
          let s = t[i];
          if (!s) continue;
          const n = i.split('|');
          for (let t = 0, i = n.length; t !== i; ++t) {
            let i = Object.create(null);
            ((i.triggered = !1),
              (i.ss = s.ss || 0),
              (i.down = s.down),
              s.up && (i.up = s.up),
              i.ss || console.warn('handler "' + i[t] + '" will never be triggered since ss is 0'),
              (this._keyList[n[t]] = i),
              e++);
          }
        }
        e > 0 && ((s = !0), (i.keydown = this._onKeyDown), (i.keyup = this._onKeyUp));
      }
      if (void 0 !== e) {
        this._pointerList = Object.create(null);
        let t = 0,
          n = 0,
          r = 0,
          a = !1;
        switch (
          (e.press &&
            ((this._pointerList.press = Object.create(null)),
            (this._pointerList.press.ss = e.press.ss || 0),
            (this._pointerList.press.fn = e.press.fn),
            this._pointerList.press.ss ||
              console.warn('handler "press" will never be triggered since ss is 0'),
            (t |= 1)),
          e.move &&
            ((this._pointerList.move = Object.create(null)),
            (this._pointerList.move.ss = e.move.ss || 0),
            (this._pointerList.move.fn = e.move.fn),
            this._pointerList.move.ss ||
              console.warn('handler "move" will never be triggered since ss is 0'),
            (n |= 1)),
          e.drag &&
            ((this._pointerList.drag = Object.create(null)),
            (this._pointerList.drag.ss = e.drag.ss || 0),
            (this._pointerList.drag.fn = e.drag.fn),
            this._pointerList.drag.ss ||
              console.warn('handler "drag" will never be triggered since ss is 0'),
            (t |= 2),
            (n |= 2),
            (a = !0),
            (s = !0)),
          e.wheel &&
            ((this._pointerList.wheel = Object.create(null)),
            (this._pointerList.wheel.ss = e.wheel.ss || 0),
            (this._pointerList.wheel.fn = e.wheel.fn),
            this._pointerList.wheel.ss ||
              console.warn('handler "wheel" will never be triggered since ss is 0'),
            (r |= 1)),
          (this._onPointerDown = null),
          t)
        ) {
          case 1:
            this._onPointerDown = this._onPointerDownPressOnly;
            break;
          case 2:
            this._onPointerDown = this._onPointerDownDragOnly;
            break;
          case 3:
            this._onPointerDown = this._onPointerDownPressAndDrag;
        }
        switch (((this._onPointerMove = null), n)) {
          case 1:
            this._onPointerMove = this._onPointerMoveNoFrag;
            break;
          case 2:
            this._onPointerMove = this._onPointerMoveDragOnly;
            break;
          case 3:
            this._onPointerMove = this._onPointerMoveAndDrag;
        }
        (this._onPointerDown &&
          (this.supportsPointer
            ? (i.pointerdown = this._onPointerDown)
            : (i.mousedown = this._onPointerDown)),
          this._onPointerMove &&
            (this.supportsPointer
              ? (i.pointermove = this._onPointerMove)
              : (i.mousemove = this._onPointerMove)),
          a &&
            (this.supportsPointer
              ? ((i.pointerup = this._onPointerUp), (i.pointercancel = this._onPointerUp))
              : ((i.mouseup = this._onPointerUp), (i.mouseleave = this._onPointerUp))),
          0 !== r && (i.wheel = this._onWheel));
      }
      s && (i.blur = this._onBlur);
    }
    bindEvents(t) {
      const e = this._evtList;
      for (let i in e) t.addEventListener(i, e[i], !1);
    }
    unbindEvents(t) {
      (this._cancelKeyboards(0), this._onPointerUp());
      const e = this._evtList;
      for (let i in e) 'function' == typeof e[i] && t.removeEventListener(i, e[i], !1);
    }
    _cancelKeyboards(t) {
      const e = this._keyList;
      for (let i in e)
        !e[i].triggered || e[i].ss & t || ((e[i].triggered = !1), void 0 !== e[i].up && e[i].up());
    }
  };
}
