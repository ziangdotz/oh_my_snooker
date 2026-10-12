# 游戏操作流畅性

四套室内共享同一套走位、视角、瞄准和挥杆扩展。2026-10-11 的实际硬件审查发现，高分屏的像素负载和按帧更新的相机惯性是主要问题；详细原始数据保留在 [优化前汇总](../../reports/measurement/gameplay-smoothness-summary.json)。

## 当前行为与允许差异

- 渲染像素密度固定限制为 DPR 1.5，DPR 0.5–1.5 区间保持系统值，区间外取边界。浏览器 resize 时按当前系统密度更新；CSS 布局、字体、矢量控件不随渲染缓冲缩放。DPR 2 下 1440 × 900 的视口使用 2160 × 1350 的缓冲，像素数比原来少 43.75%。不使用随帧率振荡的动态降质。
- 走位输入和惯性以 60 Hz 为参考按经过秒数积分，椭圆轨道和相机切换交点仍使用原有几何实现。视角弹簧使用原 60 Hz 递推矩阵的分数次幂，使高刷新率下每帧也能平滑推进。相机单次推进上限 100 ms，避免失去焦点后跳跃；游戏时钟与物理步进没有替换。
- 松键时加快输入滤波衰减，保留约 0.4 秒的短滑行。持续走位的原 60 Hz 稳态速度保留。两侧方向键同时按下时目标速度为零。
- 站立与瞄准之间的过渡从 1.2 秒缩短为 0.8 秒；蹲起仍为原 0.6 秒。瞄准回正的缓动使用真实经过时间，移除这条路径对固定 16 ms 的依赖。
- 挥杆准备时间为原来的 65%。后拉行程、向前加速度、触球速度、恢复动作，以及球体摩擦、规则和碰撞求解均保留。Space 到球运动的时间包含准备动画，不是单纯的输入延迟。
- 首次操作说明在玩家击球控制激活时同步打开，并沿用原有阻挡输入、键盘焦点和关闭流程；不再于移动开始后延迟 500 ms 弹出。每个控制实例只自动出现一次，快捷键仍可重开帮助。

这些是用户明确要求的操作行为差异。原有控制器保留，扩展在 application/composition 中接入；冻结基准不修改。原始室内模型、灯光数量、材质和静态阴影缓存没有减少。

## 实现入口

本轮 Chrome/Edge 八个硬件场景全部通过。在该 Intel GPU、1440 × 900、系统 DPR 2 的条件下，持续走位的 P95 帧间隔为 16.9–17.9 ms，球运动阶段为 17.3–18.0 ms。与同脚本、关闭 GPU 查询的优化前 Chrome 样本相比，001 的走位 P95 从 24.3/27.4 ms 降到 17.5/17.9 ms，002 从 26.8/28.4 ms 降到 17.3/17.3 ms。相机角度与击球轨迹未逐像素配对，因此这些是操作路径的实测结果，不是对同一静帧的精确性能归因。

0.5 力度的真实 Space 到球开始运动为 403–418 ms，优化前约 587–601 ms。离线调用实际相机工厂时，30/60/120/144 Hz 的两秒圆轨道走位均为 38.13°，松键尾段为约 0.37–0.39 秒。结果详见 [优化记录](../../reports/validation/gameplay-motion.json)和[时间刻画](../../reports/measurement/camera-rate-characterization-after.json)。

| 内容                 | 源文件                                                                                                                                                                                                                                                                     |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 走位时间积分         | [timed-orbit-controller.js](../../src/presentation/camera/timed-orbit-controller.js)                                                                                                                                                                                       |
| 视角弹簧与回正       | [timed-linear-controller.js](../../src/presentation/camera/timed-linear-controller.js)、[timed-look-controller.js](../../src/presentation/camera/timed-look-controller.js)、[timed-aim-camera-controller.js](../../src/presentation/camera/timed-aim-camera-controller.js) |
| 瞄准时长与相机 delta | [smooth-person-controller.js](../../src/presentation/input/smooth-person-controller.js)                                                                                                                                                                                    |
| 挥杆与首次说明       | [quick-stroke-motion.js](../../src/application/controls/quick-stroke-motion.js)、[immediate-guide-control.js](../../src/application/controls/immediate-guide-control.js)                                                                                                   |
| 像素密度             | [render-resolution-policy.js](../../src/presentation/rendering/render-resolution-policy.js)、[smooth-snooker-application.js](../../src/application/smooth-snooker-application.js)                                                                                          |

## 可重复验证

`node --test tests/unit/gameplay-motion.test.mjs` 覆盖 30/60/120/144 Hz 和不规则间隔的角度一致性、椭圆轨道、停止时间、60 Hz 原弹簧响应、目标限位、时长隔离、不同力度的触球速度，以及 DPR/resize/释放事件。没有替换全局时钟或 WebGL。

`node tests/e2e/gameplay-motion.test.mjs` 使用系统 Chrome 与 Edge、真实 Intel GPU、1440 × 900 DPR 2，逐一运行四套室内。实际鼠标和键盘完成合法放球、双向走位、站立拖动、蹲起、入瞄准、瞄准拖动、方向调整、Alt 拖动杆头与击球。测试断言首次说明已经阻挡输入、缓冲密度上限、实际相机移动及一杆完成，并保留帧间隔、输入事件与截图。可提交的统计证据见[优化记录](../../reports/validation/gameplay-motion.json)；逐帧原始数据 reports/measurement/gameplay-motion-after.json 和截图 artifacts/testing/gameplay-motion/ 是本地可再生成产物，默认不提交 Git。

浏览器专项的固定持键时间用于采集持续运动，并非等候状态的替代；所有就绪、停止和击球完成均等待实际游戏状态。测试通过仅证明当前机器与浏览器条件下的行为，不代表所有显示器或 GPU。帧间隔不等于显示延迟，短 Practice 样本也不替代完整比赛或长期负载验证。

整体运行检查使用 `node scripts/check-project.mjs --browser`。组合根还需 src 独立启动和原始室内对照；输入与共享对局状态需 continuous-play。相关阴影、WebGL 恢复和高密度操作图专项分别验证资源与 UI 的兼容性。最终证据统一记录在 reports/validation/gameplay-motion.json。

本轮上述检查全部通过：114 项单元/集成测试、137 项保留算法结构对照、八组硬件操作场景、18 组静态阴影检查、24 组完整 WebGL 恢复场景，以及 Chrome/Edge 的基准和当前版本各 18 杆 Practice 与三种 AI 难度。独立复制 src 启动、原始场景五视角像素对照、五套室内专项和 DPR 2 操作图专项均通过。开发/生产输出再次通过完整性检查，冻结基准哈希保持不变。
