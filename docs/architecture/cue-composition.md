# 球杆定义、缓存与材质装配

第三批从compose-game中提取球杆定义、材质工厂及资源缓存，并将共享状态归入单次调用的球杆子装配。初始化顺序、默认参数、请求行为及保留的网格管理器算法不变。

## 依赖与拥有者

| 文件                                                                        | 职责与依赖                                                                                                                                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [compose-cues.js](../../src/application/composition/compose-cues.js)        | 接收Babylon、EventEmitter、已注册的材质/纹理构造器和三个资源路径；创建一份定义和文件缓存，拥有默认文件预取标记、克隆编号和CueEvents；只返回CueEvents和CueMeshManager |
| [cue-definitions.js](../../src/presentation/rendering/cue-definitions.js)   | 创建stickAlpha的模型/纹理清单、meshName、规格及材质工厂引用；规格值保持1.45、0.005、0.015                                                                            |
| [cue-material.js](../../src/presentation/rendering/cue-material.js)         | 捕获材质及纹理构造器；创建时从当前定义的this.manifest读取纹理路径，按原顺序设置参数、纹理、LOD衰减并冻结                                                             |
| [cue-asset-cache.js](../../src/infrastructure/assets/cue-asset-cache.js)    | 只依赖定义和loadFile回调，负责模型请求、解析及缓存；不导入Babylon，不创建场景对象                                                                                    |
| [cue-mesh-manager.js](../../src/presentation/rendering/cue-mesh-manager.js) | 保留原算法；每个实例拥有自己的网格、场景材质和就绪检查定时器，通过显式getter/setter访问子装配的共享状态                                                              |

总根保持dynamic-lighting-material注册入口；先取得CueMaterial和CueTexture构造器，再按model、glossy、color顺序读取资源模块，随后调用composeCues一次。GameView继续延迟读取同一CueEvents及CueMeshManager类型。新模块使用默认ES工厂导入，源码原生执行，构建通过现有工厂图编译；runtime-catalog的实际loadModule依赖不变，没有新增加载器ID或保留源码例外。

## 保持的行为

- 模型文件按URL去重；pending返回null，skipLoad不发请求，解析后的网格与specs按身份复用。name/id继续添加模型路径前缀；多个定义可以共享同一个文件。
- 请求最多四次，成功响应结束重试；请求耗尽和解析错误都保存在缓存中。nCachedFiles计数收到响应的文件，解析失败仍计数，请求耗尽不计数。同步响应下，首次缓存查询仍返回null；管理器的默认预取可以使同一次requireStick立即取得网格。
- 默认文件预取标记和克隆编号由一次子装配独占，多个管理器共享，卸载单个管理器不会重置。另一游戏装配创建独立状态，编号从零开始。
- 保留接口cueLoadCancelled的实际含义是“已发起默认文件预取”。cancelPendingCheck只取消当前管理器的就绪轮询，不中止共享文件请求，也不清空文件缓存。
- 网格和材质由管理器按场景持有；卸载后重新创建场景对象，但复用模型数据及规格。材质工厂仍从调用者定义读取当前manifest，并保持原冻结次数和贴图创建顺序。
- 材质保持radianceLevel=0.12、irradianceLevel=1、roughness=1、useRadianceLodRoughness=true、toneMappingMode=2及setLodFallOff(1.5,10,2,1.5)。未调整球杆形状、着色器、材质算法、相机、输入、物理或回放。

## 验证

[缓存行为](../../tests/unit/cue-asset-cache.test.mjs)和[装配行为](../../tests/unit/cue-composition.test.mjs)中的八项刻画先在拆分前的真实声明上通过，再改用新工厂执行相同断言；随后增加同步响应覆盖。[引擎集成](../../tests/integration/cue-runtime.test.mjs)使用实际Babylon 3.2类型、当前alpha-cue模型和编译后的子装配，核对顶点、索引、参数、类型、冻结状态、跨场景隔离、编号与缓存复用。NullEngine只验证数据和生命周期，不能证明最终画面或GPU性能。

每批执行整体浏览器检查、src独立复制启动、原始室内精确对照和统一室内专项；本批移动共享编号与预取状态，追加默认continuous-play专项验证Practice、AI三档及重复重开/返回。WebGL恢复另执行现有冒烟，验证子装配仍与兼容层配合。完整24场景恢复矩阵的上一批报告仍保留其原日期与范围，不作为本批重新执行的结果。

当前批次汇总记录写入reports/validation/cue-composition.json，并记录相关源码哈希；浏览器专项仍按自身规则保留当前结果与截图。137项保留算法结构对照不直接证明新缓存或组合根等价，应结合本页行为与浏览器验证阅读。
