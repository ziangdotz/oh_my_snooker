export default function metricChartModule(module, exports, loadModule) {
  const RollingAverage = loadModule('shared/diagnostics/rolling-average');
  module.exports = class MetricChart {
    constructor(t, e, i, n, r) {
      ((this.recorder = new RollingAverage(void 0 === n ? 320 : n)),
        (this.precision = void 0 === r ? 1 : r),
        (this.name = t),
        (this.color = e),
        (this.upperBound = i),
        (this.width = 245),
        (this.height = 36),
        (this.fpu = 60),
        (this.frame = Math.round(Math.random() * this.fpu)),
        this.initView());
    }
    initView() {
      this.container = document.createElement('div');
      var t = this.container.style;
      ((t.width = this.width + 'px'),
        (t.height = this.height + 'px'),
        (t.backgroundColor = '#1a1a1a'),
        (t.opacity = '0.9'),
        (t.display = 'block'),
        (t.position = 'absolute'),
        (t.borderTop = '1px solid #2c2c2c'),
        (t.borderRight = '1px solid #2c2c2c'),
        (t.borderBottom = '1px solid #2c2c2c'),
        (t.boxSizing = 'border-box'));
      var e = document.createElement('div');
      (((t = e.style).display = 'block'),
        (t.position = 'absolute'),
        (t.width = '2px'),
        (t.height = this.height + 'px'),
        (t.top = '-1px'),
        (t.left = '-1px'),
        (t.backgroundColor = this.color),
        this.container.appendChild(e));
      var i = document.createElement('div');
      ((i.innerHTML = this.name),
        ((t = i.style).display = 'block'),
        (t.position = 'absolute'),
        (t.color = this.color),
        (t.top = '14px'),
        (t.left = '8px'),
        (t.fontSize = '10px'),
        this.container.appendChild(i));
      var s = document.createElement('canvas');
      ((s.width = 320),
        (s.height = 60),
        ((t = s.style).display = 'block'),
        (t.position = 'absolute'),
        (t.width = '160px'),
        (t.height = '30px'),
        (t.top = '2px'),
        (t.left = '81px'),
        (t.backgroundColor = '#303030'),
        this.container.appendChild(s));
      var n = document.createElement('div');
      (((t = n.style).display = 'block'),
        (t.position = 'absolute'),
        (t.color = this.color),
        (t.fontSize = '12px'),
        (t.left = '88px'),
        (t.top = '12px'),
        this.container.appendChild(n));
      var r = document.createElement('div');
      (((t = r.style).display = 'block'),
        (t.position = 'absolute'),
        (t.color = '#ccc'),
        (t.fontSize = '9px'),
        (t.right = '4px'),
        (t.top = '4px'),
        this.container.appendChild(r));
      var a = document.createElement('div');
      (((t = a.style).display = 'block'),
        (t.position = 'absolute'),
        (t.color = '#ccc'),
        (t.fontSize = '9px'),
        (t.right = '4px'),
        (t.bottom = '4px'),
        this.container.appendChild(a),
        (this.viewWidth = s.width),
        (this.viewHeight = s.height),
        (this.ctx = s.getContext('2d')),
        (this.ctx.strokeStyle = this.color),
        (this.ctx.lineWidth = 1),
        (this.valueLabel = n),
        (this.peakLabel = r),
        (this.avgLabel = a));
    }
    push(t) {
      this.recorder.push(t);
    }
    update() {
      var t = this.recorder,
        e = this.ctx,
        i = this.viewWidth,
        s = this.viewHeight,
        n = this.upperBound;
      if (
        ((this.valueLabel.innerHTML = t.current.toFixed(this.precision)),
        (this.peakLabel.innerHTML = 'P ' + t.peak.toFixed(this.precision)),
        (this.avgLabel.innerHTML = 'A ' + t.avg.toFixed(this.precision)),
        t.counter > 1 && ++this.frame >= this.fpu)
      ) {
        ((this.frame = 0), e.clearRect(0, 0, i, s), e.beginPath());
        var r = Math.min(t.counter, t.length),
          a = i / (t.length - 1),
          o = t.a,
          l = t.counter - 1,
          h = i,
          c = (1 - o[l % t.length] / n) * s;
        (c < 0 && (c = 0), e.moveTo(h, c));
        for (var d = 1; d !== r; ++d)
          ((h -= a), (c = (1 - o[--l % t.length] / n) * s) < 0 && (c = 0), e.lineTo(h, c));
        e.stroke();
      }
    }
    setPosition(t, e) {
      let i = this.container.style;
      ((i.left = e + 'px'), (i.top = t + 'px'));
    }
  };
}
