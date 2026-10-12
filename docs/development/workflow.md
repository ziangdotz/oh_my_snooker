# 本地开发工作流

## 环境与命令

推荐 Node.js 24，最低 22.13。源码运行只需 `node src/start.mjs`，无需安装工程依赖；整个 src 可独立复制，进入后运行 `node start.mjs`。构建、lint、格式与浏览器测试使用 package-lock.json 锁定的工程依赖，先运行 npm ci；dist 静态交付不依赖 Node 或开发工具。详见 [源码独立运行](source-runtime.md)。

| 任务                   | 直接命令                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| 源码启动               | node src/start.mjs                                                                           |
| 构建                   | node scripts/build.mjs                                                                       |
| 算法结构复核           | node scripts/verify-algorithms.mjs                                                           |
| 完整性校验             | node scripts/verify.mjs                                                                      |
| 目录检查               | node scripts/check-structure.mjs                                                             |
| 文件命名检查           | node scripts/check-file-naming.mjs                                                           |
| 维护与文档检查         | node scripts/check-maintenance.mjs                                                           |
| lint                   | node scripts/lint-code.mjs                                                                   |
| 格式检查               | node scripts/format-code.mjs --check                                                         |
| 白名单格式化           | node scripts/format-code.mjs --write                                                         |
| 单元与集成测试         | node scripts/test-project.mjs                                                                |
| 浏览器回归             | node tests/e2e/game.test.mjs                                                                 |
| 室内UI/字体/切换专项   | node scripts/test-interior.mjs                                                               |
| 三种抽屉动效专项       | node tests/e2e/drawer-motion.test.mjs                                                        |
| 旧界面清理专项         | node tests/e2e/retired-ui-cleanup.test.mjs                                                   |
| 游戏内UI专项           | node tests/e2e/game-ui.test.mjs                                                              |
| PCOL布局实际对照       | node tests/e2e/pcol-ui-layout.test.mjs                                                       |
| 矢量操作图及高密度显示 | node tests/e2e/ui-vector-artwork.test.mjs                                                    |
| 加载连续性专项         | node tests/e2e/interior-loading-continuity.test.mjs                                          |
| 仅复制src独立启动专项  | node tests/e2e/source-standalone.test.mjs                                                    |
| 原始场景精确对照       | node tests/e2e/interior-design-original.test.mjs                                             |
| AI / 连续运行专项      | node tests/e2e/continuous-play.test.mjs                                                      |
| 整体检查               | node scripts/check-project.mjs                                                               |
| 整体检查加浏览器       | node scripts/check-project.mjs --browser                                                     |
| 加载测量               | node scripts/measure-loading.mjs --label current --runs 5                                    |
| 室内硬件性能对照       | node scripts/measure-interior-performance.mjs --label current --browser chrome               |
| 室内测量统计摘要       | node scripts/summarize-measurement.mjs reports/measurement/interior-performance-current.json |
| 操作时间刻画           | node --test tests/unit/gameplay-motion.test.mjs                                              |
| 四场景操作硬件专项     | node tests/e2e/gameplay-motion.test.mjs                                                      |
| 静态阴影缓存专项       | node tests/e2e/interior-shadow-cache.test.mjs                                                |
| WebGL完整恢复专项      | node tests/e2e/context-restoration.test.mjs                                                  |

整体检查按目录、命名、lint、构建、完整性、维护与文档、格式、测试运行，失败即停止。Windows 浏览器回归默认检测 Chrome 与 Edge，其他系统使用 Playwright Chromium，可用 PCOL_BROWSER_PATH 指定浏览器。

## 按修改选择验证

| 修改范围                       | 必须执行                                                 | 相关专项                                          |
| ------------------------------ | -------------------------------------------------------- | ------------------------------------------------- |
| 仅文档                         | 格式检查、文件命名检查，核对本地链接及命令与实际源码一致 | 不重复浏览器回归                                  |
| 工程工具                       | node scripts/check-project.mjs                           | 按工具职责补集成或恢复检查                        |
| 运行代码、资源、兼容或构建规则 | node scripts/check-project.mjs --browser                 | 新行为及受影响专题专项                            |
| 室内界面、字体、导航           | 上述整体浏览器检查                                       | node scripts/test-interior.mjs                    |
| 装载、组合根、场景或引用组织   | 上述整体浏览器检查                                       | src独立复制启动、原始场景对照；室内相关加统一专项 |
| AI、回放、输入与共享对局状态   | 上述整体浏览器检查                                       | continuous-play专项及对应行为刻画                 |

浏览器专项使用有效的开发/生产构建；源码或构建规则改变后先完成构建和verify。室内统一入口校验现有构建，不自动构建，随后顺序运行interior-loading-continuity、interior-ui、interior-transition、interior-selection、startup-recovery，先检查加载交接与布局；五个套件使用同一个测试夹具实现，但各自拥有服务器生命周期。详见 [室内选择](interior-selection.md)。耗时专项不隐式加入每次整体检查。

