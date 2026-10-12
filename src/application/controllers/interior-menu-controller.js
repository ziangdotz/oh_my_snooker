/** Room selection is available only while the home controller is acting. */
export default function createInteriorMenuController(dependencies) {
  return class InteriorMenuController extends dependencies.MenuController {
    constructor(application) {
      super(application);
      this._onBoxClosed = () => {
        if (this._state === 3 && this._homeMainMenu) {
          this._homeMainMenu.activate();
        }
      };
    }
    _registerUI() {
      super._registerUI();
      if (!this._uiLayer.hasRegisteredBox('interiorBox')) {
        this._uiLayer.registerBox(new dependencies.InteriorDesignDialog('interiorBox'));
      }
      if (!this._uiLayer.hasRegisteredBox('moreThingsBox')) {
        this._uiLayer.registerBox(new dependencies.MoreThingsDialog('moreThingsBox'));
      }
    }
    _bindUI() {
      super._bindUI();
      this._interiorDialog = null;
      this._moreDialog = null;
      this._aboutDialog = null;
      this._restoreInteriorFocus = false;
      this._restoreMoreFocus = false;
      this._restoreAboutFocus = false;
      this._onAboutClosed = () => {
        this._homeMainMenu.activate();
        this._restoreAboutFocus = true;
      };
      this._onMoreClosed = () => {
        this._homeMainMenu.activate();
        this._restoreMoreFocus = true;
      };
      this._onInteriorClosed = () => {
        this._homeMainMenu.activate();
        this._homeMainMenu.element.inert = false;
        this._restoreInteriorFocus = true;
      };
      this._onInteriorSelected = (id) => {
        const selection = dependencies.selection.choose(
          dependencies.transition.href,
          this._currentInterior?.id,
          id,
        );
        if (!selection) {
          this._uiLayer.closeBox('interiorBox');
          return;
        }
        this._interiorDialog.setBusy(id);
        const scene = this._gView.camera.getScene();
        const switcher = scene.interiorSwitcher;
        dependencies.transition.begin(
          selection,
          switcher
            ? {
                quick: switcher.isCached(id),
                run: () => switcher.switchTo(id),
                cancel: () => switcher.cancel(),
                finish: () => {
                  this._currentInterior = dependencies.registry.get(
                    scene.metadata.interiorDesign.id,
                  );
                  this._homeMainMenu.setCurrentInterior(this._currentInterior);
                  this._homeMainMenu.activate();
                  // Animate both surfaces together, but keep menu input locked
                  // until the drawer has finished leaving the dialog stack.
                  this._homeMainMenu.element.inert = true;
                  this._uiLayer.closeBox('interiorBox');
                  this._gView.requireRender(2);
                },
              }
            : null,
        );
      };
    }
    _unbindUI() {
      this._aboutDialog = null;
      this._onAboutClosed = null;
      this._interiorDialog = null;
      this._moreDialog = null;
      this._onMoreClosed = null;
      this._onInteriorClosed = null;
      this._onInteriorSelected = null;
      super._unbindUI();
    }
    action() {
      const profile = this._gView.camera.getScene().metadata?.interiorDesign;
      this._currentInterior = dependencies.registry.get(profile?.id);
      this._homeMainMenu.setCurrentInterior(this._currentInterior);
      super.action();
    }
    _confirmMenuClick() {
      if (this._homeMainMenu.clickedIndex === 2) {
        this._aboutDialog = this._uiLayer.popBox('aboutBox');
        this._aboutDialog.on(dependencies.dialogEvents.CLOSE, this._onAboutClosed);
        return;
      }
      if (this._homeMainMenu.clickedIndex === 4) {
        this._moreDialog = this._uiLayer.popBox('moreThingsBox', {});
        this._moreDialog.on(dependencies.dialogEvents.CLOSE, this._onMoreClosed);
        return;
      }
      if (this._homeMainMenu.clickedIndex !== 3) {
        super._confirmMenuClick();
        return;
      }
      this._interiorDialog = this._uiLayer.popBox('interiorBox', {
        designs: dependencies.registry.list(),
        currentId: this._currentInterior?.id,
      });
      this._interiorDialog
        .on(dependencies.dialogEvents.CLOSE, this._onInteriorClosed)
        .on(dependencies.dialogEvents.ITEM_CLICK, this._onInteriorSelected);
    }
    updateActing(timer) {
      if (this._aboutDialog?.needsUpdate) {
        this._aboutDialog.update(timer.dt);
      }
      if (this._interiorDialog?.needsUpdate) {
        this._interiorDialog.update(timer.dt);
      }
      if (this._moreDialog?.needsUpdate) {
        this._moreDialog.update(timer.dt);
      }
      super.updateActing(timer);
      if (this._homeMainMenu.isActive && !this._homeMainMenu.needsUpdate) {
        const scene = this._gView.camera.getScene();
        if (scene.isReady()) {
          dependencies.transition.complete(scene.metadata?.interiorDesign?.id);
        }
        if (this._restoreInteriorFocus && !this._uiLayer.isBlocked) {
          this._restoreInteriorFocus = false;
          this._homeMainMenu.focusInterior();
        }
        if (this._restoreMoreFocus && !this._uiLayer.isBlocked) {
          this._restoreMoreFocus = false;
          this._homeMainMenu.focusMoreThings();
        }
        if (this._restoreAboutFocus && !this._uiLayer.isBlocked) {
          this._restoreAboutFocus = false;
          this._homeMainMenu.focusAbout();
        }
      }
    }
  };
}
