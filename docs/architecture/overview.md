# 当前工程架构

游戏由具名维护源码构建，冻结的 PCOL 本地版只承担独立回归对照。开发与生产输出全部从 src 生成，冻结程序不作为构建来源。

## 目录与依赖

| 层                     | 职责                                                       | 依赖约束                       |
| ---------------------- | ---------------------------------------------------------- | ------------------------------ |
| `src/domain/`          | 数学、几何、刚体、碰撞、模拟、裁判、布局                   | 仅 domain 与无界面 shared 工具 |
| `src/shared/`          | 事件、数据处理、指标采集                                   | 不依赖 DOM、网络或应用层       |
| `src/application/`     | 启动、组合根、控制器、模型、AI、回放、游戏时钟             | 编排领域、界面与基础设施       |
| `src/presentation/`    | 相机、输入、渲染、动画、界面、HTML 模板、CSS               | 不被领域层反向引用             |
| `src/infrastructure/`  | 本地请求、资产队列、碰撞网格加载                           | 隔离浏览器 I/O                 |
| `src/adapters/`        | PCOL 渲染材质及全局对象适配                                | 隔离引擎集成                   |
| `src/runtime/`         | 模块清单、源码入口、具名装载、缓存和分包生命周期           | 不包含游戏算法                 |
| `src/assets/`          | 语义命名的模型、纹理、环境图、字体、图标、碰撞数据和着色器 | 只包含实际资产                 |
| `src/third-party/`     | 保留版本的渲染引擎与浏览器探测依赖                         | 与维护业务源码隔离             |
| `tooling/`、`scripts/` | 可复用工程实现、命令入口                                   | 不进入浏览器程序               |

`baselines/pcol/game/` 保存完整冻结对照，`baselines/pcol/manifests/` 保存哈希清单；默认 src 服务不加载该目录。构建服务仍使用 `/baseline/` 访问冻结程序，目录改名不会改变访问地址。

指标采集不再导入 DOM 图表；组合根注入指标查看器工厂。shared 数据工具不再混入未使用的网络请求方法。本地资源读取统一归 infrastructure。

## 游戏模块

`src/runtime/runtime-catalog.json` 登记 115 个具名模块：73 个工厂模块、34 个资产路径模块、8 个 HTML 模板模块。资产路径和 HTML 模板在构建版生成轻量导出，在源码版由装载器生成内存导出，不维护重复的包装文件。

室内设计通过 `presentation/scenes/interior-design-registry` 按编号选择；`interior-design-001` 保存完整房间的结构、配色和灯光，与物理场景 ID 分离。新增设计采用新编号，已保存方案继续可选，说明见 [室内设计001](../development/interior-design-001.md)。

默认房间与 `?interior=interior-design-original` 使用具名“室内设计·原始”。`interior-design-original-config` 保存PCOL精确材质初始化参数，`interior-design-original` 按原顺序应用；原模型和烘焙贴图保持不变，并通过冻结基准的几何、材质与同浏览器五视角像素对照。详见 [原始方案](../development/interior-design-original.md)。

001（暖木俱乐部）、002（琥珀复古会所）与003（暖砂钴蓝艺廊）按用户要求原位更新。002与003共享 `interior-design-builder` 的装饰几何和合并逻辑；三套方案共用世界尺度UV、软包圆角、带窗门洞的墙体、安装构件、暖色照明和独立家具投影组。两张室内软阴影图首次完整生成后缓存，窗口变化或WebGL恢复时刷新，保留既有分辨率与投影外观；见 [室内性能验证](../validation/interior-performance.md)。支脚与座垫的接触尺寸在合并前记录并验证。比较、预览与素材说明见 [室内设计系列](../development/interior-design-collection.md)。

游戏类型按职责放置于对应目录。`src/application/compose-game.js` 是组合根，负责按契约顺序创建依赖并导出 `SnookerApplication`；类名称及领域导出名称支持可读的栈与诊断。