自动格式化只执行`node scripts/format-code.mjs --write`的既有白名单，不对根目录递归写入，不格式化冻结、第三方或二进制资产。仅文档维护时核对运行文件与受保护文件哈希，避免格式整理夹带源码变化。

仅整理工程文件并保持src不写入时，使用`node scripts/format-code.mjs --write --engineering`；该选项排除src，仍按既有工程文件白名单执行。默认格式检查继续覆盖运行源码。

浏览器测试以真实状态变化等待启动和操作，Replay 对照录制数据；输出见 artifacts/testing/regression/report.json 和各浏览器的 `*-replay.json`。失败时优先查看报告中的 phase 与 diagnostics，再查看对应 `*-failure.json` 和截图。不要通过延长固定睡眠、改变游戏时钟或降低行为断言来处理失败。

AI / 连续运行专项独立运行，默认每个浏览器的基准与开发页面各完成 18 杆 Practice、三种 AI 难度的自主击球和反复重开/返回菜单。专项全程持有开发与生产构建锁，避免不同页面加载到不同版本；源代码仍须保持不变。它耗时较长，不加入每次整体检查；负载、资源观察与限制见 [专项说明](../validation/continuous-play.md)，记录位于 artifacts/testing/continuous-play/。

加载测量标签采用 kebab-case，重复次数为 1..20，默认 5；Windows 默认测 Chrome/Edge，可用 PCOL_BROWSER_PATH 指定其他浏览器。结果写入 reports/measurement/loading-LABEL.json，每轮用不同标签保留对照。测量要求现有开发输出通过完整校验，菜单与 Practice 就绪使用原游戏状态观察；不包含构建/Node 启动时间。方法与采用依据见 [资源交付实验](../validation/resource-delivery.md)。

## 启动校验与构建恢复

源码启动与 start.cmd 使用 src/start.mjs，绑定本机且不读取 src 以外的工程文件；修改后刷新页面。

构建服务 node scripts/dev-server.mjs（npm run dev:built）：先校验冻结对照、当前维护源码、模块依赖、资源引用、输出清单和逐文件大小/哈希。缺失输出、资源损坏、多余文件、清单无效或源码更新时自动重建开发版；输出仍有效时复用。启动后修改源码仍需重新构建或重启服务，当前不提供热更新。

冻结基准损坏、必需源码缺失、引用错误、越层依赖和未知 I/O 错误会停止启动，不使用旧输出掩盖输入错误。构建和 scripts/verify.mjs 共用同一套输入/输出校验，构建产生的暂存目录在发布前也要通过完整校验。

每个构建使用独立暂存目录，同目标构建由 .cache/development.lock 或 production.lock 互斥；目标繁忙时给出明确错误，不同时写入输出。发布先将旧输出保存到 .cache/development.previous 或 production.previous，发布失败即恢复；临时文件锁按 50/100/200 ms 有界重试，其他错误直接返回。恢复也失败时保留备份并打印位置，下次构建在目标缺失时先恢复备份。

如果进程被强制终止，锁可能残留。锁文件记录 pid，确认该构建进程已停止后才清理对应锁并重试。目标和 previous 备份同时存在时，工具保留两份并停止，需要核对后处理，避免自动丢弃可用版本。上述文件位于可生成的 .cache/，不是冻结基准。

异常测试使用 .cache/ 中的隔离资源集，覆盖首次启动、过期/损坏输出、输入失败、构建互斥、发布失败和恢复失败，不修改真实基准或真实输出。

## 修改入口

| 需求             | 编辑位置                                                                          |
| ---------------- | --------------------------------------------------------------------------------- |
| 领域、物理与规则 | src/domain/                                                                       |
| AI、回放与对局   | src/application/                                                                  |
| 界面、相机与输入 | src/presentation/                                                                 |
| 字体与室内样式   | src/presentation/typography/、styles/；见[字体](typography.md)、[样式](styles.md) |
| 模块与资产引用   | src/runtime/runtime-catalog.json、src/assets/                                     |
| 浏览器兼容与诊断 | src/compatibility/                                                                |
| 构建             | tooling/build/build-target.mjs；入口 scripts/build.mjs                            |
| 源码静态服务     | src/start.mjs                                                                     |
| 构建版静态服务   | tooling/server/static-server.mjs；入口 scripts/dev-server.mjs                     |
| 工程路径与端口   | config/project.config.mjs                                                         |
| 完整性与目录校验 | tooling/lib/                                                                      |
| 验证与学习说明   | tests/、docs/、reports/                                                           |

build/development/ 与 dist/ 可重新生成，不直接编辑。src/（含 third-party/）是全部实际构建输入。baselines/pcol/game/ 仅为冻结回归输入，缺失或漂移时对照检查停止，不下载或恢复来源快照。

新游戏内核版本先在独立位置建立行为验证，再接入构建。时间步长、摩擦、冲量、碰撞顺序、相机和材质变化均需专项证据。

当前工程采用本地检查入口，依赖安装使用 npm ci。首次建立 Git 仓库、提交分类及精确字节保护见[仓库维护](repository-workflow.md)。
