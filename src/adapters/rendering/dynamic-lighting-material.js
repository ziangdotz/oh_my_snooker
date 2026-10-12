/* eslint no-prototype-builtins: "off" -- Preserved inheritance helper. */
export default function dynamicLightingMaterialModule(module, exports, loadModule) {
  let s = loadModule('adapters/rendering/babylon-engine');
  ((s.Effect.ShadersStore.pcolDyIBLVertexShader =
    '#include<__decl__pcolDyIBLVertex>\n\nattribute vec3 position;\n#ifdef NORMAL\nattribute vec3 normal;\n#endif\n#ifdef UV1\nattribute vec2 uv;\n#endif\n#ifdef UV2\nattribute vec2 uv2;\n#endif\n#ifdef VERTEXCOLOR\nattribute vec4 color;\n#endif\n\n#include<instancesDeclaration>\n#ifdef MAINUV1\nvarying vec2 vMainUV1;\n#endif\n#ifdef MAINUV2\nvarying vec2 vMainUV2;\n#endif\n#if defined(DIFFUSE) && DIFFUSEDIRECTUV == 0\nvarying vec2 vDiffuseUV;\n#endif\n#if defined(AO) && AODIRECTUV == 0\nvarying vec2 vAoUV;\n#endif\n#if defined(REFLECTIVITYROUGHNESS) && REFLECTIVITYROUGHNESSDIRECTUV == 0\nvarying vec2 vReflectivityRoughnessUV;\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#ifdef USELODFALLOFF\nuniform vec4 vEyePosition;\nvarying float vLodFallOffFactor;\n#endif\n#include<clipPlaneVertexDeclaration>\nvoid main(void) {\n#include<instancesVertex>\ngl_Position=viewProjection*finalWorld*vec4(position,1.0);\nvec4 worldPos=finalWorld*vec4(position,1.0);\nvPositionW=vec3(worldPos);\n#ifdef NORMAL\nvNormalW=normalize(vec3(finalWorld*vec4(normal,0.0)));\n#endif\n\n#ifndef UV1\nvec2 uv=vec2(0.,0.);\n#endif\n#ifndef UV2\nvec2 uv2=vec2(0.,0.);\n#endif\n#ifdef MAINUV1\nvMainUV1=uv;\n#endif\n#ifdef MAINUV2\nvMainUV2=uv2;\n#endif\n#if defined(DIFFUSE) && DIFFUSEDIRECTUV == 0\nif (vDiffuseInfos.x == 0.){\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv,1.0,0.0));\n}else{\nvDiffuseUV=vec2(diffuseMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n#if defined(AO) && AODIRECTUV == 0\nif (vAoInfos.x == 0.){\nvAoUV=vec2(aoMatrix*vec4(uv,1.0,0.0));\n}else{\nvAoUV=vec2(aoMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n#if defined(REFLECTIVITYROUGHNESS) && REFLECTIVITYROUGHNESSDIRECTUV == 0\nif (vReflectivityRoughnessInfos.x == 0.){\nvReflectivityRoughnessUV=vec2(reflectivityRoughnessMatrix*vec4(uv,1.0,0.0));\n}else{\nvReflectivityRoughnessUV=vec2(reflectivityRoughnessMatrix*vec4(uv2,1.0,0.0));\n}\n#endif\n#ifdef USELODFALLOFF\nfloat dis=distance(vPositionW,vEyePosition.xyz);\n\nvLodFallOffFactor=clamp( (dis-vLodFallOff.x)/vLodFallOff.y,0.0,1.0);\n#endif\n\n#include<clipPlaneVertex>\n\n#ifdef VERTEXCOLOR\nvColor=color;\n#endif\n#include<pointCloudVertex>\n}\n'),
    (s.Effect.ShadersStore.pcolDyIBLPixelShader =
      '#ifdef NORMAL\n#extension GL_OES_standard_derivatives : enable\n#endif\n#ifdef LODBASEDMICROSURFACE\n#extension GL_EXT_shader_texture_lod : enable\n#endif\nprecision highp float;\n#include<__decl__pcolDyIBLFragment>\n\nuniform vec4 vEyePosition;\n#if defined(IRRADIANCE) || defined(DYAO)\n\nuniform float vDynamicRatios[9];\n#endif\n\nvarying vec3 vPositionW;\n#ifdef NORMAL\nvarying vec3 vNormalW;\n#endif\n#ifdef VERTEXCOLOR\nvarying vec4 vColor;\n#endif\n#ifdef MAINUV1\nvarying vec2 vMainUV1;\n#endif\n#ifdef MAINUV2\nvarying vec2 vMainUV2;\n#endif\n#ifdef USELODFALLOFF\nvarying float vLodFallOffFactor;\n#endif\n\n#include<helperFunctions>\n#include<pbrFunctions>\n\n#ifdef DIFFUSE\n#if DIFFUSEDIRECTUV == 1\n#define vDiffuseUV vMainUV1\n#elif DIFFUSEDIRECTUV == 2\n#define vDiffuseUV vMainUV2\n#else\nvarying vec2 vDiffuseUV;\n#endif\nuniform sampler2D diffuseSampler;\n#endif\n#ifdef AO\n#if AODIRECTUV == 10\nuniform samplerCube aoSampler;\n#else\nuniform sampler2D aoSampler;\n#if AODIRECTUV == 1\n#define vAoUV vMainUV1\n#elif AODIRECTUV == 2\n#define vAoUV vMainUV2\n#else\nvarying vec2 vAoUV;\n#endif\n#endif\n#endif\n#define sampleCube(s,c) textureCube(s,c)\n#ifdef LODBASEDMICROSURFACE\n#define sampleCubeLod(s,c,l) textureCubeLodEXT(s,c,l)\n#endif\n\n#ifdef IRRADIANCE\nuniform samplerCube iradSampler0;\nuniform samplerCube iradSampler1;\nuniform samplerCube iradSampler2;\nuniform samplerCube iradSampler3;\nuniform samplerCube iradSampler4;\nuniform samplerCube iradSampler5;\nuniform samplerCube iradSampler6;\nuniform samplerCube iradSampler7;\n#endif\n\n#ifdef RADIANCE\nuniform samplerCube radSampler;\n#endif\n#ifdef ENVIRONMENTBRDF\nuniform sampler2D environmentBrdfSampler;\n#endif\n#ifdef REFLECTIVITYROUGHNESS\n#if REFLECTIVITYROUGHNESSDIRECTUV == 1\n#define vReflectivityRoughnessUV vMainUV1\n#elif REFLECTIVITYROUGHNESSDIRECTUV == 2\n#define vReflectivityRoughnessUV vMainUV2\n#else\nvarying vec2 vReflectivityRoughnessUV;\n#endif\nuniform sampler2D reflectivityRoughnessSampler;\n#endif\n#include<clipPlaneFragmentDeclaration>\n\n\n\n\n\n\nvec3 fresnelSchlickRoughness(float cosTheta,vec3 F0,float roughness){\nreturn F0+(max(vec3(1.0-roughness),F0)-F0)*pow(1.0-cosTheta,5.0);\n}\n\n\nvec3 toneMappingACES( vec3 color) {\nconst float A=2.51;\nconst float B=0.03;\nconst float C=2.43;\nconst float D=0.59;\nconst float E=0.14;\nreturn (color*(A*color+B))/(color*(C*color+D)+E);\n}\nvoid main(void) {\n#include<clipPlaneFragment>\n\nvec3 viewDirectionW=normalize(vEyePosition.xyz-vPositionW);\n\n\n#ifdef NORMAL\nvec3 normalW=normalize(vNormalW)*-vEyePosition.w;\n#else\n\nvec3 normalW=normalize(cross(dFdx(vPositionW),dFdy(vPositionW)))*-vEyePosition.w;\n#endif\n\n\nvec3 surfaceAlbedo=vDiffuseColor.rgb;\nfloat alpha=vDiffuseColor.a;\n#ifdef DIFFUSE\nvec4 baseDiffuseTexture=texture2D(diffuseSampler,vDiffuseUV);\n#ifdef ALPHATEST\nalpha*=baseDiffuseTexture.a;\n#endif\nsurfaceAlbedo*=toLinearSpace(baseDiffuseTexture.rgb);\nsurfaceAlbedo*=vDiffuseInfos.y;\n#endif\n\n\n#ifdef VERTEXCOLOR\nsurfaceAlbedo*=vColor.rgb;\n#ifdef VERTEXALPHA\nalpha*=vColor.a;\n#endif\n#endif\n\n\n#ifdef ALPHATEST\nif (alpha<=0.4)discard;\n#endif\n\n\nfloat NdotVUnclamped=dot( normalW,viewDirectionW ); \nfloat NdotV=max(NdotVUnclamped,0.0); \nfloat roughness=vReflectivity.a;\n#ifdef REFLECTIVITYROUGHNESS\nvec4 specularRoughness=texture2D(reflectivityRoughnessSampler,vReflectivityRoughnessUV);\nroughness*=1.0-specularRoughness.a;\nvec3 F0=specularRoughness.rgb;\n#else\nvec3 F0=vReflectivity.rgb;\n#endif\nvec3 F=fresnelSchlickRoughness( NdotV,F0,roughness);\n\n#ifdef RADIANCE\nvec3 radCoords=reflect(-1.*viewDirectionW,normalW);\n#ifdef USEPARALLAXCORRECTION\nvec3 localPos=vPositionW-vAABB[0].xyz;\nvec3 intersect1=(vAABB[2].xyz-localPos)/radCoords;\nvec3 intersect2=(vAABB[1].xyz-localPos)/radCoords;\nvec3 intersect=max(intersect1,intersect2);\nfloat dis=min(min(intersect.x,intersect.y),intersect.z);\n\nintersect=vPositionW+radCoords*dis;\nradCoords=intersect-vAABB[0].xyz;\n#endif\n#ifdef LODBASEDMICROSURFACE\n#ifdef USERADIANCELODROUGHNESS\nfloat radLod=log2(vLightProbeInfos.x*roughness*roughness);\n#else\nfloat radLod=0.0;\n#endif\n#ifdef USELODFALLOFF\nradLod+=vLodFallOffFactor*vLodFallOff.z;\n#endif\nvec3 radiance=sampleCubeLod(radSampler,radCoords,radLod).rgb;\n#else\nvec3 radiance=sampleCube(radSampler,radCoords ).rgb;\n#endif\nradiance*=vLightProbeInfos.y;\n#else\nvec3 radiance=vec3(0.0);\n#endif\n\n\n\n#ifdef IRRADIANCE\nvec3 irradiance=vec3(0.0);\n#ifdef LODBASEDMICROSURFACE\n#ifdef USELODFALLOFF\nfloat lmLOD=vLodFallOffFactor*vLodFallOff.w;\n#else\nfloat lmLOD=0.;\n#endif\n\n\n\n\nirradiance+=sampleCubeLod( iradSampler0,normalW,lmLOD).rgb*vDynamicRatios[0];\nirradiance+=sampleCubeLod( iradSampler1,normalW,lmLOD).rgb*vDynamicRatios[1];\nirradiance+=sampleCubeLod( iradSampler4,normalW,lmLOD).rgb*vDynamicRatios[4];\nirradiance+=sampleCubeLod( iradSampler5,normalW,lmLOD).rgb*vDynamicRatios[5];\nif( vDynamicRatios[2]>=0.) {\nirradiance+=sampleCubeLod( iradSampler2,normalW,lmLOD).rgb*vDynamicRatios[2];\nirradiance+=sampleCubeLod( iradSampler3,normalW,lmLOD).rgb*vDynamicRatios[3];\nirradiance+=sampleCubeLod( iradSampler6,normalW,lmLOD).rgb*vDynamicRatios[6];\nirradiance+=sampleCubeLod( iradSampler7,normalW,lmLOD).rgb*vDynamicRatios[7];\n}\n#else\nirradiance+=sampleCube( iradSampler0,normalW).rgb*vDynamicRatios[0];\nirradiance+=sampleCube( iradSampler1,normalW).rgb*vDynamicRatios[1];\nirradiance+=sampleCube( iradSampler4,normalW).rgb*vDynamicRatios[4];\nirradiance+=sampleCube( iradSampler5,normalW).rgb*vDynamicRatios[5];\nif( vDynamicRatios[2]>=0. ) {\nirradiance+=sampleCube( iradSampler2,normalW).rgb*vDynamicRatios[2];\nirradiance+=sampleCube( iradSampler3,normalW).rgb*vDynamicRatios[3];\nirradiance+=sampleCube( iradSampler6,normalW).rgb*vDynamicRatios[6];\nirradiance+=sampleCube( iradSampler7,normalW).rgb*vDynamicRatios[7];\n}\n#endif\nirradiance=mix( vec3(1.0),irradiance,vLightProbeInfos.z);\n#else\n\nvec3 irradiance=vec3(0.6);\n#endif\n\n\nvec3 brdf=vec3(0.0);\n#ifdef ENVIRONMENTBRDF\nvec2 envBRDF=texture2D( environmentBrdfSampler,vec2(NdotV,roughness) ).xy;\nbrdf=F*envBRDF.x+envBRDF.y;\n#endif\n\n\n#ifdef AO\n#if AODIRECTUV == 10\nfloat ao=textureCube(aoSampler,normalW).r;\n#else\nfloat ao=toLinearSpace( texture2D(aoSampler,vAoUV).rgb).r;\n#endif\n#ifdef DYAO\nao=mix(1.0,ao,vAoInfos.y*vDynamicRatios[8] );\n\n#else\nao=mix(1.0,ao,vAoInfos.y );\n#endif\nbrdf*=environmentRadianceOcclusion(ao,NdotVUnclamped);\n#else\nfloat ao=1.0;\n#endif\n\n\nvec3 diffuse=surfaceAlbedo*irradiance*(1.0-F)*ao;\nvec3 specular=brdf*radiance*ao;\nvec3 final=diffuse+specular;\n\n#if TONEMAPPINGMODE == 3\nfinal=toneMappingACES( final );\n#elif TONEMAPPINGMODE == 2\nconst float tonemappingCalibration=1.590579;\nfinal=1.0-exp2(-tonemappingCalibration*final);\n#elif TONEMAPPINGMODE == 1\nfinal=final/(final+vec3(1.0));\n#endif\n\nfinal=toGammaSpace( final );\ngl_FragColor=vec4( final,alpha );\n\n}\n'),
    (s.Effect.IncludesShadersStore.pcolDyIBLFragmentDeclaration =
      'uniform vec4 vDiffuseColor;\n\n#ifdef DIFFUSE\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef AO\nuniform vec2 vAoInfos;\n#endif\n#ifdef REFLECTIVITYROUGHNESS\nuniform vec2 vReflectivityRoughnessInfos;\n#endif\n#ifdef USELODFALLOFF\nuniform vec4 vLodFallOff;\n#endif\nuniform vec4 vLightProbeInfos;\nuniform vec4 vReflectivity;\n#ifdef USEPARALLAXCORRECTION\nuniform mat3 vAABB;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif\n'),
    (s.Effect.IncludesShadersStore.pcolDyIBLUboDeclaration =
      'layout(std140,column_major) uniform;\nuniform Material {\nvec4 vDiffuseColor;\nvec2 vDiffuseInfos;\nmat4 diffuseMatrix;\nvec2 vAoInfos;\nmat4 aoMatrix;\nvec2 vReflectivityRoughnessInfos;\nmat4 reflectivityRoughnessMatrix;\nvec4 vLodFallOff;\nvec4 vLightProbeInfos;\nvec4 vReflectivity;\nmat4 vAABB;\nfloat pointSize;\n};\nuniform Scene {\nmat4 viewProjection;\nmat4 view;\n};\n'),
    (s.Effect.IncludesShadersStore.pcolDyIBLVertexDeclaration =
      '\nuniform mat4 viewProjection;\nuniform mat4 view;\n#ifdef DIFFUSE\nuniform mat4 diffuseMatrix;\nuniform vec2 vDiffuseInfos;\n#endif\n#ifdef AO\nuniform mat4 aoMatrix;\nuniform vec2 vAoInfos;\n#endif\n#ifdef REFLECTIVITYROUGHNESS\nuniform mat4 reflectivityRoughnessMatrix;\nuniform vec2 vReflectivityRoughnessInfos; \n#endif\n#ifdef USELODFALLOFF\nuniform vec4 vLodFallOff;\n#endif\n#ifdef POINTSIZE\nuniform float pointSize;\n#endif'));
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
  !(function (t) {
    var e = (function (t) {
        function e() {
          var e = t.call(this) || this;
          return (
            (e.MAINUV1 = !1),
            (e.MAINUV2 = !1),
            (e.DIFFUSE = !1),
            (e.DIFFUSEDIRECTUV = 0),
            (e.AO = !1),
            (e.AODIRECTUV = 0),
            (e.DYAO = !1),
            (e.REFLECTIVITYROUGHNESS = !1),
            (e.REFLECTIVITYROUGHNESSDIRECTUV = 0),
            (e.TONEMAPPINGMODE = 0),
            (e.RADIANCE = !1),
            (e.IRRADIANCE = !1),
            (e.USEPARALLAXCORRECTION = !1),
            (e.USELODFALLOFF = !1),
            (e.USERADIANCELODROUGHNESS = !1),
            (e.LODBASEDMICROSURFACE = !1),
            (e.ENVIRONMENTBRDF = !1),
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
        function s(e, s, n) {
          void 0 === n && (n = null);
          var r = i.call(this, e, s) || this;
          return (
            (r._environmentBRDFTexture = null),
            (r._diffuseColor = new t.Color3(1, 1, 1)),
            (r._lastBindedLPGroupId = -1),
            (r._lightProbeManager = null),
            (r._reflectivityColor = new t.Color3(0.04, 0.04, 0.04)),
            (r._roughness = 0),
            (r.radianceLevel = 1),
            (r.irradianceLevel = 1),
            (r._toneMappingMode = 1),
            (r.useRadianceLodRoughness = !1),
            (r.lodFallOffFactor = { near: 0, farSubNear: 0, radMax: 0, iradMax: 0 }),
            (r._lightProbeManager = n),
            (r._environmentBRDFTexture = t.TextureTools.GetEnvironmentBRDFTexture(s)),
            r
          );
        }
        return (
          r(s, i),
          (s.prototype.setLodFallOff = function (t, e, i, s) {
            ((this.lodFallOffFactor.near = t),
              (this.lodFallOffFactor.farSubNear = e - t),
              (this.lodFallOffFactor.radMax = i),
              (this.lodFallOffFactor.iradMax = s));
          }),
          (s.prototype.getClassName = function () {
            return 'PcolDyIBLMaterial';
          }),
          (s.prototype.needAlphaBlending = function () {
            return !1;
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
            var o = this._lightProbeManager,
              l = r.getEngine();
            if (((a._needNormals = !0), a._areTexturesDirty)) {
              if (((a._needUVs = !1), (a.MAINUV1 = !1), (a.MAINUV2 = !1), r.texturesEnabled)) {
                if (o) {
                  if (!o.isReady()) return !1;
                  (o.radianceMap
                    ? ((a.RADIANCE = !0),
                      (a.USERADIANCELODROUGHNESS = this.useRadianceLodRoughness))
                    : ((a.RADIANCE = !1), (a.USERADIANCELODROUGHNESS = !1)),
                    (a.IRRADIANCE = o.hasGroup()),
                    (a.USEPARALLAXCORRECTION = !!o.aabb),
                    (a.USELODFALLOFF = this.lodFallOffFactor.farSubNear > 0));
                } else
                  ((a.RADIANCE = !1),
                    (a.USERADIANCELODROUGHNESS = !1),
                    (a.IRRADIANCE = !1),
                    (a.USEPARALLAXCORRECTION = !1),
                    (a.USELODFALLOFF = !1));
                if (
                  (r.getEngine().getCaps().textureLOD && (a.LODBASEDMICROSURFACE = !0),
                  this._diffuseTexture)
                ) {
                  if (!this._diffuseTexture.isReadyOrNotBlocking()) return !1;
                  t.MaterialHelper.PrepareDefinesForMergedUV(this._diffuseTexture, a, 'DIFFUSE');
                } else a.DIFFUSE = !1;
                if (this._aoTexture) {
                  if (!this._aoTexture.isReadyOrNotBlocking()) return !1;
                  ((a.AO = !0),
                    this._aoTexture.isCube
                      ? (a.AODIRECTUV = 10)
                      : t.MaterialHelper.PrepareDefinesForMergedUV(this._aoTexture, a, 'AO'),
                    (a.DYAO = !!(o && o.aabb && o.aabb.useDyao)));
                } else ((a.AO = !1), (a.AODIRECTUV = 0), (a.DYAO = !1));
                if (this._reflectivityRoughnessTexture) {
                  if (!this._reflectivityRoughnessTexture.isReadyOrNotBlocking()) return !1;
                  t.MaterialHelper.PrepareDefinesForMergedUV(
                    this._reflectivityRoughnessTexture,
                    a,
                    'REFLECTIVITYROUGHNESS',
                  );
                } else a.REFLECTIVITYROUGHNESS = !1;
                if (this._environmentBRDFTexture) {
                  if (!this._environmentBRDFTexture.isReady()) return !1;
                  a.ENVIRONMENTBRDF = !0;
                } else a.ENVIRONMENTBRDF = !1;
              } else
                ((a.LODBASEDMICROSURFACE = !1),
                  (a.DIFFUSE = !1),
                  (a.AO = !1),
                  (a.DYAO = !1),
                  (a.REFLECTIVITYROUGHNESS = !1),
                  (a.RADIANCE = !1),
                  (a.USERADIANCELODROUGHNESS = !1),
                  (a.IRRADIANCE = !1),
                  (a.USEPARALLAXCORRECTION = !1),
                  (a.USELODFALLOFF = !1),
                  (a.ENVIRONMENTBRDF = !1));
              a.TONEMAPPINGMODE = this._toneMappingMode;
            }
            if (
              (a._areMiscDirty && (a.POINTSIZE = this.pointsCloud || r.forcePointsCloud),
              t.MaterialHelper.PrepareDefinesForAttributes(i, a, !0, !1, !1) &&
                i &&
                (l.getCaps().standardDerivatives ||
                  i.isVerticesDataPresent(t.VertexBuffer.NormalKind) ||
                  i.createNormals(!0)),
              t.MaterialHelper.PrepareDefinesForFrameBoundValues(r, l, a, !!n),
              a.isDirty)
            ) {
              (a.markAsProcessed(), r.resetCachedMaterial());
              var h = new t.EffectFallbacks(),
                c = [t.VertexBuffer.PositionKind];
              (a.NORMAL && c.push(t.VertexBuffer.NormalKind),
                a.UV1 && c.push(t.VertexBuffer.UVKind),
                a.UV2 && c.push(t.VertexBuffer.UV2Kind),
                a.VERTEXCOLOR && c.push(t.VertexBuffer.ColorKind),
                t.MaterialHelper.PrepareAttributesForInstances(c, a));
              for (
                var d = [
                    { name: 'vDiffuseColor', len: 4 },
                    { name: 'vDiffuseInfos', len: 2 },
                    { name: 'diffuseMatrix', len: 16 },
                    { name: 'vAoInfos', len: 2 },
                    { name: 'aoMatrix', len: 16 },
                    { name: 'vReflectivityRoughnessInfos', len: 2 },
                    { name: 'reflectivityRoughnessMatrix', len: 16 },
                    { name: 'vLodFallOff', len: 4 },
                    { name: 'vLightProbeInfos', len: 4 },
                    { name: 'vReflectivity', len: 4 },
                    { name: 'vAABB', len: 16 },
                    { name: 'pointSize', len: 1 },
                  ],
                  u = [
                    'world',
                    'view',
                    'viewProjection',
                    'vEyePosition',
                    'vFogInfos',
                    'vFogColor',
                    'vClipPlane',
                    'vDynamicRatios',
                  ],
                  _ = [
                    'diffuseSampler',
                    'aoSampler',
                    'radSampler',
                    'iradSampler0',
                    'iradSampler1',
                    'iradSampler2',
                    'iradSampler3',
                    'iradSampler4',
                    'iradSampler5',
                    'iradSampler6',
                    'iradSampler7',
                    'reflectivityRoughnessSampler',
                    'environmentBrdfSampler',
                  ],
                  p = 0,
                  f = d.length;
                p !== f;
                ++p
              )
                u.push(d[p].name);
              var g = ['Material', 'Scene'];
              (t.MaterialHelper.PrepareUniformsAndSamplersList({
                uniformsNames: u,
                uniformBuffersNames: g,
                samplers: _,
                defines: a,
              }),
                s.setEffect(
                  r.getEngine().createEffect(
                    'pcolDyIBL',
                    {
                      attributes: c,
                      uniformsNames: u,
                      uniformBuffersNames: g,
                      samplers: _,
                      defines: a.toString(),
                      fallbacks: h,
                      onCompiled: this.onCompiled,
                      onError: this.onError,
                    },
                    l,
                  ),
                  a,
                ),
                this.buildUniformLayout(d),
                o && o.watchMesh(i));
            }
            return (
              !(!s.effect || !s.effect.isReady()) &&
              ((a._renderId = r.getRenderId()), (this._wasPreviouslyReady = !0), !0)
            );
          }),
          (s.prototype.buildUniformLayout = function (t) {
            for (var e = 0, i = t.length; e !== i; ++e)
              this._uniformBuffer.addUniform(t[e].name, t[e].len);
            this._uniformBuffer.create();
          }),
          (s.prototype.bindForSubMesh = function (e, i, s) {
            var n = this.getScene();
            if (s._materialDefines) {
              var r = s.effect;
              if (r) {
                ((this._activeEffect = r), this.bindOnlyWorldMatrix(e));
                var a = this._mustRebind(n, r, i.visibility),
                  o = this._lightProbeManager;
                if (a) {
                  (this._uniformBuffer.bindToEffect(r, 'Material'),
                    this.bindViewProjection(r),
                    (this._uniformBuffer.useUbo && this.isFrozen && this._uniformBuffer.isSync) ||
                      (n.texturesEnabled &&
                        (this._diffuseTexture &&
                          (this._uniformBuffer.updateFloat2(
                            'vDiffuseInfos',
                            this._diffuseTexture.coordinatesIndex,
                            this._diffuseTexture.level,
                          ),
                          t.MaterialHelper.BindTextureMatrix(
                            this._diffuseTexture,
                            this._uniformBuffer,
                            'diffuse',
                          )),
                        this._aoTexture &&
                          (this._uniformBuffer.updateFloat2(
                            'vAoInfos',
                            this._aoTexture.coordinatesIndex,
                            this._aoTexture.level,
                          ),
                          this._aoTexture.isCube ||
                            t.MaterialHelper.BindTextureMatrix(
                              this._aoTexture,
                              this._uniformBuffer,
                              'ao',
                            )),
                        this._reflectivityRoughnessTexture &&
                          (this._uniformBuffer.updateFloat2(
                            'vReflectivityRoughnessInfos',
                            this._reflectivityRoughnessTexture.coordinatesIndex,
                            this._reflectivityRoughnessTexture.level,
                          ),
                          t.MaterialHelper.BindTextureMatrix(
                            this._reflectivityRoughnessTexture,
                            this._uniformBuffer,
                            'reflectivityRoughness',
                          )),
                        this._uniformBuffer.updateFloat4(
                          'vReflectivity',
                          this._reflectivityColor.r,
                          this._reflectivityColor.g,
                          this._reflectivityColor.b,
                          this._roughness,
                        ),
                        o &&
                          (o.radianceMap
                            ? this._uniformBuffer.updateFloat4(
                                'vLightProbeInfos',
                                o.radianceMap.getSize().width,
                                o.radianceLevel * this.radianceLevel,
                                o.irradianceLevel * this.irradianceLevel,
                                0,
                              )
                            : this._uniformBuffer.updateFloat4(
                                'vLightProbeInfos',
                                0,
                                o.radianceLevel * this.radianceLevel,
                                o.irradianceLevel * this.irradianceLevel,
                                0,
                              ),
                          o.aabb && this._uniformBuffer.updateMatrix3x3('vAABB', o.aabb.array))),
                      this.lodFallOffFactor.farSubNear > 0 &&
                        this._uniformBuffer.updateFloat4(
                          'vLodFallOff',
                          this.lodFallOffFactor.near,
                          this.lodFallOffFactor.farSubNear,
                          this.lodFallOffFactor.radMax,
                          this.lodFallOffFactor.iradMax,
                        ),
                      this.pointsCloud &&
                        this._uniformBuffer.updateFloat('pointSize', this.pointSize),
                      this._uniformBuffer.updateColor4(
                        'vDiffuseColor',
                        this._diffuseColor,
                        this.alpha * i.visibility,
                      )),
                    n.texturesEnabled &&
                      (this._diffuseTexture &&
                        t.StandardMaterial.DiffuseTextureEnabled &&
                        r.setTexture('diffuseSampler', this._diffuseTexture),
                      this._aoTexture && r.setTexture('aoSampler', this._aoTexture),
                      this._reflectivityRoughnessTexture &&
                        r.setTexture(
                          'reflectivityRoughnessSampler',
                          this._reflectivityRoughnessTexture,
                        ),
                      o && o.radianceMap && r.setTexture('radSampler', o.radianceMap),
                      this._environmentBRDFTexture &&
                        r.setTexture('environmentBrdfSampler', this._environmentBRDFTexture)),
                    t.MaterialHelper.BindClipPlane(r, n));
                  var l = n._forcedViewPosition
                      ? n._forcedViewPosition
                      : n._mirroredCameraPosition
                        ? n._mirroredCameraPosition
                        : n.activeCamera.globalPosition,
                    h = n.useRightHandedSystem === (null != n._mirroredCameraPosition);
                  r.setFloat4('vEyePosition', l.x, l.y, l.z, h ? -1 : 1);
                }
                if (o) {
                  var c = o.getIBLData(i.uniqueId),
                    d = o.hasGroup(),
                    u = d || (o.aabb && o.aabb.useDyao);
                  if (
                    (c.isDirty && o.updateDynamicRatios(i, c),
                    d && (a || c.groupId !== this._lastBindedLPGroupId))
                  ) {
                    this._lastBindedLPGroupId = c.groupId;
                    var _ = o.getGroup(c.groupId).probes;
                    (r.setTexture('iradSampler0', _[0].texture),
                      r.setTexture('iradSampler1', _[1].texture),
                      r.setTexture('iradSampler4', _[4].texture),
                      r.setTexture('iradSampler5', _[5].texture),
                      r.setTexture('iradSampler2', _[2].texture),
                      r.setTexture('iradSampler3', _[3].texture),
                      r.setTexture('iradSampler6', _[6].texture),
                      r.setTexture('iradSampler7', _[7].texture));
                  }
                  u && r.setArray('vDynamicRatios', c.dynamicRatios);
                }
                (this._uniformBuffer.update(), this._afterBind(i, this._activeEffect));
              }
            }
          }),
          (s.prototype.getAnimatables = function () {
            var t = [];
            return (
              this._diffuseTexture &&
                this._diffuseTexture.animations &&
                this._diffuseTexture.animations.length > 0 &&
                t.push(this._diffuseTexture),
              this._aoTexture &&
                this._aoTexture.animations &&
                this._aoTexture.animations.length > 0 &&
                t.push(this._aoTexture),
              this._reflectivityRoughnessTexture &&
                this._reflectivityRoughnessTexture.animations &&
                this._reflectivityRoughnessTexture.animations.length > 0 &&
                t.push(this._reflectivityRoughnessTexture),
              t
            );
          }),
          (s.prototype.getActiveTextures = function () {
            var t = i.prototype.getActiveTextures.call(this);
            return (
              this._diffuseTexture && t.push(this._diffuseTexture),
              this._aoTexture && t.push(this._aoTexture),
              this._reflectivityRoughnessTexture && t.push(this._reflectivityRoughnessTexture),
              t
            );
          }),
          (s.prototype.hasTexture = function (t) {
            return (
              !!i.prototype.hasTexture.call(this, t) ||
              this._diffuseTexture === t ||
              this._aoTexture === t ||
              this._reflectivityRoughnessTexture === t
            );
          }),
          (s.prototype.dispose = function (t, e) {
            (e &&
              (this._diffuseTexture && this._diffuseTexture.dispose(),
              this._aoTexture && this._aoTexture.dispose(),
              this._reflectivityRoughnessTexture && this._reflectivityRoughnessTexture.dispose(),
              this._environmentBRDFTexture &&
                this.getScene()._environmentBRDFTexture !== this._environmentBRDFTexture &&
                this._environmentBRDFTexture.dispose()),
              (this._lightProbeManager = null),
              i.prototype.dispose.call(this, t, e));
          }),
          (s.prototype.clone = function (t) {
            throw new Error('PcolDyIBLMaterial no clone implemented');
          }),
          a([t.serializeAsTexture('diffuseTexture')], s.prototype, '_diffuseTexture', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'diffuseTexture',
            void 0,
          ),
          a([t.serializeAsTexture('aoTexture')], s.prototype, '_aoTexture', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'aoTexture',
            void 0,
          ),
          a(
            [t.serializeAsTexture('reflectivityRoughnessTexture')],
            s.prototype,
            '_reflectivityRoughnessTexture',
            void 0,
          ),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'reflectivityRoughnessTexture',
            void 0,
          ),
          a([t.serializeAsColor3('diffuseColor')], s.prototype, '_diffuseColor', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'diffuseColor',
            void 0,
          ),
          a([t.serializeAsColor3('reflectivity')], s.prototype, '_reflectivityColor', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'reflectivityColor',
            void 0,
          ),
          a([t.serialize('roughness')], s.prototype, '_roughness', void 0),
          a(
            [t.expandToProperty('_markAllSubMeshesAsTexturesDirty')],
            s.prototype,
            'roughness',
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
    t.PcolDyIBLMaterial = i;
  })(s || (s = {}));
  r =
    (this && this.__extends) ||
    (function () {
      var t =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, e) {
            t.__proto__ = e;
          }) ||
        function (t, e) {
          for (var i in e) e.hasOwnProperty(i) && (t[i] = e[i]);
        };
      return function (e, i) {
        function s() {
          this.constructor = e;
        }
        (t(e, i),
          (e.prototype = null === i ? Object.create(i) : ((s.prototype = i.prototype), new s())));
      };
    })();
  (!(function (t) {
    var e = (function (e) {
      function i(i, s, n, r) {
        void 0 === r && (r = 0);
        var a = e.call(this, i) || this;
        return (
          (a.coordinatesMode = t.Texture.CUBIC_MODE),
          (a.isGC = !1),
          (a.hasAlpha = !1),
          (a.isCube = !0),
          (a.gammaSpace = !1),
          (a.lodGenerationScale = 1),
          (a.name = s),
          (a.url = n),
          (a.dataIndex = r),
          a.__initInternalTexture(),
          a
        );
      }
      return (
        r(i, e),
        (i.prototype.__initInternalTexture = function () {
          var e = this.getScene();
          if (e) {
            var i = t.PcolCubeMapDataManager.getInstance().getData(e, this.url, this.dataIndex);
            if (i) {
              var s = e.getEngine();
              ((this._texture = s.createRawCubeTexture(
                i.getFaceArray(),
                i.fsize,
                t.Engine.TEXTUREFORMAT_RGB,
                s.getCaps().textureFloat
                  ? t.Engine.TEXTURETYPE_FLOAT
                  : t.Engine.TEXTURETYPE_UNSIGNED_INT,
                !0,
                !1,
                t.Texture.TRILINEAR_SAMPLINGMODE,
              )),
                (this._texture.isReady = !0));
            }
          }
        }),
        (i.prototype.isReady = function () {
          return (this._texture || this.__initInternalTexture(), e.prototype.isReady.call(this));
        }),
        (i.prototype.clone = function () {
          throw new Error('PcolHdrCubeTexture no clone implemented');
        }),
        (i.prototype.dispose = function () {
          this.isGC || ((this.isGC = !0), e.prototype.dispose.call(this));
        }),
        i
      );
    })(t.BaseTexture);
    t.PcolHdrCubeTexture = e;
  })(s || (s = {})),
    (function (t) {
      var e = (function () {
        function t(t) {
          ((this._faceDatas = []), (this.fsize = t));
          for (var e = 0; e < 6; ++e) this._faceDatas[e] = new Float32Array(t * t * 3);
        }
        return (
          (t.prototype.getFaceData = function (t) {
            return this._faceDatas[t];
          }),
          (t.prototype.getFaceArray = function () {
            return this._faceDatas;
          }),
          t
        );
      })();
      t.PcolCubeMapData = e;
      var i = (function () {
        function i() {
          if (((this._cachedDatas = {}), (this._pendingDatas = {}), i._sharedInstance))
            throw new Error('PcolCubeMapDataManager should be singleton');
        }
        return (
          (i.tmpCanvas = function () {
            return (
              i._tmpCanvas || (i._tmpCanvas = document.createElement('canvas')),
              i._tmpCanvas
            );
          }),
          (i.getInstance = function () {
            return (i._sharedInstance || (i._sharedInstance = new i()), i._sharedInstance);
          }),
          (i.prototype.getData = function (t, e, i, s) {
            (void 0 === i && (i = 0), void 0 === s && (s = !1));
            var n = this._cachedDatas[e];
            return n
              ? ((i >= n.length || i < 0) && (i = 0), n[i])
              : (s || this._pendingDatas[e] || this.__loadAndCache(t, e), null);
          }),
          (i.prototype.getDataLen = function (t) {
            var e = this._cachedDatas[t];
            return e ? e.length : 0;
          }),
          (i.prototype.clear = function () {
            ((this._cachedDatas = {}), (this._pendingDatas = {}));
          }),
          (i.prototype.__loadAndCache = function (e, i) {
            this._pendingDatas[i] = !0;
            var s = this;
            /\.hdr$/.test(i)
              ? t.Tools.LoadFile(
                  i,
                  function (t) {
                    s._pendingDatas[i] && s.__parseAndCacheHdrData(t, i);
                  },
                  void 0,
                  e.database,
                  !0,
                  void 0,
                )
              : t.Tools.LoadImage(
                  i,
                  function (t) {
                    s._pendingDatas[i] && s.__parseAndCacheLdrData(t, i);
                  },
                  function (t, e) {
                    if (t) throw new Error(t);
                    if (e) throw e;
                  },
                  e.database,
                );
          }),
          (i.prototype.__parseAndSaveCubeMapDatas = function (t, i, s, n, r, a, o) {
            var l = n / 6,
              h = s / l;
            if (h < 1 || h !== Math.floor(h) || l !== Math.floor(l))
              throw new Error('data size error: ' + t);
            for (var c = [], d = 0, u = h; d < u; ++d) {
              for (var _ = new e(l), p = 0; p < 6; ++p)
                for (var f = _.getFaceData(p), g = 0; g < l; ++g)
                  for (var m = g * l, y = (g + l * p) * s + d * l, v = 0; v < l; ++v) {
                    var b = m + v,
                      x = y + v;
                    ((f[3 * b] = Math.pow(i[r * x] / a, o)),
                      (f[3 * b + 1] = Math.pow(i[r * x + 1] / a, o)),
                      (f[3 * b + 2] = Math.pow(i[r * x + 2] / a, o)));
                  }
              c[d] = _;
            }
            ((this._cachedDatas[t] = c), (this._pendingDatas[t] = !1));
          }),
          (i.prototype.__parseAndCacheHdrData = function (e, i) {
            var s = new Uint8Array(e),
              n = t.HDRTools.RGBE_ReadHeader(s),
              r = t.HDRTools.RGBE_ReadPixels(s, n);
            this.__parseAndSaveCubeMapDatas(i, r, n.width, n.height, 3, 1, 1);
          }),
          (i.prototype.__parseAndCacheLdrData = function (t, e) {
            var s = t.width,
              n = t.height,
              r = i.tmpCanvas();
            ((r.width = s), (r.height = n));
            var a = r.getContext('2d');
            if (!a) throw new Error('No canvas2D support');
            (a.clearRect(0, 0, s, n),
              a.drawImage(t, 0, 0),
              this.__parseAndSaveCubeMapDatas(
                e,
                a.getImageData(0, 0, s, n).data,
                s,
                n,
                4,
                255,
                2.2,
              ));
          }),
          i
        );
      })();
      t.PcolCubeMapDataManager = i;
    })(s || (s = {})));
  r =
    (this && this.__extends) ||
    (function () {
      var t =
        Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array &&
          function (t, e) {
            t.__proto__ = e;
          }) ||
        function (t, e) {
          for (var i in e) e.hasOwnProperty(i) && (t[i] = e[i]);
        };
      return function (e, i) {
        function s() {
          this.constructor = e;
        }
        (t(e, i),
          (e.prototype = null === i ? Object.create(i) : ((s.prototype = i.prototype), new s())));
      };
    })();
  (!(function (t) {
    var e = (function (t) {
      function e(e, i, s, n) {
        void 0 === n && (n = null);
        var r = t.call(this, e, i, s) || this;
        return ((r.texture = n), r);
      }
      return (
        r(e, t),
        (e.prototype.dispose = function () {
          this.texture && (this.texture.dispose(), (this.texture = null));
        }),
        e
      );
    })(t.Vector3);
    t.PcolLightProbe = e;
  })(s || (s = {})),
    (function (t) {
      var e = (function () {
        function e(i, s) {
          if (
            ((this.left = null),
            (this.right = null),
            (this.front = null),
            (this.back = null),
            (this.size = new t.Vector3(0, 0, 0)),
            (this.id = i),
            (this.probes = s),
            this.size.copyFromFloats(s[1].x - s[0].x, s[3].y - s[0].y, s[4].z - s[0].z),
            !e.validate(this))
          )
            throw (
              console.error('Invalid cube: id ' + i),
              this.log(),
              new Error('Invalid cube: id ' + i)
            );
        }
        return (
          (e.prototype.release = function () {
            ((this.probes.length = 0),
              (this.left = null),
              (this.right = null),
              (this.front = null),
              (this.back = null));
          }),
          (e.prototype.log = function (t) {
            void 0 === t && (t = null);
            var e,
              i,
              s = '',
              n = this.probes;
            if (n) {
              if (t)
                for (e = 0, i = t.length; e !== i; ++e) {
                  var r = t[e];
                  s += r + ': ' + n[r].x + '|' + n[r].y + '|' + n[r].z + '\n';
                }
              else
                for (e = 0, i = n.length; e !== i; ++e)
                  s += e + ': ' + n[e].x + '|' + n[e].y + '|' + n[e].z + '\n';
              console.log(
                s + '\nsize: {' + this.size.x + ',' + this.size.y + ',' + this.size.z + '}',
              );
            } else console.log('NO probes...');
          }),
          (e.validate = function (t) {
            var e = t.probes,
              i = 1e-6,
              s = t.size;
            return (
              !!e &&
              !(
                s.x < i ||
                Math.abs(e[2].x - e[3].x - s.x) > i ||
                Math.abs(e[6].x - e[7].x - s.x) > i ||
                Math.abs(e[5].x - e[4].x - s.x) > i
              ) &&
              !(
                s.y < i ||
                Math.abs(e[2].y - e[1].y - s.y) > i ||
                Math.abs(e[6].y - e[5].y - s.y) > i ||
                Math.abs(e[7].y - e[4].y - s.y) > i
              ) &&
              !(
                s.z < i ||
                Math.abs(e[5].z - e[1].z - s.z) > i ||
                Math.abs(e[6].z - e[2].z - s.z) > i ||
                Math.abs(e[7].z - e[3].z - s.z) > i
              )
            );
          }),
          e
        );
      })();
      t.PcolLightProbeGroupCube = e;
    })(s || (s = {})),
    (function (t) {
      var e = (function () {
        return function (t, e, i) {
          ((this.array = new Float32Array(9)),
            (this.useDyao = !1),
            (this.aoCenter = 1),
            (this.aoOffset = 0),
            (this.aoRangeY = 0),
            (this.aoRangeXZSq = 0));
          var s = this.array;
          ((s[0] = t[0]),
            (s[1] = t[1]),
            (s[2] = t[2]),
            (s[3] = e[0] - t[0]),
            (s[4] = e[1] - t[1]),
            (s[5] = e[2] - t[2]),
            (s[6] = i[0] - t[0]),
            (s[7] = i[1] - t[1]),
            (s[8] = i[2] - t[2]),
            (this.aoRangeY = s[7]));
          var n = 0.5 * (i[0] - e[0]),
            r = 0.5 * (i[2] - e[2]);
          this.aoRangeXZSq = n * n + r * r;
        };
      })();
      t.PcolLightProbeAABB = e;
      var i = (function () {
        function i(i, s, n, r) {
          var a = this;
          ((this._isReady = !1),
            (this.radianceLevel = 1),
            (this.radianceMap = null),
            (this.irradianceLevel = 1),
            (this._probes = []),
            (this._groups = []),
            (this._cachedIBLDatas = Object.create(null)),
            (this.aabb = null),
            (this._id = r.id),
            (this._onMeshTransformDirty = function (t) {
              a.getIBLData(t.uniqueId).isDirty = !0;
            }),
            (this._onMeshDisposed = function (t) {
              a.deleteIBLData(t.uniqueId);
            }),
            s && s.length
              ? (this.radianceMap = new t.PcolHdrCubeTexture(i, this._id + '-r', s))
              : (this.radianceMap = null),
            r.aabbPosition && r.aabbSizeMin && r.aabbSizeMax
              ? ((this.aabb = new e(r.aabbPosition, r.aabbSizeMin, r.aabbSizeMax)),
                r.aabbAO &&
                  ((this.aabb.aoCenter = r.aabbAO[0]),
                  (this.aabb.aoOffset = r.aabbAO[1] - r.aabbAO[0]),
                  (this.aabb.aoRangeY = r.aabbAO[2]),
                  (this.aabb.useDyao = !0)))
              : (this.aabb = null));
          var o,
            l = r.lpx,
            h = r.lpy,
            c = r.lpz;
          if (l && 0 !== l.length && h && c && 0 !== c.length && n && 0 !== n.length) {
            if (2 !== h.length) throw new Error('Invalid config: Length of py not 2');
            for (var d = this._probes, u = this._groups, _ = 0, p = h.length; _ !== p; ++_)
              for (var f = n[_], g = 0, m = 0, y = c.length; m !== y; ++m)
                for (var v = 0, b = l.length; v !== b; ++v)
                  ((o = new t.PcolHdrCubeTexture(i, this._id + '-i' + g, f, g++)),
                    d.push(new t.PcolLightProbe(l[v], h[_], c[m], o)));
            for (
              var x,
                S,
                C,
                I,
                T,
                A = l.length - 1,
                E = c.length - 1,
                w = l.length * c.length,
                R = A * E,
                k = 0,
                P = R;
              k !== P;
              ++k
            )
              ((I = (C = (S = (x = k + Math.floor(k / A)) + 1) + A) + 1),
                (T = new t.PcolLightProbeGroupCube(k, [
                  d[x],
                  d[S],
                  d[S + w],
                  d[x + w],
                  d[C],
                  d[I],
                  d[I + w],
                  d[C + w],
                ])),
                u.push(T));
            for (k = 0, P = R; k !== P; ++k)
              (((T = u[k]).right = k - A >= 0 ? u[k - A] : null),
                (T.front = k % A < A - 1 ? u[k + 1] : null),
                (T.left = k + A < R ? u[k + A] : null),
                (T.back = k % A > 0 ? u[k - 1] : null));
          } else ((this._probes.length = 0), (this._groups.length = 0));
        }
        return (
          Object.defineProperty(i.prototype, 'id', {
            get: function () {
              return this._id;
            },
            enumerable: !0,
            configurable: !0,
          }),
          (i.prototype.hasGroup = function () {
            return this._groups.length > 0;
          }),
          (i.prototype.getGroup = function (t) {
            return this._groups[t];
          }),
          (i.prototype.isReady = function () {
            if (!this._isReady) {
              if (this.radianceMap && !this.radianceMap.isReadyOrNotBlocking()) return !1;
              for (var t = this._probes, e = 0, i = t.length; e !== i; ++e) {
                var s = t[e].texture;
                if (s && !s.isReadyOrNotBlocking()) return !1;
              }
              this._isReady = !0;
            }
            return this._isReady;
          }),
          (i.prototype.dispose = function () {
            this._isReady = !1;
            for (var t = 0, e = this._groups.length; t !== e; ++t) this._groups[t].release();
            for (t = 0, e = this._probes.length; t !== e; ++t) this._probes[t].dispose();
            ((this._groups.length = 0),
              (this._probes.length = 0),
              this.radianceMap && (this.radianceMap.dispose(), (this.radianceMap = null)),
              (this._cachedIBLDatas = Object.create(null)));
          }),
          (i.prototype.watchMesh = function (t) {
            this.getIBLData(t.uniqueId, !0) ||
              (this.getIBLData(t.uniqueId),
              t.registerAfterWorldMatrixUpdate(this._onMeshTransformDirty),
              (t.onDispose = this._onMeshDisposed));
          }),
          (i.prototype.getIBLData = function (e, i) {
            void 0 === i && (i = !1);
            var s = e + '',
              n = this._cachedIBLDatas[s];
            return (n || i || ((n = new t.PcolIBLMeshData()), (this._cachedIBLDatas[s] = n)), n);
          }),
          (i.prototype.deleteIBLData = function (t) {
            var e = t + '';
            this._cachedIBLDatas[e] && delete this._cachedIBLDatas[e];
          }),
          (i.prototype.updateDynamicRatios = function (t, e) {
            e.isDirty = !1;
            var i,
              s,
              n = e.dynamicRatios,
              r = t.position,
              a = 0;
            if (this._groups.length > 0) {
              var o,
                l,
                h,
                c = 1e-5,
                d = -1 !== e.groupId ? this._groups[e.groupId] : this._groups[0];
              if (((i = r.x - d.probes[0].x), (s = r.z - d.probes[0].z), i < -c))
                for (; d.back && ((d = d.back), !((i = r.x - d.probes[0].x) >= -c)); );
              else for (; i > d.size.x + c && d.front; ) ((d = d.front), (i = r.x - d.probes[0].x));
              if (s < -c) for (; d.right && ((d = d.right), !((s = r.z - d.probes[0].z) >= -c)); );
              else for (; s > d.size.z + c && d.left; ) ((d = d.left), (s = r.z - d.probes[0].z));
              ((e.groupId = d.id),
                (i /= d.size.x),
                (a = (r.y - d.probes[0].y) / d.size.y),
                (s /= d.size.z),
                i < c ? (i = 0) : i > 1 - c && (i = 1),
                a < c ? (a = 0) : a > 1 - c && (a = 1),
                s < c ? (s = 0) : s > 1 - c && (s = 1),
                (o = 1 - i),
                (l = 1 - a),
                (h = 1 - s),
                (n[0] = o * l * h),
                (n[1] = i * l * h),
                (n[4] = o * l * s),
                (n[5] = i * l * s),
                a > c
                  ? ((n[2] = i * a * h), (n[3] = o * a * h), (n[6] = i * a * s), (n[7] = o * a * s))
                  : (n[2] = -1));
            }
            var u = this.aabb;
            if (u && u.useDyao) {
              var _ = void 0;
              (a = Math.max(0, r.y - u.array[1])) < u.aoRangeY
                ? ((n[8] = 1 - a / u.aoRangeY),
                  (_ = (i = r.x - u.array[0]) * i + (s = r.z - u.array[2]) * s),
                  (n[8] *= u.aoCenter + u.aoOffset * Math.min(1, _ / u.aoRangeXZSq)))
                : (n[8] = 0);
            } else n[8] = 1;
          }),
          i
        );
      })();
      t.PcolLightProbeManager = i;
    })(s || (s = {})),
    (function (t) {
      var e = (function () {
        return function () {
          ((this.groupId = -1),
            (this.dynamicRatios = new Float32Array(9)),
            (this.isDirty = !1),
            (this.isDirty = !0));
        };
      })();
      t.PcolIBLMeshData = e;
    })(s || (s = {})));
}
