# 游戏装配与状态归属

`application/compose-game.js`按原顺序调用职责明确的子装配，最终连接菜单、游戏对话框、MatchController及SnookerApplication。类的原实现继续位于domain、application和presentation对应目录；子装配负责创建类型族、提供有限依赖，以及拥有原来共享的状态。

以下子装配均已接入运行图。基础UI与球杆有独立装配入口，球杆缓存、材质及模型管理器契约见[球杆装配](cue-composition.md)。

## 模块与扩展位置

下表文件均位于`src/`，composition相对于`application/composition/`。

| 批次             | 装配文件                                    | 定义与状态                                                                                                       |
| ---------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 动画、显示、场景 | compose-animation、compose-motion-animation | 每个类型族共用动画事件；`presentation/animation/easing.js`保留曲线表达式和Back参数的receiver语义                 |
| 同上             | compose-display-planes、compose-game-view   | 显示平面类型、排序、图集与GameView事件；`presentation/rendering/table-ui-atlas.js`拥有原UV缓存                   |
| 同上             | compose-scenes                              | 场景与贴图注册、延迟CushionBody实例；`presentation/scenes/create-table-scene.js`保留场景参数、贴图和材质创建顺序 |
| 设置、AI、对局   | compose-session                             | 一份LocalUser、默认及活动设置、模型/控制器类型、事件与递增编号                                                   |
| 同上             | compose-route-geometry、compose-ai          | 几何类型和交点工作数组、路线池、规划器与AI模型；`application/ai/ai-registry.js`保留三档配置与共享规划器          |
| 同上             | compose-match-model                         | SnookerGameModel类型及跨模型的开球轮换计数                                                                       |
| 输入、相机、回放 | compose-controls、compose-ball-in-hand      | 控制组/工具栏事件，按类型族共享的放球向量；各实例的按键及放球状态保持独立                                        |
| 同上             | compose-orbit-camera、compose-aim-camera    | 轨道/站姿/朝向类型、共享直线与交点池、瞄准参数与标记；`presentation/camera/orbit-point-cache.js`维护交点池       |
| 同上             | compose-cue-input                           | PlayerControl、球杆变换、接触和移动类型；`presentation/input/cue-contact-state.js`维护原接触运算及临时对象       |
| 同上             | compose-person、compose-player-turn         | 人物类型、脏标记/事件，以及击球参数、StrokeMotion和PlayerTurnControl                                             |
| 同上             | compose-replay                              | 回放面板、轨道、缓冲、电影片段、相机和控制器类型；共享解析工作区与实例缓冲保持原边界                             |

设置的实现位于`application/settings/local-game-settings.js`，仍按原方式克隆布局、合并用户设置及恢复默认值。新增设置优先修改该文件及设置专项；新增AI档位从注册文件进入；相机、回放和输入功能沿用对应类型模块与子装配，不在总根继续累积局部实现。

## 创建顺序与生命周期

总根每次执行只调用每个子装配一次。其返回类型共同引用本次调用内的状态；构造类实例不会重建另一份设置、编号、规划器、路线池或开球计数。创建另一套根装配会产生独立状态。编号随同一类型族的控制器创建递增，释放控制器不重置编号；两人开球轮换由对局类型族共同维护，单人重开仍按原方式推进计数。

根向子装配传递具名getter。getter用于后定义类型、活动设置、模块与模板，读取发生在原执行位置。它们不是任意查询服务的全局context：每个工厂只接收实际用到的依赖。动效、显示、人物和回放的跨组类型通过返回对象连接。

UI颜色、引擎构造器捕获、URL方案选择、材质注册副作用及最终对话框/控制器连接留在根。CushionBody的碰撞相关运算按保留边界留在根内，领域提取需独立算法刻画。AI及接触运算的部分短变量是类型族内部工作区，不作为公共接口导出。

## 运行与构建边界

runtime-catalog仍登记115个装载模块。新增子工厂通过默认ES模块导入进入构建图，不额外增加loadModule ID。根保留实际loadModule表达式，模块查找通过具名getter在原位置触发；源码原生ES模块与开发/生产编译图使用同一实现。

所有新文件遵守严格lint及文件命名规则，没有扩大保留源码例外。物理、裁判、求解顺序、AI系数、时钟、随机数、模型及纹理维持现有契约；相机和击球节奏的当前扩展见[操作流畅性](../validation/gameplay-motion.md)。冻结基准不改写。

## 验证

三组测试先在拆分前声明上运行，再对根的实际依赖getter与真实编译工厂运行同组断言。长期夹具要求根只调用一次，校验实际导入路径，并执行该工厂的完整导入图：

- [显示与场景](../../tests/unit/game-display-composition.test.mjs)：4项，覆盖曲线、动画完成、场景顺序和图集缓存身份。
- [设置与对局](../../tests/unit/game-session-composition.test.mjs)：7项，覆盖本地启动身份、克隆/合并/恢复、编号、AI共用规划器、路线池及开球轮换。
- [输入与回放](../../tests/unit/game-interaction-composition.test.mjs)：8项，覆盖按键释放、相机缓存、母球放置、球杆、人物、击球及回放解析。

另对18组搬移声明及整个组合根展开工厂与依赖getter，比较表达式、运算符、对象键和执行顺序，规范化声明种类、同一语句中的声明分组及新增单语句花括号，不调整初始化顺序。这补充137项保留算法对照，不代替行为测试。

每批执行整体Chrome/Edge浏览器检查、src独立复制、原始方案同浏览器五视角精确对照及室内五套专项。后两批追加默认连续玩法；最终执行WebGL恢复烟雾专项。当前输入、构建与测试证据见[验证记录](../../reports/validation/game-composition.json)。有限连续玩法不覆盖完整比赛、所有随机AI分支或数小时运行；软件WebGL不用于证明真实GPU性能。
