# 学习与维护导航

先读[README](../../README.md)、[AGENTS](../../AGENTS.md)、[当前交接](conversation-handoff.md)、[架构](../architecture/overview.md)与[开发流程](../development/workflow.md)。

| 主题           | 说明                                                                                                                                                        | 源码入口（相对于src）                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 独立启动与装载 | [源码运行](../development/source-runtime.md)                                                                                                                | start.mjs、runtime/source-entry.js、module-loader.js      |
| 命名与边界     | [代码规范](../development/coding-standards.md)、[命名](../development/file-naming.md)                                                                       | runtime/runtime-catalog.json                              |
| 菜单与室内切换 | [室内选择](../development/interior-selection.md)                                                                                                            | application/interior-selection.js、interior-transition.js |
| 界面与字体     | [游戏界面](../development/game-ui.md)、[样式](../development/styles.md)、[字体](../development/typography.md)                                               | presentation/ui、styles、typography                       |
| 四套场景       | [系列](../development/interior-design-collection.md)、[原始](../development/interior-design-original.md)、[001](../development/interior-design-001.md)      | presentation/scenes                                       |
| 单墙模块       | [单墙说明](../development/modern-wall-study.md)                                                                                                             | presentation/scenes/modern-wall-study.js                  |
| 验证与测量     | [验证范围](../validation/README.md)、[连续运行](../validation/continuous-play.md)、[阴影性能](../validation/interior-performance.md)                        | domain、application、presentation的相应模块               |
| 组合根整理     | [维护边界](../architecture/composition-root-assessment.md)、[游戏装配](../architecture/game-composition.md)、[球杆装配](../architecture/cue-composition.md) | application/compose-game.js、application/composition/     |

深入源码时先看runtime-catalog与launch-game、compose-game、snooker-application，再读domain/math、geometry、physics、simulation和rules，随后看AI、回放、输入和相机。构建从tooling/build/build-inputs.mjs、module-compiler.mjs与runtime-assembly.mjs进入；验证从tests/helpers/runtime-fixture.mjs与tests/e2e/game.test.mjs进入。

当前四套室内的操作时间与像素密度扩展见[游戏操作流畅性](../validation/gameplay-motion.md)，入口包括presentation/camera/timed-\*、input/smooth-person-controller与application/smooth-snooker-application。原有控制器仍保留用于行为对照；实际装配使用这些扩展。

docs记录当前机制与维护方法，reports记录验证输入和结果，artifacts/testing保存浏览器状态及截图。优化先使用[实验模板](../templates/experiment.md)，按[后续方法](optimization-roadmap.md)选择独立范围。

双人功能按[房间与双人对战方案](../development/rooms-and-two-player-plan.md)推进：第一阶段已接入真实同机轮流比赛，模型、输入交接、设置与验证入口见[同机双人](../validation/hotseat-match.md)。权威比赛服务与联网房间留在第二阶段。

本轮前端面板的[系统设计](../development/rooms-panel-design.md)与[交互预览](../development/rooms-panel-prototype.html)覆盖 PLAY TOGETHER 入口、同机设置、后续联网等待及结果状态。预览是独立设计稿，模拟状态不能作为真实双人功能验收。

Git 提交分类、冻结字节保护和维护审计见[仓库维护](../development/repository-workflow.md)。开始新增功能前先完成整体检查，并按专题验证矩阵选择受影响的测试。