启动页室内选择通过具名扩展类接入现有菜单与UI管理器，保留原菜单类算法和既有索引。registry统一管理展示信息；application负责选择与转换编排，presentation负责面板、装饰缓存与恢复界面，infrastructure负责网址和一次性会话存储。选择不同方案在当前场景独占启用对应装饰与灯光，复用引擎、球台和球；每套室内只准备一次，成功后同步网址。首次访问等待资源与阴影就绪，再次切回复用缓存。详见 [启动页室内选择](../development/interior-selection.md)。

| 维护入口                                          | 内容                             |
| ------------------------------------------------- | -------------------------------- |
| `src/domain/physics/world.js`                     | 固定步长、连续碰撞检测、接触岛   |
| `src/domain/physics/physics-constants.js`         | 重力、摩擦、回弹与精度           |
| `src/domain/simulation/simulator.js`              | 首次接触、入袋、球复位和模拟结果 |
| `src/domain/rules/snooker-referee.js`             | 斯诺克计分、犯规、球权与复位     |
| `src/application/ai/ai-route-planner.js`          | 原有 AI 路线搜索                 |
| `src/application/replay/`                         | 轨道、记录缓冲、电影片段         |
| `src/presentation/input/`                         | 键鼠状态、人物与球杆控制         |
| `src/presentation/camera/`                        | 站姿、瞄准、轨道、回放相机       |
| `src/application/controllers/match-controller.js` | 对局生命周期和 UI 协调           |
| `src/application/snooker-application.js`          | 引擎、视图、菜单与对局调度       |

物理数值、求解顺序、裁判和全局时钟保持基准行为。当前相机时间、操作节奏与高密度缓冲的允许差异见[操作流畅性](../validation/gameplay-motion.md)，WebGL 修复由兼容层负责。对共享可变状态使用显式 getter/setter 依赖，例如轮换开球者和球杆加载状态，避免将活动状态变成初始值快照。

为保留原初始化副作用与循环依赖，内核暂采用 ES 模块导出的工厂 ABI：`module`、`exports`、`loadModule`。依赖已经具名，类的依赖已经显式化；它不是从原作者仓库恢复的源码。部分算法内部仍保留短变量、函数作用域 `var` 和既有类型转换，其精确文件白名单在 `preservedSources`。新文件默认使用严格规则，例外不能扩散为目录级放行。

基础UI、球杆，以及动画/显示/场景、设置/AI/对局状态、输入/相机/回放装配均已拆分并完成验收。各子装配拥有对应类型族及共享状态，根按原顺序调用一次，通过有限getter连接活动依赖；定义、图集、设置与相机缓存进入职责目录。新增子工厂由ESM导入图登记，115个loadModule ID保持不变。详见[游戏装配](game-composition.md)及[球杆装配](cue-composition.md)。引擎构造器捕获、网址方案选择、材质注册、AI模板、游戏对话框扩展及控制器最终连接仍由总根负责；CushionBody保留原碰撞相关运算。维护契约见[组合根边界](composition-root-assessment.md)。

碰撞加载器将解析、碰撞体创建和贴图处理异常转为缓存错误，保证每个请求只完成一次并推进队列。球杆缓存的计数统一使用\_nCachedFiles，源网格标识统一使用manifest.model及meshName；读取完成的模型响应计入文件数，网络请求失败不计入。对应行为由加载器、球杆缓存和UI装配单元测试及浏览器回归覆盖。

WebGL恢复兼容层接入旧引擎的纹理重建及场景事件，修正HDR纹理遗漏、采样元数据、冻结PBR光照绑定和动态贴图绑定缓存。组合根负责安装，场景销毁释放监听；兼容ES模块经导入图编译，browser.js继续原样交付。具体边界与专项见[完整恢复](../validation/context-restoration.md)。

## 界面样式、字体与测试复用

`presentation/styles/game.css`有序导入基础、字体、室内公共变量及菜单/面板/加载三个组件样式。基础规则保留原游戏顺序，室内扩展限定作用域；职责和修改约定见 [样式组织](../development/styles.md)。

