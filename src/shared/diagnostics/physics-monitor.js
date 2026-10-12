export default function physicsMonitor(module, _exports, loadModule) {
  const definitions = loadModule('shared/diagnostics/metric-definitions');
  module.exports = new (class PhysicsMonitor {
    constructor() {
      this.data = definitions;
      for (let index = 0; index < this.data.length; index++) {
        this[this.data[index].name] = index;
      }
      this._viewer = null;
      this._viewerFactory = null;
    }
    setViewerFactory(factory) {
      if (typeof factory !== 'function') {
        throw new TypeError('Monitor view factory must be a function');
      }
      this._viewerFactory = factory;
    }
    createViewer() {
      if (!this._viewer) {
        if (!this._viewerFactory) {
          throw new Error('Monitor view has not been configured');
        }
        this._viewer = this._viewerFactory();
      }
    }
    clear() {
      for (const metric of this.data) {
        metric.value = 0;
      }
    }
    startTick(name) {
      const metric = this.data[this[name]];
      metric.value = performance.now() - metric.value;
    }
    stopTick(name) {
      const metric = this.data[this[name]];
      metric.value = performance.now() - metric.value;
    }
    count(name, amount) {
      this.data[this[name]].value += amount;
    }
    end() {
      if (this._viewer) {
        this._viewer.update(this);
      }
    }
  })();
}
