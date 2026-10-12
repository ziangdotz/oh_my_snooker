import createUiComponent from '../../presentation/ui/ui-component.js';
import createMenuItem from '../../presentation/ui/menu-item.js';
import createSideMenu from '../../presentation/ui/side-menu.js';
import createInteriorSideMenu from '../../presentation/ui/interior-side-menu.js';
import createInteriorDesignDialog from '../../presentation/ui/interior-dialog.js';
import createMoreThingsDialog from '../../presentation/ui/more-things-dialog.js';
import createContentPanel from '../../presentation/ui/content-panel.js';
import createBaseDialog from '../../presentation/ui/base-dialog.js';
import createActionDialog from '../../presentation/ui/action-dialog.js';

/** Assemble one UI type family; parser, events and constants belong to this composition. */
export default function composeUi(dependencies) {
  const uiParserElement = document.createElement('div');
  const UiComponent = createUiComponent({
    get EventEmitter() {
      return dependencies.EventEmitter;
    },
    get uiParserElement() {
      return uiParserElement;
    },
  });
  const MenuItem = createMenuItem({
    get Easing() {
      return dependencies.Easing;
    },
  });
  const PreservedSideMenu = createSideMenu({
    get Easing() {
      return dependencies.Easing;
    },
    get MenuItem() {
      return MenuItem;
    },
    get PropertyTween() {
      return dependencies.PropertyTween;
    },
    get TweenGroup() {
      return dependencies.TweenGroup;
    },
    get UiComponent() {
      return UiComponent;
    },
    get ValueTween() {
      return dependencies.ValueTween;
    },
  });
  const SideMenu = createInteriorSideMenu({
    SideMenu: PreservedSideMenu,
    MenuItem,
    PropertyTween: dependencies.PropertyTween,
    Easing: dependencies.Easing,
  });
  const InteriorDesignDialog = createInteriorDesignDialog({
    UiComponent,
    PropertyTween: dependencies.PropertyTween,
    Easing: dependencies.Easing,
    get dialogEvents() {
      return dialogEvents;
    },
  });
  const MoreThingsDialog = createMoreThingsDialog({ InteriorDesignDialog });
  const PanelState = Object.create(null);
  PanelState.EMPTY = 0;
  PanelState.MESSAGE = 2;
  PanelState.CONTENT = 3;
  const MessageKind = Object.create(null);
  MessageKind.INFO = 0;
  MessageKind.SUCCESS = 1;
  MessageKind.WARNING = 2;
  MessageKind.ERROR = 3;
  const messageClassNames = ['', 'success-copy', 'warning-copy', 'error-copy'];
  const ContentPanel = createContentPanel({
    get PanelState() {
      return PanelState;
    },
    get messageClassNames() {
      return messageClassNames;
    },
  });
  const DialogEvents = Object.create(null);
  DialogEvents.USER_CLOSE = 'u_close';
  DialogEvents.CLOSE = 'close';
  DialogEvents.ITEM_CLICK = 'i_click';
  DialogEvents.CONFIRM = 'confirm';
  const dialogEvents = DialogEvents;
  const BaseDialog = createBaseDialog({
    get UiComponent() {
      return UiComponent;
    },
    get dialogEvents() {
      return dialogEvents;
    },
  });
  const PreservedActionDialog = createActionDialog({
    get BaseDialog() {
      return BaseDialog;
    },
    get ContentPanel() {
      return ContentPanel;
    },
    get dialogEvents() {
      return dialogEvents;
    },
  });
  return {
    UiComponent,
    SideMenu,
    InteriorDesignDialog,
    MoreThingsDialog,
    MessageKind,
    ContentPanel,
    dialogEvents,
    BaseDialog,
    PreservedActionDialog,
  };
}
