// Explicit live dependencies preserve initialization and shared state.
export default function createBaseController(dependencies) {
  return class BaseController extends dependencies.EventEmitter.a {
    get id() {
      return this._id;
    }
    get name() {
      return this._name;
    }
    get state() {
      return this._state;
    }
    constructor(t) {
      (super(),
        (this._name = t),
        (this._id = ++dependencies.nextControllerId),
        (this._state = dependencies.ControllerState.IDLE));
    }
    launch() {
      this._state = dependencies.ControllerState.PENDING;
    }
    enter() {
      this._state = dependencies.ControllerState.ENTERING;
    }
    action() {
      this._state = dependencies.ControllerState.ACTING;
    }
    exit() {
      this._state = dependencies.ControllerState.EXITING;
    }
    free() {
      ((this._state = dependencies.ControllerState.IDLE), this.removeAllListeners());
    }
  };
}
