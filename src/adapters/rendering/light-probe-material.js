/* eslint no-prototype-builtins: "off" -- Preserved inheritance helper. */
export default function lightProbeMaterialModule(module, exports, loadModule) {
  let s = loadModule('adapters/rendering/babylon-engine');
  var n,
    r =
      (this && this.__extends) ||
      ((n =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, e) {
            t.__proto__ = e;
          }) ||
        function (t, e) {
          for (var i in e) e.hasOwnProperty(i) && (t[i] = e[i]);
        }),
      function (t, e) {
        function i() {
          this.constructor = t;
        }
        (n(t, e),
          (t.prototype = null === e ? Object.create(e) : ((i.prototype = e.prototype), new i())));
      }),
    a =
      (this && this.__decorate) ||
      function (t, e, i, s) {
        var n,
          r = arguments.length,
          a = r < 3 ? e : null === s ? (s = Object.getOwnPropertyDescriptor(e, i)) : s;
        if ('object' == typeof Reflect && 'function' == typeof Reflect.decorate)
          a = Reflect.decorate(t, e, i, s);
        else
          for (var o = t.length - 1; o >= 0; o--)
            (n = t[o]) && (a = (r < 3 ? n(a) : r > 3 ? n(e, i, a) : n(e, i)) || a);
        return (r > 3 && a && Object.defineProperty(e, i, a), a);
      };
  (!(function (t) {
    var e = (function (t) {
        function e() {
          var e = t.call(this) || this;
          return (
            (e.MAINUV1 = !1),
            (e.MAINUV2 = !1),
            (e.CHAOTIC = !1),
            (e.CHAOTICDIRECTUV = 0),
            (e.DIFFUSEBASE = !1),
            (e.DIFFUSEBASEDIRECTUV = 0),
            (e.DIFFUSEOVERLAY = !1),
            (e.DIFFUSEOVERLAYDIRECTUV = 0),
            (e.LIGHTMAP = !1),
            (e.LIGHTMAPDIRECTUV = 0),
            (e.TONEMAPPINGMODE = 0),
            (e.CLIPPLANE = !1),
            (e.ALPHATEST = !1),
            (e.DEPTHPREPASS = !1),
            (e.POINTSIZE = !1),
            (e.NORMAL = !1),
            (e.UV1 = !1),
            (e.UV2 = !1),
            (e.VERTEXCOLOR = !1),
            (e.VERTEXALPHA = !1),
            (e.INSTANCES = !1),
            (e.PBR = !0),
            (e.USEPHYSICALLIGHTFALLOFF = !0),
            e.rebuild(),
            e
          );
        }
        return (
          r(e, t),
          (e.prototype.reset = function () {
            (t.prototype.reset.call(this), (this.PBR = !0), (this.USEPHYSICALLIGHTFALLOFF = !0));
          }),
          e
        );
      })(t.MaterialDefines),
      i = (function (i) {
        function s(e, s) {
          var n = i.call(this, e, s) || this;
          return (
            (n.diffuseColor = new t.Color3(1, 1, 1)),
            (n.reflectivityColor = new t.Color3(0.04, 0.04, 0.04)),
            (n._disableLighting = !1),
            (n._maxSimultaneousLights = 4),
            (n._toneMappingMode = 2),
            n
          );
        }
        return (
          r(s, i),
          (s.prototype.getClassName = function () {
            return 'PcolCarpetMaterial';
          }),
          (s.prototype.needAlphaBlending = function () {
            return this.alpha < 1;
          }),
          (s.prototype.needAlphaTesting = function () {
            return !1;
          }),
          (s.prototype.getAlphaTestTexture = function () {
            return null;
          }),
          (s.prototype.isReadyForSubMesh = function (i, s, n) {
            if (s.effect && this.isFrozen && this._wasPreviouslyReady) return !0;
            s._materialDefines || (s._materialDefines = new e());
            var r = this.getScene(),
              a = s._materialDefines;
            if (!this.checkReadyOnEveryCall && s.effect && a._renderId === r.getRenderId())
              return !0;
            var o = r.getEngine();
            if (
              ((a._needNormals = t.MaterialHelper.PrepareDefinesForLights(
                r,
                i,
                a,
                !0,
                this._maxSimultaneousLights,
                this._disableLighting,
              )),
              a._areTexturesDirty)
            ) {
              if (((a._needUVs = !1), (a.MAINUV1 = !1), (a.MAINUV2 = !1), r.texturesEnabled)) {
                if (this._chaoticTexture) {
                  if (!this._chaoticTexture.isReadyOrNotBlocking()) return !1;
                  t.MaterialHelper.PrepareDefinesForMergedUV(this._chaoticTexture, a, 'CHAOTIC');
                } else a.CHAOTIC = !1;
                if (this._diffuseBaseTexture) {
                  if (!this._diffuseBaseTexture.isReadyOrNotBlocking()) return !1;
                  t.MaterialHelper.PrepareDefinesForMergedUV(
                    this._diffuseBaseTexture,
                    a,
                    'DIFFUSEBASE',
                  );
                } else a.DIFFUSEBASE = !1;
                if (this._diffuseOverlayTexture) {
                  if (!this._diffuseOverlayTexture.isReadyOrNotBlocking()) return !1;
                  t.MaterialHelper.PrepareDefinesForMergedUV(
                    this._diffuseOverlayTexture,
                    a,
                    'DIFFUSEOVERLAY',
                  );
                } else a.DIFFUSEOVERLAY = !1;
                if (this._lightmapTexture) {
                  if (!this._lightmapTexture.isReadyOrNotBlocking()) return !1;
                  t.MaterialHelper.PrepareDefinesForMergedUV(this._lightmapTexture, a, 'LIGHTMAP');
                } else a.LIGHTMAP = !1;
              } else
                ((a.CHAOTIC = !1),
                  (a.DIFFUSEBASE = !1),
                  (a.DIFFUSEOVERLAY = !1),
                  (a.LIGHTMAP = !1));
              a.TONEMAPPINGMODE = this._toneMappingMode;
            }
            if (
              (a._areMiscDirty && (a.POINTSIZE = this.pointsCloud || r.forcePointsCloud),
              t.MaterialHelper.PrepareDefinesForAttributes(i, a, !0, !1, !1),
              t.MaterialHelper.PrepareDefinesForFrameBoundValues(r, o, a, !!n),
              a.isDirty)
            ) {
              (a.markAsProcessed(), r.resetCachedMaterial());
              var l = new t.EffectFallbacks();
              t.MaterialHelper.HandleFallbacksForShadows(a, l, this.maxSimultaneousLights);
              var h = [t.VertexBuffer.PositionKind];
              (a.NORMAL && h.push(t.VertexBuffer.NormalKind),
                a.UV1 && h.push(t.VertexBuffer.UVKind),
                a.UV2 && h.push(t.VertexBuffer.UV2Kind),
                a.VERTEXCOLOR && h.push(t.VertexBuffer.ColorKind),
                t.MaterialHelper.PrepareAttributesForInstances(h, a));
              var c = [
                  'world',
                  'view',
                  'viewProjection',
                  'vEyePosition',
                  'vLightsType',
                  'vDiffuseColor',
                  'vReflectivityColor',
                  'vFogInfos',
                  'vFogColor',
                  'pointSize',
                  'vChaoticInfos',
                  'vDiffuseBaseInfos',
                  'vDiffuseOverlayInfos',
                  'vLightmapInfos',
                  'vClipPlane',
                  'chaoticMatrix',
                  'diffuseBaseMatrix',
                  'diffuseOverlayMatrix',
                  'lightmapMatrix',
                ],
                d = [
                  'chaoticSampler',
                  'diffuseBaseSampler',
                  'diffuseOverlaySampler',
                  'lightmapSampler',
                ],
                u = ['Material', 'Scene'];
              t.MaterialHelper.PrepareUniformsAndSamplersList({
                uniformsNames: c,
                uniformBuffersNames: u,
                samplers: d,
                defines: a,
                maxSimultaneousLights: this.maxSimultaneousLights,
              });
              var _ = a.toString();
              (s.setEffect(
                r.getEngine().createEffect(
                  'pcolCarpet',
                  {
                    attributes: h,
                    uniformsNames: c,
                    uniformBuffersNames: u,
                    samplers: d,
                    defines: _,
                    fallbacks: l,
                    onCompiled: this.onCompiled,
                    onError: this.onError,
                    indexParameters: { maxSimultaneousLights: this._maxSimultaneousLights },
                  },
                  o,
                ),
                a,
              ),
                this.buildUniformLayout());
            }
            return (
              !(!s.effect || !s.effect.isReady()) &&
              ((a._renderId = r.getRenderId()), (this._wasPreviouslyReady = !0), !0)
            );
          }),
          (s.prototype.buildUniformLayout = function () {
            (this._uniformBuffer.addUniform('vChaoticInfos', 2),
              this._uniformBuffer.addUniform('vDiffuseBaseInfos', 2),
              this._uniformBuffer.addUniform('vDiffuseOverlayInfos', 2),
              this._uniformBuffer.addUniform('vLightmapInfos', 2),
              this._uniformBuffer.addUniform('chaoticMatrix', 16),
              this._uniformBuffer.addUniform('diffuseBaseMatrix', 16),
              this._uniformBuffer.addUniform('diffuseOverlayMatrix', 16),
              this._uniformBuffer.addUniform('lightmapMatrix', 16),
              this._uniformBuffer.addUniform('vDiffuseColor', 4),
              this._uniformBuffer.addUniform('vReflectivityColor', 3),
              this._uniformBuffer.addUniform('pointSize', 1),
              this._uniformBuffer.create());
          }),
          (s.prototype.bindForSubMesh = function (e, i, s) {
            var n = this.getScene(),
              r = s._materialDefines;
            if (r) {
              var a = s.effect;
              if (a) {
                ((this._activeEffect = a), this.bindOnlyWorldMatrix(e));
                var o = this._mustRebind(n, a, i.visibility);
                if (o) {
                  (this._uniformBuffer.bindToEffect(a, 'Material'),
                    this.bindViewProjection(a),
                    (this._uniformBuffer.useUbo && this.isFrozen && this._uniformBuffer.isSync) ||
                      (n.texturesEnabled &&
                        (this._chaoticTexture &&
                          (this._uniformBuffer.updateFloat2(
                            'vChaoticInfos',
                            this._chaoticTexture.coordinatesIndex,
                            this._chaoticTexture.level,
                          ),
                          t.MaterialHelper.BindTextureMatrix(
                            this._chaoticTexture,
                            this._uniformBuffer,
                            'chaotic',
                          )),
                        this._diffuseBaseTexture &&
                          (this._uniformBuffer.updateFloat2(
                            'vDiffuseBaseInfos',
                            this._diffuseBaseTexture.coordinatesIndex,
                            this._diffuseBaseTexture.level,
                          ),
                          t.MaterialHelper.BindTextureMatrix(
                            this._diffuseBaseTexture,
                            this._uniformBuffer,
                            'diffuseBase',
                          )),
                        this._diffuseOverlayTexture &&
                          (this._uniformBuffer.updateFloat2(
                            'vDiffuseOverlayInfos',
                            this._diffuseOverlayTexture.coordinatesIndex,
                            this._diffuseOverlayTexture.level,
                          ),
                          t.MaterialHelper.BindTextureMatrix(
                            this._diffuseOverlayTexture,
                            this._uniformBuffer,
                            'diffuseOverlay',
                          )),
                        this._lightmapTexture &&
                          (this._uniformBuffer.updateFloat2(
                            'vLightmapInfos',
                            this._lightmapTexture.coordinatesIndex,
                            this._lightmapTexture.level,
                          ),
                          t.MaterialHelper.BindTextureMatrix(
                            this._lightmapTexture,
                            this._uniformBuffer,
                            'lightmap',
                          ))),
                      this.pointsCloud &&
                        this._uniformBuffer.updateFloat('pointSize', this.pointSize),
                      this._uniformBuffer.updateColor4(
                        'vDiffuseColor',
                        this.diffuseColor,
                        this.alpha * i.visibility,
                      ),
                      this._uniformBuffer.updateColor3(
                        'vReflectivityColor',
                        this.reflectivityColor,
                      )),
                    n.texturesEnabled &&
                      (this._chaoticTexture && a.setTexture('chaoticSampler', this._chaoticTexture),
                      this._diffuseBaseTexture &&
                        a.setTexture('diffuseBaseSampler', this._diffuseBaseTexture),
                      this._diffuseOverlayTexture &&
                        a.setTexture('diffuseOverlaySampler', this._diffuseOverlayTexture),
                      this._lightmapTexture &&
                        a.setTexture('lightmapSampler', this._lightmapTexture)),
                    t.MaterialHelper.BindClipPlane(a, n));
                  var l = n._forcedViewPosition
                      ? n._forcedViewPosition
                      : n._mirroredCameraPosition
                        ? n._mirroredCameraPosition
                        : n.activeCamera.globalPosition,
                    h = n.useRightHandedSystem === (null != n._mirroredCameraPosition);
                  a.setFloat4('vEyePosition', l.x, l.y, l.z, h ? -1 : 1);
                }
                ((!o && this.isFrozen) ||
                  (n.lightsEnabled &&
                    !this._disableLighting &&
                    t.MaterialHelper.BindLights(n, i, a, r, this._maxSimultaneousLights)),
                  this._uniformBuffer.update(),
                  this._afterBind(i, this._activeEffect));
              }
            }
          }),
          (s.prototype.getAnimatables = function () {
            var t = [];
            return (
              this._chaoticTexture &&
                this._chaoticTexture.animations &&
                this._chaoticTexture.animations.length > 0 &&
                t.push(this._chaoticTexture),
              this._diffuseBaseTexture &&
                this._diffuseBaseTexture.animations &&
                this._diffuseBaseTexture.animations.length > 0 &&
                t.push(this._diffuseBaseTexture),
              this._diffuseOverlayTexture &&
                this._diffuseOverlayTexture.animations &&
                this._diffuseOverlayTexture.animations.length > 0 &&
                t.push(this._diffuseOverlayTexture),
              this._lightmapTexture &&
                this._lightmapTexture.animations &&
                this._lightmapTexture.animations.length > 0 &&
                t.push(this._lightmapTexture),
              t
            );
          }),
          (s.prototype.getActiveTextures = function () {
            var t = i.prototype.getActiveTextures.call(this);
            return (
              this._chaoticTexture && t.push(this._chaoticTexture),
              this._diffuseBaseTexture && t.push(this._diffuseBaseTexture),
              this._diffuseOverlayTexture && t.push(this._diffuseOverlayTexture),
              this._lightmapTexture && t.push(this._lightmapTexture),
              t
            );
          }),
          (s.prototype.hasTexture = function (t) {
            return (
              !!i.prototype.hasTexture.call(this, t) ||
              this._chaoticTexture === t ||
              this._diffuseBaseTexture === t ||
              this._diffuseOverlayTexture === t ||
              this._lightmapTexture === t
            );
          }),
          (s.prototype.dispose = function (t, e) {
            (e &&
              (this._chaoticTexture && this._chaoticTexture.dispose(),
              this._diffuseBaseTexture && this._diffuseBaseTexture.dispose(),
              this._diffuseOverlayTexture && this._diffuseOverlayTexture.dispose(),
              this._lightmapTexture && this._lightmapTexture.dispose()),
              i.prototype.dispose.call(this, t, e));
          }),
          (s.prototype.clone = function (e) {
            var i = this,
              n = t.SerializationHelper.Clone(function () {
                return new s(e, i.getScene());
              }, this);
            return ((n.name = e), (n.id = e), n);
          }),
          (s.prototype.serialize = function () {
            return t.SerializationHelper.Serialize(this);
          }),
          (s.Parse = function (e, i, n) {
            return t.SerializationHelper.Parse(
              function () {
                return new s(e.name, i);
              },
              e,
              i,
              n,
            );
          }),
          a([t.serializeAsTexture('chaoticTexture')], s.prototype, '_chaoticTexture', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'chaoticTexture',
            void 0,
          ),
          a(
            [t.serializeAsTexture('diffuseBaseTexture')],
            s.prototype,
            '_diffuseBaseTexture',
            void 0,
          ),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'diffuseBaseTexture',
            void 0,
          ),
          a(
            [t.serializeAsTexture('diffuseOverlayTexture')],
            s.prototype,
            '_diffuseOverlayTexture',
            void 0,
          ),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'diffuseOverlayTexture',
            void 0,
          ),
          a([t.serializeAsTexture('lightmapTexture')], s.prototype, '_lightmapTexture', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'lightmapTexture',
            void 0,
          ),
          a([t.serializeAsColor3('diffuse')], s.prototype, 'diffuseColor', void 0),
          a([t.serializeAsColor3('reflectivity')], s.prototype, 'reflectivityColor', void 0),
          a([t.serialize('disableLighting')], s.prototype, '_disableLighting', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsLightsDirty')],
            s.prototype,
            'disableLighting',
            void 0,
          ),
          a([t.serialize('maxSimultaneousLights')], s.prototype, '_maxSimultaneousLights', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsLightsDirty')],
            s.prototype,
            'maxSimultaneousLights',
            void 0,
          ),
          a([t.serialize('toneMappingMode')], s.prototype, '_toneMappingMode', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'toneMappingMode',
            void 0,
          ),
          s
        );
      })(t.PushMaterial);
    t.PcolCarpetMaterial = i;
  })(s || (s = {})),
    (s.Effect.ShadersStore.pcolCarpetVertexShader =
      '#include<__decl__pcolCarpetVertex>\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n\n#include<instancesDeclaration>\n#ifdef MAINUV1\nvarying vec2 vMainUV1;\n#endif\n#ifdef MAINUV2\nvarying vec2 vMainUV2;\n#endif\n#if defined(CHAOTIC) && CHAOTICDIRECTUV == 0\nvarying vec2 vChaoticUV;\n#endif\n#if defined(DIFFUSEBASE) && DIFFUSEBASEDIRECTUV == 0\nvarying vec2 vDiffuseBaseUV;\n#endif\n#if defined(DIFFUSEOVERLAY) && DIFFUSEOVERLAYDIRECTUV == 0\nvarying vec2 vDiffuseOverlayUV;\n#endif\n#if defined(LIGHTMAP) && LIGHTMAPDIRECTUV == 0\nvarying vec2 vLightmapUV;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#include<clipPlaneVertexDeclaration>\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\nvoid main(void) {\n#include<instancesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef MAINUV1\nvMainUV1=uv;\n#endif\n#ifdef MAINUV2\nvMainUV2=uv2;\n#endif\n#if defined(CHAOTIC) && CHAOTICDIRECTUV == 0\nif (vChaoticInfos.x == 0.){\nvChaoticUV=vec2(chaoticMatrix*vec4(uv,1.0,0.0));\n}else{\nvChaoticUV=vec2(chaoticMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n#if defined(DIFFUSEBASE) && DIFFUSEBASEDIRECTUV == 0\nif (vDiffuseBaseInfos.x == 0.){\nvDiffuseBaseUV=vec2(diffuseBaseMatrix*vec4(uv,1.0,0.0));\n}else{\nvDiffuseBaseUV=vec2(diffuseBaseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n#if defined(DIFFUSEOVERLAY) && DIFFUSEOVERLAYDIRECTUV == 0\nif (vDiffuseOverlayInfos.x == 0.){\nvDiffuseOverlayUV=vec2(diffuseOverlayMatrix*vec4(uv,1.0,0.0));\n}else{\nvDiffuseOverlayUV=vec2(diffuseOverlayMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n#if defined(LIGHTMAP) && LIGHTMAPDIRECTUV == 0\nif (vLightmapInfos.x == 0.){\nvLightmapUV=vec2( lightmapMatrix*vec4(uv,1.0,0.0) );\n}else{\nvLightmapUV=vec2( lightmapMatrix*vec4(uv2,1.0,0.0) );\n}\n#endif\n\n#include<clipPlaneVertex>\n#include<shadowsVertex>[0..maxSimultaneousLights]\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n#include<pointCloudVertex>\n}\n'),
    (s.Effect.ShadersStore.pcolCarpetPixelShader =
      '#if defined(CHAOTIC) || !defined(NORMAL)\n#extension GL_OES_standard_derivatives : enable\n#endif\n#include<__decl__pcolCarpetFragment>\n\nuniform vec4 vEyePosition;\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#ifdef MAINUV1\nvarying vec2 vMainUV1;\n#endif\n#ifdef MAINUV2\nvarying vec2 vMainUV2;\n#endif\n\n#include<helperFunctions>\n#include<pbrFunctions>\n\n#include<__decl__lightFragment>[0..maxSimultaneousLights]\n#include<pbrLightFunctions>\n#include<shadowsFragmentFunctions>\n\n#ifdef CHAOTIC\n#if CHAOTICDIRECTUV == 1\n#define vChaoticUV vMainUV1\n#elif CHAOTICDIRECTUV == 2\n#define vChaoticUV vMainUV2\n#else\nvarying vec2 vChaoticUV;\n#endif\nuniform sampler2D chaoticSampler;\n#endif\n#ifdef DIFFUSEBASE\n#if DIFFUSEBASEDIRECTUV == 1\n#define vDiffuseBaseUV vMainUV1\n#elif DIFFUSEBASEDIRECTUV == 2\n#define vDiffuseBaseUV vMainUV2\n#else\nvarying vec2 vDiffuseBaseUV;\n#endif\nuniform sampler2D diffuseBaseSampler;\n#endif\n#ifdef DIFFUSEOVERLAY\n#if DIFFUSEOVERLAYDIRECTUV == 1\n#define vDiffuseOverlayUV vMainUV1\n#elif DIFFUSEOVERLAYDIRECTUV == 2\n#define vDiffuseOverlayUV vMainUV2\n#else\nvarying vec2 vDiffuseOverlayUV;\n#endif\nuniform sampler2D diffuseOverlaySampler;\n#endif\n#ifdef LIGHTMAP\n#if LIGHTMAPDIRECTUV == 1\n#define vLightmapUV vMainUV1\n#elif LIGHTMAPDIRECTUV == 2\n#define vLightmapUV vMainUV2\n#else\nvarying vec2 vLightmapUV;\n#endif\nuniform sampler2D lightmapSampler;\n#endif\n#include<clipPlaneFragmentDeclaration>\nconst vec3 axisY=vec3(0.0,1.0,0.0);\nconst vec3 white=vec3(1.0,1.0,1.0);\nmat3 cotangent_frame(vec3 normal,vec3 p,vec2 uv){\n\nuv=gl_FrontFacing ? uv : -uv;\n\nvec3 dp1=dFdx(p);\nvec3 dp2=dFdy(p);\nvec2 duv1=dFdx(uv);\nvec2 duv2=dFdy(uv);\n\nvec3 dp2perp=cross(dp2,normal);\nvec3 dp1perp=cross(normal,dp1);\nvec3 tangent=dp2perp*duv1.x+dp1perp*duv2.x;\nvec3 bitangent=dp2perp*duv1.y+dp1perp*duv2.y;\n\nfloat invmax=inversesqrt(max(dot(tangent,tangent),dot(bitangent,bitangent)));\nreturn mat3(tangent*invmax,bitangent*invmax,normal);\n}\n\n\nvec3 toneMappingACES( vec3 color) {\nconst float A=2.51;\nconst float B=0.03;\nconst float C=2.43;\nconst float D=0.59;\nconst float E=0.14;\nreturn (color*(A*color+B))/(color*(C*color+D)+E);\n}\nvoid main(void) {\n#include<clipPlaneFragment>\n\nvec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);\n\n\nvec3 surfaceAlbedo=vDiffuseColor.rgb;\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSEOVERLAY\nvec4 overlayTexture=texture2D(diffuseOverlaySampler,vDiffuseOverlayUV);\nfloat overlayMixFactor=overlayTexture.a*vDiffuseOverlayInfos.y;\nsurfaceAlbedo=mix( surfaceAlbedo,toLinearSpace(overlayTexture.rgb),overlayMixFactor );\n#endif\n\n\n#ifdef VERTEXCOLOR\nsurfaceAlbedo*=vColor.rgb;\n#endif\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n\n\n#ifdef ALPHATEST\nif (alpha<=0.4)discard;\n#endif\n\n\n#ifdef NORMAL\n#ifdef CHAOTIC\nmat3 transform=cotangent_frame(vNormalW,vPositionW,vChaoticUV );\nvec3 normalOffset=texture2D(chaoticSampler,vChaoticUV).rgb*2.0-1.0;\n\nconst vec3 normalOffset0=vec3(0.0,0.0,1.0);\nnormalOffset=mix(normalOffset0,normalOffset,vChaoticInfos.y);\nvec3 normalW=normalize( transform*normalOffset )*-vEyePosition.w;\n#else\nvec3 normalW=normalize(vNormalW)*-vEyePosition.w;\n#endif\n#else\n#ifdef CHAOTIC\nvec3 normalW=normalize(cross(dFdx(vPositionW),dFdy(vPositionW));\nmat3 transform=cotangent_frame(normalW,vPositionW,vChaoticUV );\nvec3 normalOffset=texture2D(chaoticSampler,vChaoticUV).rgb*2.0-1.0;\nnormalW=normalize( transform*normalOffset )*-vEyePosition.w;\n#else\nvec3 normalW=normalize(cross(dFdx(vPositionW),dFdy(vPositionW)))*-vEyePosition.w;\n#endif\n#endif\n\n\n\nfloat NdotVUnclamped=dot( normalW,viewDirectionW );\nfloat NdotV=clamp(NdotVUnclamped,0.,1.)+0.00001;\nfloat reflectance=max(max(vReflectivityColor.r,vReflectivityColor.g),vReflectivityColor.b);\nvec3 specularEnvironmentR0=vReflectivityColor;\nvec3 specularEnvironmentR90=vec3(1.0);\n\nvec3 diffuseBase=vec3(0.,0.,0.);\n#ifdef SPECULARTERM\nvec3 specularBase=vec3(0.,0.,0.);\n#endif\nlightingInfo info;\nfloat shadow=1.;\nfloat roughness=1.0;\nfloat NdotL=-1.;\n\nfloat geometricRoughnessFactor=0.;\n\n#include<lightFragment>[0..maxSimultaneousLights]\n#ifdef DIFFUSEBASE\nvec3 diffuseBaseTexture=toLinearSpace(texture2D(diffuseBaseSampler,vDiffuseBaseUV).rgb);\ndiffuseBase*=mix( white,diffuseBaseTexture,vDiffuseBaseInfos.y);\n#ifdef SPECULARTERM\n\nspecularBase*=diffuseBaseTexture*2.0;\n#endif\n#endif\n\n\n#ifdef LIGHTMAP\nvec3 lightmapColor=texture2D(lightmapSampler,vLightmapUV).rgb;\n\n\ndiffuseBase+=lightmapColor.b;\ndiffuseBase*=lightmapColor.g;\n#ifdef SPECULARTERM\n\nreflectance*=(1.0-lightmapColor.r);\nspecularBase*=lightmapColor.g*(1.0-lightmapColor.r);\n#endif\n#endif\n\n\nvec3 finalDiffuse=max(diffuseBase*surfaceAlbedo*(1.0-reflectance),0.0);\n\n\nvec3 final=finalDiffuse;\n#ifdef SPECULARTERM\nfinal+=specularBase;\n#endif\n\n#if TONEMAPPINGMODE == 3\nfinal=toneMappingACES( final );\n#elif TONEMAPPINGMODE == 2\nconst float tonemappingCalibration=1.590579;\nfinal=1.0-exp2(-tonemappingCalibration*final);\n#elif TONEMAPPINGMODE == 1\nfinal=final/(final+vec3(1.0));\n#endif\n\nfinal=toGammaSpace( final );\ngl_FragColor=vec4( final,alpha );\n}\n'),
    (s.Effect.IncludesShadersStore.pcolCarpetFragmentDeclaration =
      'uniform vec4 vDiffuseColor;\nuniform vec3 vReflectivityColor;\n\n#ifdef CHAOTIC\nuniform vec2 vChaoticInfos;\n#endif\n#ifdef DIFFUSEBASE\nuniform vec2 vDiffuseBaseInfos;\n#endif\n#ifdef DIFFUSEOVERLAY\nuniform vec2 vDiffuseOverlayInfos;\n#endif\n#ifdef LIGHTMAP\nuniform vec2 vLightmapInfos;\n#endif'),
    (s.Effect.IncludesShadersStore.pcolCarpetUboDeclaration =
      'layout(std140,column_major) uniform;\nuniform Material\n{\nvec2 vChaoticInfos;\nvec2 vDiffuseBaseInfos;\nvec2 vDiffuseOverlayInfos;\nvec2 vLightmapInfos;\nmat4 chaoticMatrix;\nmat4 diffuseBaseMatrix;\nmat4 diffuseOverlayMatrix;\nmat4 lightmapMatrix;\nvec4 vDiffuseColor;\nvec3 vReflectivityColor;\nfloat pointSize; \n};\nuniform Scene {\nmat4 viewProjection;\nmat4 view;\n};'),
    (s.Effect.IncludesShadersStore.pcolCarpetVertexDeclaration =
      '\nuniform mat4 viewProjection;\nuniform mat4 view;\n#ifdef CHAOTIC\nuniform mat4 chaoticMatrix;\nuniform vec2 vChaoticInfos;\n#endif\n#ifdef DIFFUSEBASE\nuniform mat4 diffuseBaseMatrix;\nuniform vec2 vDiffuseBaseInfos;\n#endif\n#ifdef DIFFUSEOVERLAY\nuniform mat4 diffuseOverlayMatrix;\nuniform vec2 vDiffuseOverlayInfos;\n#endif\n#ifdef LIGHTMAP\nuniform mat4 lightmapMatrix;\nuniform vec2 vLightmapInfos;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif'));
}
