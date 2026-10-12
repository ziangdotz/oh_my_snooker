# 文件与代码规范

## 目录与命名

运行源码属于 src，工程命令属于 scripts，工程实现属于 tooling，工程路径配置属于 config；运行模块清单位于 src/runtime。src/start.mjs 是 src 独立启动入口，仅依赖 Node 内置模块。src/third-party 是第三方运行适配边界；baselines/pcol/game 只用于冻结回归。生成目录不承载维护源码。

自有目录、文件和模块 ID 使用小写 kebab-case。Node 工程模块为 .mjs；浏览器工厂与类模块为 .js；模板为 .html；样式为 .css；测试为 \*.test.mjs。类使用 PascalCase，函数和局部变量使用 camelCase。

资产按用途放置，例如 assets/models/interior-design-original-room.babylon、assets/textures/table/frame-normal.png、assets/fonts/saira-extra-condensed-semibold.woff2。禁止以下载哈希、数字 chunk 或临时编号作为维护名。着色器使用 NAME.vertex.fx / NAME.fragment.fx。冻结基准的历史名称是对照契约，不能自动重命名。

src/runtime/runtime-catalog.json 是模块登记入口。新增工厂登记来源、分包、实际具名依赖；类模块使用显式默认导入接入组合根。模板、资产分别使用 template / asset 类型，避免重复维护包装代码。新增资源必须同步 HTML、CSS、模型、碰撞数据与代码引用。

全工程文件命名、室内方案标识、标准文件例外及冻结基准规则见 [文件命名](file-naming.md)。`npm run check:naming` 检查所有维护文件，已接入整体工程检查。

## 代码与边界

新代码采用 ES 模块、const 优先、严格相等、显式花括号和明确异常。两空格、单引号、分号与 LF 由 Prettier 白名单整理。禁止 eval、动态 Function 和用户绝对路径。

迁移算法的既有作用域、类型转换与运算顺序暂由 preservedSources 精确文件白名单保留；这些例外不适用于新文件。新增算法或调整既有运算需要独立行为证据，不用自动修复把类型转换改成严格比较。诊断 browser.js 是启动前的显式 classic-script 兼容边界。

领域层只依赖领域及无界面共享工具；shared 不依赖 DOM 或网络。浏览器代码不导入 Node 工具。tooling 不导入 scripts 或 tests。边界由 ESLint、构建引用图和专项测试共同检查。

保留循环依赖的模块通过具名 loadModule 加载。类工厂的依赖必须明确，只有真正共享可变值才配置 setter；不以隐式全局变量传递游戏状态。组合根管理初始化顺序，不把场景、物理参数塞入工程配置。

## 验证与维护

- npm run check 是日常门槛；运行代码、资源或构建变化执行 npm run check:browser，并执行相关专项。
- 构建清单记录源码、依赖、资产引用和输出哈希。缺失引用、未登记源码、路径冲突或越层依赖阻止发布。
- JSON 验证记录放 reports，人工说明放 docs，浏览器状态及截图放 artifacts。
- 格式化只使用 node scripts/format-code.mjs --write 的文件白名单。二进制资产、冻结基准和生成输出不被格式化。
- 依赖固定版本，同步 package.json 与 package-lock.json。开发和构建工具不进入浏览器交付。
- 验证结果必须对应当前源码及明确范围，不能自动代替后续修改的复测。
