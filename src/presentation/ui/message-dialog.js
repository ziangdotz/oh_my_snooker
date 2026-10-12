// Explicit live dependencies preserve initialization and shared state.
export default function createMessageDialog(dependencies) {
  return class MessageDialog extends dependencies.ActionDialog {
    constructor(t) {
      (super(t, void 0),
        this.head('BASIC CONTROLS').closeLabel('CLOSE')._addBoxClass('controls-guide-box'),
        (this._lockScreen = !1));
    }
    _createElement() {
      let t = super._createElement();
      return (
        this._createBody(!1).replaceContent(
          '<section class="basic-controls-img"></section><p class="comment-copy">FOR MORE ADVANCED CONTROLS, SEE THE INSTRUCTIONS ON THE BOTTOM-RIGHT SIDE OF THE SCREEN.</p>',
        ),
        t
      );
    }
  };
}
