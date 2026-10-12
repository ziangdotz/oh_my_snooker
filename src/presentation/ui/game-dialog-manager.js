import gameNotice from './game-notice-policy.js';

/** Extend modal bookkeeping and notices while retaining the original UI/scene boundary. */
export default function createGameDialogManager({ DialogManager, ToastDialog, dialogEvents }) {
  const GAME_UI_DIRTY = 65536;
  return class GameDialogManager extends DialogManager {
    constructor(container, canvas) {
      super(container, canvas);
      this._noticeQueue = [];
      this._currentNotice = null;
      this._instruction = null;
      this._returnFocus = new Map();
      this._instructionBox = new ToastDialog('game-instruction');
      this._instructionBox.element.classList.add('game-ui-instruction');
      this._instructionBox.element.style.zIndex = '10';
      container.append(this._instructionBox.element);
      for (const event of ['pointerenter', 'focusin']) {
        this._bMsgBox.element.addEventListener(event, () => {
          this._noticeHeld = true;
        });
      }
      this._bMsgBox.element.addEventListener('pointerleave', () => {
        this._noticeHeld = this._bMsgBox.element.contains(document.activeElement);
      });
      this._bMsgBox.element.addEventListener('focusout', (event) => {
        this._noticeHeld =
          this._bMsgBox.element.matches(':hover') ||
          this._bMsgBox.element.contains(event.relatedTarget);
      });
    }
    registerBox(box) {
      super.registerBox(box);
      if (box.managesGameMotion) {
        this._motionBoxes ||= [];
        if (!this._motionBoxes.includes(box)) {
          this._motionBoxes.push(box);
        }
        box.onMotionUpdate = () => {
          this.needsUpdate |= GAME_UI_DIRTY;
        };
      }
    }
    get hasGameInstruction() {
      return this._instruction !== null;
    }
    popBox(id, data) {
      const registered = this._registeredBox[id];
      if (this._activeBoxStack.includes(registered)) {
        return registered;
      }
      const opener = document.activeElement;
      const box = super.popBox(id, data);
      if (box.managesGameMotion) {
        this._returnFocus.set(box, opener);
        box.on(dialogEvents.CLOSE, () => {
          this._pendingGameFocus = this._returnFocus.get(box);
          this._returnFocus.delete(box);
          this.needsUpdate |= GAME_UI_DIRTY;
        });
      }
      this._setNoticeVisibility();
      return box;
    }
    confirm(message, callback) {
      this._registeredBox.confirm.practice = this._registeredUI.scoreBar?.playerCount === 1;
      return super.confirm(message, callback);
    }
    message(title, body, kind = 0, pinned = false, id, duration) {
      const notice = gameNotice({ title, body, kind, pinned, id, duration });
      if (notice.pinned) {
        this._instruction = notice;
        this._instructionBox.head(notice.title).data(notice.body, 0).activate().pin(true);
      } else {
        if (title === 'PERFORMANCE TIP' && this._performanceNoticeSeen) {
          return;
        }
        if (title === 'PERFORMANCE TIP') {
          this._performanceNoticeSeen = true;
        }
        if (
          this._currentNotice?.fingerprint === notice.fingerprint ||
          this._noticeQueue.some((item) => item.fingerprint === notice.fingerprint)
        ) {
          return;
        }
        if (!this._currentNotice) {
          this._showNotice(notice);
        } else if (notice.priority > this._currentNotice.priority) {
          this._noticeQueue.push(this._currentNotice);
          this._showNotice(notice);
        } else {
          this._noticeQueue.push(notice);
        }
        this._noticeQueue.sort((a, b) => b.priority - a.priority);
        this._noticeQueue.length = Math.min(6, this._noticeQueue.length);
      }
      this.needsUpdate |= GAME_UI_DIRTY;
      this._setNoticeVisibility();
    }
    _showNotice(notice) {
      this._currentNotice = notice;
      this._msgId = notice.id;
      this._bMsgBox.head(notice.title).data(notice.body, notice.kind).activate().pin(false);
      this._noticeHeld =
        this._bMsgBox.element.matches(':hover') ||
        this._bMsgBox.element.contains(document.activeElement);
    }
    clearGameNotices() {
      this._noticeQueue.length = 0;
      this._currentNotice = null;
      this._instruction = null;
      this._msgId = undefined;
      this._noticeHeld = false;
      this._bMsgBox.deactivate();
      this._instructionBox.deactivate();
      this._setNoticeVisibility();
    }
    closeMessage(id) {
      if (id !== undefined && this._instruction?.id === id) {
        this._instruction = null;
        this._instructionBox.deactivate();
        this._setNoticeVisibility();
        return;
      }
      if (id !== undefined) {
        this._noticeQueue = this._noticeQueue.filter((item) => item.id !== id);
      }
      if (id === undefined || this._currentNotice?.id === id) {
        const hadFocus = this._bMsgBox.element.contains(document.activeElement);
        this._currentNotice = null;
        this._msgId = undefined;
        this._bMsgBox.deactivate();
        this._noticeHeld = false;
        const next = this._noticeQueue.shift();
        if (next) {
          this._showNotice(next);
          this.needsUpdate |= GAME_UI_DIRTY;
        } else if (hadFocus && this._activeBoxStack.length === 0) {
          this._gameCanvas.focus({ preventScroll: true });
        }
      }
      this._setNoticeVisibility();
    }
    _setNoticeVisibility() {
      const covered = this._activeBoxStack.length > 0;
      for (const box of [this._bMsgBox, this._instructionBox]) {
        const hidden = covered || (box === this._instructionBox && this._currentNotice !== null);
        box.element.style.visibility = hidden ? 'hidden' : '';
        box.element.inert = hidden;
      }
    }
    update(dt) {
      super.update(dt);
      for (const box of this._motionBoxes) {
        if (box.needsUpdate) {
          box.update(dt);
        }
        if (box.needsUpdate) {
          this.needsUpdate |= GAME_UI_DIRTY;
        }
      }
      if (this._pendingGameFocus && !(this.needsUpdate & 2)) {
        const top = this._activeBoxStack.at(-1);
        const target = this._pendingGameFocus;
        this._pendingGameFocus = null;
        if (!top) {
          this._gameCanvas.focus({ preventScroll: true });
        } else if (target.isConnected && top.element.contains(target)) {
          target.focus({ preventScroll: true });
        } else if (top?.managesGameMotion) {
          top._focus(top.defaultFocusTarget);
        }
      }
      this._setNoticeVisibility();
      if (this._currentNotice) {
        if (!this._noticeHeld && this._activeBoxStack.length === 0) {
          this._currentNotice.remaining -= dt;
        }
        if (this._currentNotice.remaining <= 0) {
          this.closeMessage();
        }
        if (this._currentNotice) {
          this.needsUpdate |= GAME_UI_DIRTY;
        }
      }
    }
  };
}
