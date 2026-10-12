import { EventEmitter } from 'node:events';
import createCueMaterial from '../../src/presentation/rendering/cue-material.js';
import createCueDefinitions from '../../src/presentation/rendering/cue-definitions.js';
import createCueAssetCache from '../../src/infrastructure/assets/cue-asset-cache.js';
import { factoryContext } from './composition-fixture.mjs';

/** Exercise real cue factories with observable transport, materials and scene meshes. */
export function cueFixture() {
  const requests = [];
  const operations = [];
  const parses = [];
  const timers = new Map();
  let nextTimer = 0;
  const manifest = {
    model: 'assets/models/alpha-cue.babylon',
    glossy: 'assets/textures/cue/cue-gloss.png',
    color: 'assets/textures/cue/cue-color.jpg',
  };
  class Material {
    constructor(name, scene, probe) {
      operations.push(['material', name, scene, probe]);
      this.name = name;
      this.scene = scene;
      this.probe = probe;
      this.freezes = 0;
    }
    setLodFallOff(...values) {
      operations.push(['falloff', ...values]);
      this.falloff = values;
    }
    freeze() {
      operations.push(['freeze', this.name]);
      this.freezes++;
      this.isFrozen = true;
    }
  }
  class Texture {
    constructor(url, scene) {
      operations.push(['texture', url, scene]);
      this.url = url;
      this.scene = scene;
    }
  }
  function mesh(name) {
    return {
      name,
      clone(cloneName) {
        return mesh(cloneName);
      },
    };
  }
  const Babylon = {
    PcolDyIBLMaterial: Material,
    Texture,
    Tools: {
      LoadFile(url, success, progress, database, binary, failure) {
        requests.push({ url, success, progress, database, binary, failure });
      },
    },
    Mesh: {
      Parse(parsed, scene, root) {
        parses.push({ parsed, scene, root });
        return mesh(parsed.name);
      },
    },
  };
  const window = {
    setTimeout(callback, milliseconds) {
      const id = ++nextTimer;
      timers.set(id, { callback, milliseconds });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const definitions = createCueDefinitions(manifest, createCueMaterial(Material, Texture));
  const cache = createCueAssetCache(definitions, (url, success, failure) => {
    Babylon.Tools.LoadFile(url, success, null, null, false, failure);
  });
  const composeCues = factoryContext('src/application/composition/compose-cues.js', { window });
  const values = composeCues({
    Babylon,
    EventEmitter: { a: EventEmitter },
    CueMaterial: Material,
    CueTexture: Texture,
    manifest,
  });
  return {
    ...values,
    definitions,
    cache,
    Babylon,
    requests,
    operations,
    parses,
    timers,
    flushTimers() {
      const pending = [...timers.values()];
      timers.clear();
      for (const timer of pending) {
        assertTimer(timer);
        timer.callback();
      }
    },
  };
}

function assertTimer(timer) {
  if (timer.milliseconds !== 120) {
    throw new Error('Cue pending interval changed');
  }
}
