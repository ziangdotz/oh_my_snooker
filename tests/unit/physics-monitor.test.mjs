import test from 'node:test';
import assert from 'node:assert/strict';
import physicsMonitor from '../../src/shared/diagnostics/physics-monitor.js';

test('metrics retain reset and count behavior while UI construction stays injected and lazy', () => {
  const module = {};
  const data = [{ name: 'step', value: 3 }];
  physicsMonitor(module, {}, () => data);
  const monitor = module.exports;
  monitor.clear();
  monitor.count('step', 2);
  assert.equal(data[0].value, 2);
  let views = 0;
  let updates = 0;
  monitor.setViewerFactory(() => {
    views++;
    return {
      update(source) {
        assert.equal(source, monitor);
        updates++;
      },
    };
  });
  monitor.end();
  assert.equal(views, 0);
  monitor.createViewer();
  monitor.createViewer();
  monitor.end();
  assert.equal(views, 1);
  assert.equal(updates, 1);
  assert.throws(() => monitor.setViewerFactory(null), TypeError);
});
