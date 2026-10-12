import test from 'node:test';
import assert from 'node:assert/strict';
import { cueFixture } from '../helpers/cue-fixture.mjs';

test('cue material keeps constructor identities, texture order, parameters, falloff and freezing', () => {
  const { cache, definitions, operations, Babylon } = cueFixture();
  const scene = {};
  const probe = {};
  const material = cache.createSourceMaterial('stickAlpha', 'custom-name', scene, probe);
  assert.ok(material instanceof Babylon.PcolDyIBLMaterial);
  assert.equal(material.scene, scene);
  assert.equal(material.probe, probe);
  assert.equal(material.radianceLevel, 0.12);
  assert.equal(material.irradianceLevel, 1);
  assert.equal(material.roughness, 1);
  assert.equal(material.useRadianceLodRoughness, true);
  assert.equal(material.toneMappingMode, 2);
  assert.deepEqual(material.falloff, [1.5, 10, 2, 1.5]);
  assert.equal(material.freezes, 1);
  assert.deepEqual(operations, [
    ['material', 'custom-name', scene, probe],
    ['texture', definitions.stickAlpha.manifest.glossy, scene],
    ['texture', definitions.stickAlpha.manifest.color, scene],
    ['falloff', 1.5, 10, 2, 1.5],
    ['freeze', 'custom-name'],
  ]);
  definitions.stickAlpha.manifest.color = 'current-color.jpg';
  assert.equal(
    cache.createSourceMaterial('stickAlpha', 'next', scene, probe).diffuseTexture.url,
    'current-color.jpg',
  );
});

test('cue managers share model cache and clone IDs but own scene materials and mesh instances', () => {
  const { CueMeshManager, requests, parses } = cueFixture();
  const first = new CueMeshManager();
  const second = new CueMeshManager();
  const scene = {};
  const otherScene = {};
  const probe = {};
  first.resetScene(scene, probe);
  second.resetScene(otherScene, probe);
  assert.equal(first.getStickMaterial('stickAlpha', true), undefined);
  assert.equal(first.requireStick('stickAlpha'), null);
  assert.equal(second.requireStick('stickAlpha'), null);
  assert.equal(requests.length, 1);
  requests[0].success('{"meshes":[{"name":"StickAlpha","id":"alpha"}]}');
  first.cancelPendingCheck();
  second.cancelPendingCheck();
  const mesh = first.requireStick('stickAlpha');
  const otherMesh = second.requireStick('stickAlpha');
  assert.notEqual(mesh, otherMesh);
  assert.equal(parses.length, 2);
  assert.equal(parses[0].parsed, parses[1].parsed);
  assert.equal(parses[0].scene, scene);
  assert.equal(parses[1].scene, otherScene);
  assert.equal(parses[0].root, '');
  assert.notEqual(mesh.material, otherMesh.material);
  assert.equal(mesh.material.scene, scene);
  assert.equal(otherMesh.material.scene, otherScene);
  assert.equal(mesh.material.probe, probe);
  assert.equal(mesh.material.freezes, 2);
  assert.equal(mesh.specs, otherMesh.specs);
  assert.equal(first.requireStick('stickAlpha'), mesh);
  mesh.inUse = otherMesh.inUse = true;
  const clone = first.requireStick('stickAlpha');
  const otherClone = second.requireStick('stickAlpha');
  assert.equal(clone.name, mesh.name + '1');
  assert.equal(otherClone.name, otherMesh.name + '2');
  assert.equal(clone.material, mesh.material);
  assert.equal(clone.specs, mesh.specs);
  first.markStickMeshAsUnused(mesh);
  assert.equal(mesh.isVisible, false);
  assert.equal(first.requireStick('stickAlpha'), mesh);
  const oldMaterial = mesh.material;
  first.unload();
  first.resetScene({}, {});
  const rebuilt = first.requireStick('stickAlpha');
  assert.notEqual(rebuilt, mesh);
  assert.notEqual(rebuilt.material, oldMaterial);
  assert.equal(rebuilt.specs, mesh.specs);
  rebuilt.inUse = true;
  assert.equal(first.requireStick('stickAlpha').name, rebuilt.name + '3');
  assert.equal(requests.length, 1);
  const isolated = cueFixture();
  const fresh = new isolated.CueMeshManager();
  fresh.resetScene({}, {});
  fresh.requireStick('stickAlpha');
  isolated.requests[0].success('{"meshes":[{"name":"StickAlpha","id":"alpha"}]}');
  fresh.cancelPendingCheck();
  const freshMesh = fresh.requireStick('stickAlpha');
  freshMesh.inUse = true;
  assert.equal(fresh.requireStick('stickAlpha').name, freshMesh.name + '1');
});

test('pending cues deduplicate, retry readiness, emit the shared event and cancel only manager polling', () => {
  const { CueMeshManager, CueEvents, requests, timers, flushTimers } = cueFixture();
  assert.equal(Object.getPrototypeOf(CueEvents), null);
  assert.equal(CueEvents.READY, 'ready');
  const first = new CueMeshManager();
  const second = new CueMeshManager();
  first.resetScene({}, {});
  second.resetScene({}, {});
  let ready = 0;
  first.on(CueEvents.READY, () => ready++);
  second.on(CueEvents.READY, () => ready++);
  first.requireStick('stickAlpha');
  first.requireStick('stickAlpha');
  second.requireStick('stickAlpha');
  assert.equal(first.pendingCount, 1);
  assert.equal(second.pendingCount, 1);
  assert.equal(timers.size, 2);
  flushTimers();
  assert.equal(ready, 0);
  assert.equal(timers.size, 2);
  first.unload();
  assert.equal(first.pendingCount, 0);
  assert.equal(timers.size, 1);
  assert.equal(requests.length, 1);
  requests[0].success('{"meshes":[{"name":"StickAlpha","id":"alpha"}]}');
  flushTimers();
  assert.equal(second.pendingCount, 0);
  assert.equal(ready, 1);
  assert.equal(timers.size, 0);
  first.resetScene({}, {});
  assert.ok(first.requireStick('stickAlpha'));
  assert.equal(requests.length, 1);
});
