# Oh My Snooker

可离线运行的3D斯诺克工程。全部运行源码、资产、模板与第三方依赖位于src；冻结PCOL仅用于完整性校验和行为对照。

当前功能包括 Practice、三档 AI 对战与四套室内。同机双人和联网房间尚未实现，开发顺序已明确为[先同机双人，再扩展联网房间](docs/development/rooms-and-two-player-plan.md)。

## 启动

推荐Node.js 24，最低22.13。执行 `node src/start.mjs`，打开http://127.0.0.1:5173/；也可双击start.cmd。无需安装工程依赖或先构建。复制整个src后，在其中运行node start.mjs即可；修改源码后刷新页面。

启动页提供Single Play、Practice、Interior Design及About。四套场馆为原始、001、002、003，可通过菜单或?interior=interior-design-001等参数选择。One more thing...为房间及双人对战预留面板，尚未实现这些功能。桌面浏览器需要支持WebGL；D区放母球、W瞄准、滚轮控制力度、Space击球。

## 工程目录

| 目录                                            | 职责                                     |
| ----------------------------------------------- | ---------------------------------------- |
| src/domain                                      | 数学、几何、物理、模拟、裁判             |
| src/application                                 | 启动、依赖装配、模型、控制器、AI、回放   |
| src/presentation                                | 输入、相机、渲染、场景、界面、样式与字体 |
| src/infrastructure、shared、adapters            | 本地I/O、共享工具与引擎适配              |
| src/runtime、assets、compatibility、third-party | 模块清单、资源、兼容边界与运行依赖       |
| baselines/pcol                                  | 冻结游戏及其SHA-256清单                  |
| config、scripts、tooling                        | 工程配置、命令及实现                     |
| tests、docs、reports                            | 当前验证、维护文档与结果                 |
| artifacts/testing                               | 当前浏览器截图、状态和诊断               |
| build/development、dist                         | 从src生成的开发与生产输出                |

## 维护命令

先执行npm ci。构建服务node scripts/dev-server.mjs提供当前交付及/baseline/冻结对照；与源码服务同时运行时使用不同端口。dist可通过HTTP静态交付。

| 命令                                        | 用途                               |
| ------------------------------------------- | ---------------------------------- |
| npm run dev / npm start                     | 从src启动                          |
| npm run dev:built                           | 校验并启动构建版                   |
| npm run build / npm run verify              | 构建及输入输出完整性               |
| npm run verify:algorithms                   | 137项算法结构对照                  |
| npm run lint / npm run format:check         | lint与格式检查                     |
| npm test                                    | 单元与集成测试                     |
| npm run check / npm run check:browser       | 整体检查及浏览器对照               |
| npm run check:maintenance                   | 模块、资产、文档、命令与锁文件审计 |
| npm run test:e2e:source                     | 仅复制src独立运行                  |
| npm run test:e2e:interior                   | 室内界面、字体、切换和恢复         |
| npm run test:e2e:continuous                 | AI、连续击球、回放及重开           |
| npm run test:e2e:shadows                    | 静态阴影缓存验证                   |
| npm run test:e2e:motion                     | 四室内真实硬件操作验证             |
| npm run test:e2e:context                    | 完整 WebGL 恢复验证                |
| npm run test:e2e:original                   | 原始场景精确对照                   |
| npm run measure:interior -- --label current | 实际GPU室内移动测量                |

维护以[架构](docs/architecture/overview.md)、[开发流程](docs/development/workflow.md)、[学习入口](docs/learning/guide.md)及[当前交接](docs/learning/conversation-handoff.md)为入口。组合根与子装配的职责和状态寿命已明确，见[维护边界](docs/architecture/composition-root-assessment.md)。

源码、冻结基准、测试、文档和验证摘要按[仓库维护约定](docs/development/repository-workflow.md)提交；生成输出、缓存、截图与逐帧测量数据由 .gitignore 排除。冻结资源、第三方依赖和资产保持原始字节。现有署名见[src/third-party/notices.txt](src/third-party/notices.txt)。

功能开发前的工程审查、清理范围和验收结果见[工程规范化记录](docs/validation/project-normalization.md)。
