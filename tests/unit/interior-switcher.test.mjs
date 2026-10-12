import test from 'node:test';
import assert from 'node:assert/strict';
import createInteriorSwitcher from '../../src/presentation/scenes/create-interior-switcher.js';

function fixture() {
  const callbacks = [];
  const scene = {
    meshes: [],
    lights: [],
    materials: [],
    textures: [],
    metadata: { interiorDesign: { id: 'original', roomMeshes: ['room'] } },
    onDisposeObservable: { add: (callback) => callbacks.push(callback) },
    getMeshByName: (name) => scene.meshes.find((mesh) => mesh.name === name),
    resetCachedMaterial() {},
    isReady: () => true,
    render() {},
  };
  function item(key, name) {
    const value = {
      name,
      enabled: true,
      ready: true,
      isEnabled() {
        return this.enabled;
      },
      setEnabled(enabled) {
        this.enabled = enabled;
      },
      isReady() {
        return this.ready;
      },
      freeze() {
        this.frozen = true;
      },
      dispose() {
        scene[key].splice(scene[key].indexOf(this), 1);
      },
    };
    scene[key].push(value);
    return value;
  }
  const original = item('meshes', 'room');
  const table = item('meshes', 'table');
  let builds = 0;
  let error = null;
  const registry = {
    get(id) {
      return ['one', 'two'].includes(id)
        ? {
            apply() {
              builds++;
              original.setEnabled(false);
              item('meshes', id);
              item('lights', id);
              item('materials', id);
              const texture = item('textures', id);
              texture.interiorLoad = { error };
              scene.metadata.interiorDesign = { id };
            },
          }
        : null;
    },
  };
  const switcher = createInteriorSwitcher(scene, registry);
  return {
    scene,
    original,
    table,
    switcher,
    callbacks,
    setError(value) {
      error = value;
    },
    get builds() {
      return builds;
    },
  };
}

test('room cache preserves the table and reuses geometry, materials and lights without accumulation', async () => {
  const state = fixture();
  state.switcher.initialize('original');
  for (const id of ['one', 'two', 'original', 'two', 'one']) {
    await state.switcher.switchTo(id);
    assert.equal(state.scene.metadata.interiorDesign.id, id);
    assert.equal(state.table.enabled, true);
    assert.equal(state.original.enabled, id === 'original');
    assert.equal(
      state.scene.lights.filter((light) => light.enabled).length,
      id === 'original' ? 0 : 1,
    );
  }
  assert.equal(state.builds, 2);
  assert.equal(state.scene.meshes.length, 4);
  assert.equal(state.scene.textures.length, 2);
  assert.ok(state.scene.materials.every((material) => material.frozen));
});

test('failed texture rolls back the current room, releases candidate resources and permits a real retry', async () => {
  const state = fixture();
  await state.switcher.switchTo('one');
  state.setError('Texture failed');
  await assert.rejects(state.switcher.switchTo('two'), /Texture failed/);
  assert.equal(state.scene.metadata.interiorDesign.id, 'one');
  assert.equal(state.scene.meshes.length, 3);
  assert.equal(state.scene.lights.length, 1);
  assert.equal(state.scene.textures.length, 1);
  state.setError(null);
  await state.switcher.switchTo('two');
  assert.equal(state.builds, 3);
});

test('cancellation rejects pending work, restores the previous room and clears retry state', async () => {
  const state = fixture();
  state.scene.isReady = () => false;
  const pending = state.switcher.switchTo('one');
  await assert.rejects(state.switcher.switchTo('two'), /already in progress/);
  state.switcher.cancel();
  await assert.rejects(pending, /cancelled/);
  assert.equal(state.scene.metadata.interiorDesign.id, 'original');
  assert.equal(state.original.enabled, true);
  assert.equal(state.scene.meshes.length, 2);
  state.scene.isReady = () => true;
  await state.switcher.switchTo('one');
});
