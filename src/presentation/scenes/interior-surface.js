/** Room-only surface response; the original renderer and game materials keep their shaders. */
export default function configureInteriorSurface(B, shaderName, material, height = 3.6) {
  if (!B.Effect.ShadersStore[shaderName + 'PixelShader']) {
    B.Effect.IncludesShadersStore[shaderName + 'Lights'] =
      B.Effect.IncludesShadersStore.lightsFragmentFunctions.replace(
        'cosAngle=max(0.,pow(cosAngle,lightData.w));',
        'cosAngle=pow(cosAngle,lightData.w)*smoothstep(lightDirection.w,min(1.,lightDirection.w+0.18),cosAngle);',
      );
    B.Effect.ShadersStore[shaderName + 'VertexShader'] = B.Effect.ShadersStore.defaultVertexShader;
    B.Effect.ShadersStore[shaderName + 'PixelShader'] = B.Effect.ShadersStore.defaultPixelShader
      .replace('#if defined(BUMP) || !defined(NORMAL)', '#if 1')
      .replace(
        '#define RECIPROCAL_PI2',
        '#ifdef WEBGL2\nprecision highp sampler2DShadow;\n#endif\nuniform vec4 interiorSurface;\nuniform vec4 interiorRoom;\n#define RECIPROCAL_PI2',
      )
      .replace(
        '#include<lightFragment>[0..maxSimultaneousLights]',
        `#include<lightFragment>[0..maxSimultaneousLights]
        float wallDistance=min(min(abs(vPositionW.x+6.0854),abs(vPositionW.x-6.9146)),min(abs(vPositionW.z+4.),abs(vPositionW.z-8.)));
        float cove=exp(-pow((interiorRoom.x-vPositionW.y-0.12)/0.68,2.))*exp(-wallDistance*2.5);
        float vertical=1.-abs(normalW.y);
        // Analytic indirect fill from the perimeter coves, scoped to the decorative room.
        diffuseBase+=vec3(1.,0.79,0.54)*(vertical*(interiorRoom.y+cove*interiorRoom.z)+max(-normalW.y,0.)*exp(-wallDistance)*interiorRoom.w);`,
      )
      .replace('#include<lightsFragmentFunctions>', '#include<' + shaderName + 'Lights>')
      .replace(
        '#define CUSTOM_FRAGMENT_UPDATE_DIFFUSE',
        `#ifdef DIFFUSE
        float surfaceLuma=dot(baseColor.rgb,vec3(0.2126,0.7152,0.0722));
        baseColor.rgb=mix(vec3(surfaceLuma),baseColor.rgb,interiorSurface.z);
        baseColor.rgb=mix(vec3(0.5),baseColor.rgb,interiorSurface.y);
        if(interiorSurface.x>0.) {
          vec2 stepUV=vec2(interiorSurface.w,0.);
          float dx=dot(texture2D(diffuseSampler,vDiffuseUV+stepUV).rgb-texture2D(diffuseSampler,vDiffuseUV-stepUV).rgb,vec3(0.2126,0.7152,0.0722));
          float dy=dot(texture2D(diffuseSampler,vDiffuseUV+stepUV.yx).rgb-texture2D(diffuseSampler,vDiffuseUV-stepUV.yx).rgb,vec3(0.2126,0.7152,0.0722));
          vec3 dp1=dFdx(vPositionW),dp2=dFdy(vPositionW);
          vec2 duv1=dFdx(vDiffuseUV),duv2=dFdy(vDiffuseUV);
          vec3 tangent=dp1*duv2.y-dp2*duv1.y;
          vec3 bitangent=dp2*duv1.x-dp1*duv2.x;
          float invScale=inversesqrt(max(max(dot(tangent,tangent),dot(bitangent,bitangent)),0.00000001));
          normalW=normalize(normalW-(tangent*dx+bitangent*dy)*invScale*interiorSurface.x);
        }
        #endif`,
      )
      .replace(
        'color.rgb*=lightmapColor;',
        'color.rgb*=mix(vec3(1.),lightmapColor,1.-smoothstep(0.035,0.12,vPositionW.y));',
      );
  }
  material.metadata = { ...material.metadata, interiorSurface: [0, 1, 1, 1 / 1254] };
  material.metadata.interiorRoom = [height, 0.09, 0.26, 0.045];
  material.customShaderNameResolve = (_name, uniforms) => {
    uniforms.push('interiorSurface');
    uniforms.push('interiorRoom');
    return shaderName;
  };
  material.onBindObservable.add(() => {
    material.getEffect().setFloat4('interiorSurface', ...material.metadata.interiorSurface);
    material.getEffect().setFloat4('interiorRoom', ...material.metadata.interiorRoom);
  });
}
