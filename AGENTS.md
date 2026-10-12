# 工程维护约定

本项目维护具名游戏源码，保留 PCOL 的物理、规则与渲染行为。独立冻结基准仅用于完整性检查与行为对照，实际运行与构建内容全部位于 src/。用户的明确要求优先于本文件。

## 目录与代码

- 维护运行代码写入 src/；工程命令入口放 scripts/，可复用逻辑放 tooling/。src/start.mjs 是用户要求的 src 独立启动入口，仅使用 Node 内置模块。测试按 unit/integration/e2e 分类，JSON 验证记录放 reports/。
- 自有代码采用 kebab-case 文件名、ES 模块、严格相等、const 优先和显式花括号。依赖边界、lint 和格式由根部配置执行。
- domain/ 不依赖界面、应用编排或 I/O；shared/ 不依赖 DOM 或网络。界面、输入、相机归 presentation/，控制器、AI、回放归 application/，本地资源请求归 infrastructure/。
- 模块 ID 使用具名路径，在 src/runtime/runtime-catalog.json 登记入口、来源、分包和实际依赖。资产按用途命名；模型、碰撞贴图、CSS 和着色器引用必须通过构建检查。
- 室内方案文件使用 interior-design-original 或三位编号前缀，公共资源按用途命名。文件命名规则与标准文件、冻结基准例外见 docs/development/file-naming.md；整体检查包含 check-file-naming。
- 迁移内核的旧式运算仅允许出现在 runtime-catalog.json 的 preservedSources 文件白名单；新代码不自动继承例外。浏览器诊断入口 browser.js 是显式保留的 classic-script 边界。
- 不向源码目录混入生成产物，不创建无实际实现的核心空目录。artifacts 仅保留 testing；工程工具和文档只维护当前 src 与冻结基准所需内容。
- src/ 不保留已被替代且无调用的原版 UI、样式或资产；当前界面仍使用的基础行为按用途维护，历史对照只保存在独立基准中。
- 启动页、室内选择和 About 沿用当前布局；游戏内以冻结 PCOL 的紧凑布局和操作流程为参照，统一当前前端视觉，不额外扩展界面层级。用户后续明确要求优先。

## 修改边界

- baselines/pcol/game/ 与 baselines/pcol/manifests/baseline.json 是本地冻结基准，不覆盖、格式化或自动升级。冻结目录迁移只调整父目录与工程引用，内部文件名、字节和哈希不变。新版本另存并记录允许差异与行为证据。
- build/development/、dist/ 是生成目录。兼容代码写入 src/compatibility/，工程构建写入 tooling/build/，再重新构建。
- src/third-party/ 仅放运行依赖适配文件和已有署名，不混入业务代码，不自动格式化。源码启动通过 src/compatibility/legacy-factory.js 保留第三方 UMD 的非严格模式语义；构建版继续使用 classic-script 工厂。构建不得复制冻结基准的 HTML、JS、CSS 或资源，也不得在构建时执行迁移替换。
- 当前基准已包含本地启动和纯文字署名，构建不再执行来源导入、网页本地化或作者链接替换补丁。
- config/project.config.mjs 只管理工程路径和服务器设置，不改写原版物理、相机、材质默认参数。
- 不全局替换 Date.now、RAF、输入或 WebGL API 来改变游戏行为。
- 不恢复已删除的原站快照、仓库镜像、来源下载工具及来源报告，除非用户明确要求。

## 验证

- 修改工程工具后运行 node scripts/check-project.mjs。
- 修改实际运行代码、资源或构建规则后再运行 node scripts/check-project.mjs --browser；新增行为增加对应专项验证。
- 自动格式化仅使用 node scripts/format-code.mjs --write 的文件白名单，不对工程根目录递归执行写入式格式化。
- 整体检查包含 check-maintenance：维护模块、资产、文档链接及命令入口必须有效。Git 提交分类见 docs/development/repository-workflow.md；冻结目录、src/third-party 与 src/assets 保持原始字节，逐帧测量与截图为本地生成产物。

详细工作流程见 docs/development/workflow.md，学习入口见 docs/learning/guide.md。