`presentation/typography/page-fonts`是bootstrap具名服务，启动与加载/恢复视图复用字体就绪Promise。字号与字重的唯一维护说明见 [页面字体](../development/typography.md)，不在各专题重复数值。

`tests/helpers/runtime-fixture.mjs`复用浏览器、源码/开发/生产服务器、测试响应检查和页面等待；`stylesheet-fixture.mjs`按级联顺序展开CSS导入。辅助代码只用于测试，不进入运行源码。室内统一专项入口为`node scripts/test-interior.mjs`，覆盖UI、字体/恢复及选择行为。

## 构建与资源

1. 完整校验冻结基准，确认行为对照未漂移。
2. 读取目录内当前源码、运行依赖与资产，形成一次输入快照。
3. 检查模块命名、唯一来源、实际词法依赖、依赖方向、ES 模块导入和未登记源码。
4. 编译受限 ES 模块工厂图，生成 `scripts/runtime-bootstrap.js`、`scripts/render-engine.js`、`scripts/snooker-game.js`。引擎和游戏保持按需加载，不产生数字 chunk 或 Webpack JSONP。
5. 交付 `styles/game.css`及导入样式、`assets/` 和诊断脚本；检查 HTML/CSS导入、模型纹理、碰撞贴图、资产路径和着色器成对引用。
6. 生成 schema 2 构建清单，包含源码 SHA-256、模块记录、引用图和逐文件输出 SHA-256。
7. 校验独立暂存目录后事务发布。失败恢复旧输出；Windows 短暂文件锁最多重试三次，永久失败继续显式报错。

全部维护代码、运行依赖和资源位于 src；HTML 启动入口与 CSS 相对引用按源码/交付目录派生。构建时不执行旧文件迁移、批量 URL 替换或原站补丁。资源二进制保持原有数据；模型和碰撞 JSON 只同步语义路径。重复 favicon 合并为单一资产。

装载器缓存模块实例，保留循环导出、导出 getter 和原工厂 receiver。失败初始化清理不完整缓存；分包并发请求去重，失败可以重试，脚本完成后清除事件、超时和标签。生产输出只暴露分包注册边界；测试检查句柄由 HTTP 测试响应插入，不进入交付文件。

`?wall-study=modern` 可启用一面现代俱乐部墙面的独立视觉试做。实现位于 presentation/scenes，普通页面保留当前场景，领域与物理不依赖试做模块。设计、资源与复现方式见 [墙面试做](../development/modern-wall-study.md)。

## 本地服务与验证

源码服务 `node src/start.mjs` 仅依赖 src 和 Node 内置模块；浏览器直接加载源码 ES 模块、资产与模板，修改后刷新即可。第三方 UMD 的非严格模式行为由单独兼容工厂保留，业务代码依旧使用原生 ES 模块。可只复制 src 独立运行；详见 [源码独立运行](../development/source-runtime.md)。

构建服务 `node scripts/dev-server.mjs` 绑定 `127.0.0.1`，`/` 与 `/pcol/` 指向开发输出，`/baseline/` 指向冻结对照。构建服务器不暴露源码，继续提供有界 GET 流和 HEAD 元数据服务。

日常检查执行目录、lint、双目标构建、完整性、格式与 unit/integration。运行代码变化再执行 Chrome/Edge 离线对照：渲染及相机参数、五组物理状态、计分犯规、真实操作、Replay、续杆和重开。AI 连续专项覆盖三档 AI、共享开球者轮换、模式切换和资源数量。

算法对照见 [结构验证方法](../validation/algorithm-validation.md)，命令与故障恢复见 [开发流程](../development/workflow.md)。

具名 loadModule 依赖与相对 ESM 导入统一执行分层边界。球台定义引用的碰撞 JSON、碰撞法线贴图及其他运行资产均在构建前校验；维护审计进一步检查入口可达性和没有引用的资产。源码启动使用具名本地身份字段，不包含外部登录或头像占位接口。Git 分类与资源字节保护见[仓库维护](../development/repository-workflow.md)。
