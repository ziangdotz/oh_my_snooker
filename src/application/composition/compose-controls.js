import createInputState from '../../presentation/input/input-state.js';
import createControlGroup from '../controls/control-group.js';
/** Own this type family and its shared state once per game composition. */
export default function composeControls() {
  const InputState = createInputState({});
  const ControlGroup = createControlGroup({
    get InputState() {
      return InputState;
    },
  });
  const ControlEvents = Object.create(null);
  ((ControlEvents.SWITCH = 'switch'),
    (ControlEvents.POP_BOX = 'pop_box'),
    (ControlEvents.MESSAGE = 'msg'),
    (ControlEvents.CHANGE_CONTROL_GROUP = 'gcg'),
    (ControlEvents.SHOTTING_START = 'shotting_start'));
  const controlEvents = ControlEvents;
  const ToolbarGroup = Object.create(null);
  ((ToolbarGroup.NULL = 0), (ToolbarGroup.PAUSE = 1), (ToolbarGroup.REPLAY = 2));

  return { ControlGroup, controlEvents, ToolbarGroup };
}
