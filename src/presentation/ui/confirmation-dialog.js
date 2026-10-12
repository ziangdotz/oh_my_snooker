// Explicit live dependencies preserve initialization and shared state.
export default function createConfirmationDialog(dependencies) {
  return class ConfirmationDialog extends dependencies.ActionDialog {
    constructor(t) {
      (super(t, void 0),
        this.closeLabel('NO').head('')._addBoxClass('confirm-box'),
        (this._onConfirmClick = () => {
          (this.emit(dependencies.dialogEvents.CONFIRM), this.deactivate());
        }));
    }
    _createElement() {
      let t = super._createElement();
      return (
        (this._confirmBn = this._createButton('YES')),
        (this._body = this._createBody(!1)),
        t
      );
    }
    data(t, e) {
      return (this._body.message(t, e), this);
    }
    _bindEvents() {
      (super._bindEvents(), this._confirmBn.addEventListener('click', this._onConfirmClick, !1));
    }
    _unbindEvents() {
      (super._unbindEvents(),
        this._confirmBn.removeEventListener('click', this._onConfirmClick, !1));
    }
  };
}
