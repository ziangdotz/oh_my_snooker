/** Live guide lettering with inherited dialog events and lifecycle. */
export default function createVectorControlsDialog(Dialog) {
  function populateBasicControlsGuide(container) {
    container.innerHTML = `
    <div class="control-guide-movement">
      <span class="control-guide-label control-guide-aim">AIMING MODE</span>
      <span class="control-guide-key control-guide-w">W</span>
      <span class="control-guide-key control-guide-a">A</span>
      <span class="control-guide-key control-guide-s">S</span>
      <span class="control-guide-key control-guide-d">D</span>
      <span class="control-guide-label control-guide-left">LEFT</span>
      <span class="control-guide-label control-guide-right">RIGHT</span>
      <span class="control-guide-label control-guide-stand">STAND</span>
      <span class="control-guide-connector control-guide-up-line" aria-hidden="true"></span>
      <span class="control-guide-connector control-guide-left-line" aria-hidden="true"></span>
      <span class="control-guide-connector control-guide-right-line" aria-hidden="true"></span>
      <span class="control-guide-connector control-guide-down-line" aria-hidden="true"></span>
    </div>
    <div class="control-guide-camera">
      <span class="control-guide-mouse m-d-i sprite" role="img" aria-label="Hold the left mouse button and drag"></span>
      <span class="control-guide-label control-guide-drag">MOUSE DRAG TO LOOK AROUND</span>
      <span class="control-guide-key control-guide-reset-key">R</span>
      <span class="control-guide-label control-guide-reset-label">RESET VIEW</span>
    </div>`;
  }

  return class VectorControlsDialog extends Dialog {
    _createElement() {
      const element = super._createElement();
      populateBasicControlsGuide(element.querySelector('.basic-controls-img'));
      return element;
    }
  };
}
