export default function monitorViewModule(module, exports, loadModule) {
  const MetricChart = loadModule('presentation/diagnostics/metric-chart'),
    n = 600,
    r = function (t) {
      return t.toUpperCase();
    };
  module.exports = class MonitorView {
    constructor() {
      ((this.startTime = 0), (this.__viewInited = !1), (this.monitors = Object.create(null)));
    }
    initView(t) {
      ((this.__viewInited = !0),
        (this.height = 0),
        (this.container = document.createElement('div')),
        (this.container.id = 'dev-tool'));
      for (var e = t.data, i = 0, s = e.length; i !== s; ++i) {
        var r = e[i];
        r.visible && this.appendMonitor(r.name, r.color, r.ceiling, n, r.digits);
      }
      var a = this.container.style;
      ((a.display = 'block'),
        (a.position = 'absolute'),
        (a.top = '1px'),
        (a.right = '1px'),
        (a.width = '245px'),
        (a.webkitUserSelect = 'none'),
        (a.pointerEvents = 'none'),
        document.body.appendChild(this.container));
    }
    appendMonitor(t, e, i, n, a) {
      var o = new MetricChart(t.replace(/^(\w)/, r), e, i, n, a);
      (o.setPosition(this.height, 0),
        this.container.appendChild(o.container),
        (this.monitors[t] = o),
        (this.height += o.height - 1));
    }
    update(t) {
      this.__viewInited || this.initView(t);
      for (var e = this.monitors, i = t.data, s = 0, n = i.length; s !== n; ++s) {
        var r = i[s],
          a = e[r.name];
        a && (a.push(r.value), a.update());
      }
    }
  };
}
