# 仅使用 src 运行游戏

`src/` 包含完整游戏源码、资产、模板、第三方依赖和模块清单。推荐 Node.js 24，最低 22.13；在工程根目录运行 `node src/start.mjs`，或者只复制 `src/`，进入复制后的目录运行 `node start.mjs`。无需安装 npm 工程依赖，不读取工程配置、冻结基准或构建输出。

默认地址为 http://127.0.0.1:5173/；端口占用时使用 `--port 8080`。需要支持 WebGL 的桌面浏览器。服务仅绑定本机，Ctrl+C 停止。修改源码后刷新页面；不提供自动热更新。HTML自带即时加载卡片，首次启动与切换场馆共享加载/恢复视图，初始化异常可RETRY或返回原始场馆。

## 目录与装载关系

- `index.html`：引用源码样式、浏览器诊断和 ES 模块启动入口。
- `runtime/source-entry.js`：读取同目录的模块清单，按原分包顺序装载模块；资产与模板在内存中生成导出，无需重复包装文件。
- `runtime/runtime-catalog.json`：登记全部运行模块、源路径、资产与具名依赖。`src/` 前缀表示源码根，不表示请求工程上层目录。
- `runtime/module-loader.js`：与构建版共用模块缓存、循环依赖、活动导出、并发去重与失败重试。
- `third-party/browser/`：保留版本的浏览器与 WebGL 探测工厂。
- `third-party/rendering/`：保留版本的 Babylon 渲染引擎工厂。
- `third-party/notices.txt`：保留已有作者归属文字。
- `compatibility/legacy-factory.js`：源码模式的第三方兼容边界，重新实例化已登记的第三方工厂，保留旧 UMD 包装中非严格模式的隐式全局 receiver。第三方文件本身字节不变；自有业务源码仍以原生 ES 模块执行。
- `start.mjs`：只依赖 Node 内置模块的本机 HTTP 服务，提供 GET/HEAD、正确 MIME、路径范围检查及禁止缓存。

源码模式在第三方边界使用 `Function`，需要允许动态函数编译；内置源码服务符合这一要求。部署到采用严格 CSP 的服务时，应使用工程构建生成的 `dist/`。构建版保持 classic-script 分包、原有 CSP 和校验流程，不包含源码启动入口或此兼容工厂。

## 工程维护与冻结基准

`src/third-party/` 保存运行依赖，`src/runtime/` 保存模块清单及装载器。`baselines/pcol/` 独立保存冻结 PCOL 对照，不参与源码启动。工程构建和完整性检查验证冻结基准，用于发现行为对照漂移；需要这些检查时保留完整工程并安装锁定依赖。

构建从同一份 `src/index.html` 派生交付入口，把源码入口与样式路径映射为交付路径，并重新计算 CSS 相对资源引用。没有复制冻结程序，也没有生成文件混入源码。

## 验证

`node tests/e2e/source-standalone.test.mjs` 将整个 `src/` 复制到隔离目录，确认该目录只含 `src/`，使用其 `start.mjs` 启动，然后在 Chrome/Edge 中逐一进入原始、001、002、003，打开室内选择菜单、点击当前方案返回，再进入 Practice。测试阻止外部请求，确认无 `baselines/` 或 `config/` 请求，并检查 HTTP 方法及越界路径。

PowerShell 中设置 `$env:PCOL_SOURCE_RUNTIME = '1'` 后运行 `node tests/e2e/game.test.mjs`，可将同一套物理、规则、真实输入、相机、回放和恢复断言应用到独立复制的源码。该测试仅将冻结程序作为独立对照页面；测试响应中的检查句柄不写入源码。测试完成后清除环境变量再检查构建版。

黑屏与启动恢复专项为 `node tests/e2e/startup-recovery.test.mjs`，覆盖延迟启动脚本、冷启动异常、模型加载失败、重试/返回及再次切换，源码/开发/生产三种入口均在Chrome/Edge验证；记录见 `reports/validation/startup-loading-recovery.json`。

测试输出位于 `artifacts/testing/source-runtime/standalone/` 与 `artifacts/testing/source-runtime/regression/`，对应本次实际运行版本。
