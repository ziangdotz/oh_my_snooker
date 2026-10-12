export default function collisionMeshLoaderModule(module, exports, loadModule) {
  const AssetQueue = loadModule('infrastructure/assets/asset-queue');
  const LocalRequest = loadModule('infrastructure/network/local-request');
  const PhysicsApi = loadModule('domain/physics/physics-api');
  const normalMapApi = PhysicsApi.exts.uv4pg;
  const ResourcePaths = loadModule('infrastructure/assets/resource-paths');

  module.exports = new (class extends AssetQueue {
    _loadHandler(id) {
      let completed = false;
      let responseReceived = false;
      const complete = (value) => {
        if (!completed) {
          completed = true;
          this._onTaskComplete(id, value);
        }
      };
      const fail = (error) => {
        complete(AssetQueue.errObj(error?.message));
      };
      const receive = (error, response) => {
        if (completed || responseReceived) {
          return;
        }
        responseReceived = true;
        if (error) {
          fail(error);
          return;
        }
        try {
          const data = JSON.parse(response);
          const body = new PhysicsApi.MeshBody(data);
          const textures = new Map();
          for (const group of body.groups) {
            const filename = data[group.name].nt;
            if (filename) {
              if (!textures.has(filename)) {
                textures.set(filename, { groups: [], completed: false });
              }
              textures.get(filename).groups.push(group);
            }
          }
          if (textures.size === 0) {
            complete(body);
            return;
          }

          let remaining = textures.size;
          let lastError = null;
          const receiveTexture = (texture, error, image) => {
            if (completed || texture.completed) {
              return;
            }
            texture.completed = true;
            try {
              if (error) {
                lastError = error;
              } else {
                const pixels = LocalRequest.img2ImgData(image);
                const normalTable = normalMapApi.createNTableWithImgData(pixels);
                for (const group of texture.groups) {
                  normalMapApi.extendPolyGroup(group, normalTable);
                }
              }
            } catch (error) {
              lastError = error;
            } finally {
              for (const group of texture.groups) {
                delete group.pendingImg;
              }
            }
            remaining--;
            if (remaining === 0) {
              if (lastError) {
                fail(lastError);
              } else {
                complete(body);
              }
            }
          };
          for (const [filename, texture] of textures) {
            try {
              const image = LocalRequest.loadImg(ResourcePaths.rgb + filename, (error, image) => {
                receiveTexture(texture, error, image);
              });
              if (!texture.completed) {
                for (const group of texture.groups) {
                  group.pendingImg = image;
                }
              }
            } catch (error) {
              receiveTexture(texture, error);
            }
          }
        } catch (error) {
          fail(error);
        }
      };
      try {
        LocalRequest.ajaxGet(ResourcePaths.rgb + id, receive);
      } catch (error) {
        fail(error);
      }
    }
  })();
}
