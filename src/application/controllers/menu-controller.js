// Explicit live dependencies preserve initialization and shared state.
export default function createMenuController(dependencies) {
  return class MenuController extends dependencies.ViewController {
    constructor(t) {
      (super(t),
        (this._model = new dependencies.AiGameModel()),
        (this._homeMainMenu = null),
        (this._enterAnimation = null),
        (this._onDifficultyItemClick = (t) => {
          switch (
            (dependencies.menuTelemetry('event', 'select', {
              event_category: 'ai',
              event_label: t,
            }),
            t)
          ) {
            case 'ai1':
              (this._model.setSelectedAIIndex(0),
                this._uiLayer.closeBox('hmDifBox'),
                this.emit(dependencies.ApplicationEvents.CHANGE_CONTROLLER, 'game'));
              break;
            case 'ai2':
              (this._model.setSelectedAIIndex(1),
                this._uiLayer.closeBox('hmDifBox'),
                this.emit(dependencies.ApplicationEvents.CHANGE_CONTROLLER, 'game'));
              break;
            case 'ai3':
              (this._model.setSelectedAIIndex(2),
                this._uiLayer.closeBox('hmDifBox'),
                this.emit(dependencies.ApplicationEvents.CHANGE_CONTROLLER, 'game'));
              break;
            default:
              0;
          }
        }),
        (this._onBoxClosed = () => {
          this._homeMainMenu.activate();
        }));
    }
    _registerUI() {
      let t = this._uiLayer;
      (t.hasRegisteredUI('hmMainMenu') || t.registerUI(new dependencies.SideMenu('hmMainMenu')),
        t.hasRegisteredBox('hmDifBox') ||
          t.registerBox(new dependencies.AiDifficultyDialog('hmDifBox')),
        t.hasRegisteredBox('aboutBox') || t.registerBox(new dependencies.AboutDialog('aboutBox')));
    }
    _bindUI() {
      this._homeMainMenu = this._uiLayer.getRegisteredUI('hmMainMenu');
    }
    _unbindUI() {
      this._homeMainMenu = null;
    }
    _onItemsReady() {
      (this._enterAnimation ||
        (this._enterAnimation = new dependencies.PropertyTween((t) => {
          let e = this._gView.camera;
          ((e.position.y = t.y),
            (e.position.x = t.cx + Math.sin(t.angle) * t.radius),
            (e.position.z = t.cz + Math.cos(t.angle) * t.radius),
            (e.lockedTarget.x = t.lookAtX),
            (e.lockedTarget.y = t.lookAtY),
            (e.lockedTarget.z = t.lookAtZ),
            this._gView.requireRender());
        })),
        super._onItemsReady());
    }
    enter() {
      const t = this._gView.camera,
        e = this._gView.playArea.position,
        i = t.position.x - e.x,
        s = t.position.z - e.z,
        n = Math.sqrt(i * i + s * s),
        r = Math.atan2(i, s),
        a = Math.PI;
      let o,
        l = (-70 / 180) * a,
        h = l - r;
      (h > a ? (l -= 2 * a) : h < -a && (l += 2 * a),
        (o = 0.5),
        (o += (Math.abs(l - r) / a) * 2.5),
        (o += 0.5 * Math.abs(3.1 - n)) > 3.5 && (o = 3.5),
        this._enterAnimation
          .reset(
            {
              radius: n,
              angle: r,
              y: t.position.y,
              lookAtX: t.lockedTarget.x,
              lookAtY: t.lockedTarget.y,
              lookAtZ: t.lockedTarget.z,
            },
            {
              radius: 3.1,
              angle: l,
              y: this._model.getControllerSetting().eyeStandHeight,
              lookAtX: e.x,
              lookAtY: e.y,
              lookAtZ: e.z,
            },
            dependencies.Easing.Power1.easeInOut,
            o,
            0.1,
          )
          .play(),
        (this._enterAnimation.target.cx = e.x),
        (this._enterAnimation.target.cz = e.z),
        super.enter());
    }
    updateEntering(t) {
      let e = this._enterAnimation;
      e.needsUpdate
        ? e.update(t.dt)
        : e.isComplete() && this.emit(dependencies.ControllerEvents.ENTERED);
    }
    action() {
      (this._homeMainMenu.activate(), super.action());
    }
    updateActing(t) {
      !this._homeMainMenu.needsUpdate ||
        this._homeMainMenu.update(t.dt) ||
        this._homeMainMenu.isActive ||
        this._confirmMenuClick();
    }
    _confirmMenuClick() {
      switch (this._homeMainMenu.clickedIndex) {
        case 0:
          (dependencies.menuTelemetry('event', 'menu_click', {
            event_category: 'game_page',
            event_label: 'single_play',
          }),
            this._uiLayer
              .popBox('hmDifBox')
              .on(dependencies.dialogEvents.CLOSE, this._onBoxClosed)
              .on(dependencies.dialogEvents.ITEM_CLICK, this._onDifficultyItemClick));
          break;
        case 1:
          (dependencies.menuTelemetry('event', 'menu_click', {
            event_category: 'game_page',
            event_label: 'practice',
          }),
            this._model.setSelectedAIIndex(-1),
            this.emit(dependencies.ApplicationEvents.CHANGE_CONTROLLER, 'game'));
          break;
        case 2:
          (dependencies.menuTelemetry('event', 'menu_click', {
            event_category: 'game_page',
            event_label: 'about',
          }),
            this._uiLayer
              .popBox('aboutBox')
              .on(dependencies.dialogEvents.CLOSE, this._onBoxClosed));
          break;
        default:
          (0, this._homeMainMenu.activate());
      }
    }
    releaseControls() {
      this._homeMainMenu.unhoverAll();
    }
    exit() {
      (this._homeMainMenu.deactivate(), super.exit());
    }
    updateExiting(t) {
      this._homeMainMenu.needsUpdate
        ? this._homeMainMenu.update(t.dt)
        : this._homeMainMenu.isActive || this.emit(dependencies.ControllerEvents.EXITED);
    }
  };
}
