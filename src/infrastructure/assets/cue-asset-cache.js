/** Cache parsed model files once; scene meshes and materials remain manager-owned. */
export default function createCueAssetCache(definitions, loadFile) {
  const pending = { isPending: true };

  function loadModel(cache, url, attempt = 0) {
    const files = cache._cachedFiles;
    files[url] = pending;
    loadFile(
      url,
      (response) => {
        const parsed = Object.create(null);
        try {
          const data = JSON.parse(response);
          for (let index = 0; index !== data.meshes.length; index++) {
            const mesh = data.meshes[index];
            parsed[mesh.name] = mesh;
            mesh.name = url + '/' + mesh.name;
            mesh.id = url + '/' + mesh.id;
          }
        } catch (error) {
          parsed.isError = true;
          parsed.message = error.message;
        } finally {
          files[url] = parsed;
        }
        cache._nCachedFiles++;
      },
      () => {
        if (attempt >= 3) {
          files[url] = { isError: true, message: 'bbl file load error...' };
        } else {
          loadModel(cache, url, attempt + 1);
        }
      },
    );
  }

  return new (class CueAssetCache {
    constructor() {
      this._cachedFiles = Object.create(null);
      this._nCachedFiles = 0;
      this._defaultStickName = 'stickAlpha';
      this._defs = definitions;
    }
    get nCachedFiles() {
      return this._nCachedFiles;
    }
    get defaultStickName() {
      return this._defaultStickName;
    }
    get stickRootFolder() {
      throw new Error('no more stickRootFolder...');
    }
    getStickSpecs(name) {
      return this._defs[name].specs;
    }
    getStickMaterialName(name) {
      return name + 'Mat';
    }
    getStickSourceMeshName(name) {
      const definition = this._defs[name];
      return definition.manifest.model + '/' + definition.meshName;
    }
    getStickMeshName(name) {
      return this._defs[name].meshName;
    }
    createSourceMaterial(name, materialName, scene, lightProbeManager) {
      return this._defs[name].createMaterial(materialName, scene, lightProbeManager);
    }
    getParsedMesh(name, skipLoad = false) {
      const definition = this._defs[name];
      if (!definition) {
        return { isError: true, message: 'stick def not found: "' + name + '"' };
      }
      const url = definition.manifest.model;
      const file = this._cachedFiles[url];
      if (!file) {
        if (!skipLoad) {
          loadModel(this, url);
        }
        return null;
      }
      if (file.isPending) {
        return null;
      }
      if (file.isError) {
        return file;
      }
      const meshName = this.getStickMeshName(name);
      return (
        file[meshName] || {
          isError: true,
          message:
            'Data error "' +
            name +
            '": ParsedMesh "' +
            meshName +
            '" not found in the file "' +
            url +
            '"',
        }
      );
    }
    cacheDefaultFile() {
      return this.getParsedMesh(this._defaultStickName);
    }
  })();
}
