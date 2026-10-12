# 当前工程交接

更新于2026-10-12。先读根目录[AGENTS](../../AGENTS.md)、[架构](../architecture/overview.md)与[工作流](../development/workflow.md)。当前源码、冻结基准及有效验证结果为事实依据。

## 双人功能的待启动计划

2026-10-12用户已确认当前[面板设计](../development/rooms-panel-design.md)可行，要求保留并等后续随时启动；当前不继续实施真实同机比赛或联网功能。后续明确启动时，按[实施方案](../development/rooms-and-two-player-plan.md)先做同机双人，再扩展联网房间。

已确认设计包括更宽的One more thing...入口、两位姓名与四套室内点选、复用Single Play的紧凑HUD／暂停菜单／真实开局场景，以及加载解码后220ms背景淡入、最新选择优先、失败保留原图与重试、减少动画。独立[预览](../development/rooms-panel-prototype.html)中的比赛和房间仍为模拟；开局背景是实际Single Play采集的静态帧，不是真实双人场景。图片为本地产物，可用node scripts/capture-match-opening.mjs重建。

设计阶段的工程检查为130项单元／集成测试通过，其中8项覆盖设计稿异步背景逻辑；四套Single Play开局场景采集通过。当前file预览未自动刷新或完成最新浏览器视觉验收，详见[设计记录](../../reports/validation/rooms-panel-design.json)与[场景记录](../../reports/validation/match-opening-scenes.json)。恢复开发时先核对当时源码与已有修改，再实施同机模型和操作权绑定；这些设计验证不替代真实双人验收。

## 运行与现状

全部实际运行内容位于src。node src/start.mjs仅依赖Node内置模块，默认http://127.0.0.1:5173/；整个src可独立复制启动。构建从同一源码生成开发/生产输出，baselines/pcol只用于冻结对照。

原始、001、002、003四套室内设计均可选择。启动页、室内选择及About保持当前布局；游戏内使用PCOL紧凑布局和操作顺序，沿用深绿、暖金及Saira字体。One more thing...中的房间与双人对战仍为预留功能。

启动与场馆切换共享HTML加载卡片、字体回退和RETRY/BACK。四套正式场馆现在同页切换：保留引擎、球台、球和控制器，每套装饰只准备一次，仅启用当前场馆的网格和灯光。首次访问等待贴图与阴影，已缓存场馆直接复用，快速完成时不闪加载卡片。失败回退原场馆并可重试；wall-study保留兼容重载。三套新房间保留八盏室内灯，两张静态阴影图首次完整生成后复用，窗口变化或WebGL恢复后刷新。专项证据见[切换验证](../../reports/validation/interior-switching.json)，实现见[室内选择](../development/interior-selection.md)。

模块清单当前登记115个模块：73工厂、34资产、8模板。基础UI与球杆装配通过总根的ESM导入登记；加载器异常收尾和球杆缓存字段已修正。球杆定义及材质归presentation/rendering，文件缓存归infrastructure/assets，预取标记和克隆编号由球杆子装配拥有；网格管理器内核不改写。具体契约见[球杆装配](../architecture/cue-composition.md)。本轮已接入动画/显示/场景、设置/AI/对局状态、输入/相机/回放三个批次，新增24个职责工厂；三个批次均已完成验收，18项同组行为刻画先后通过。模块ID不变；共享状态及扩展入口见[游戏装配](../architecture/game-composition.md)，当前证据见[验证记录](../../reports/validation/game-composition.json)。根继续负责最终跨组连接，CushionBody保留原碰撞运算。

WebGL恢复兼容层已接入HDR重建、原采样行为、冻结球谐光照绑定、动态贴图绑定缓存，以及按需首页在资源就绪后的自动刷新。保留GameView通过兼容子类装配，不改写其内核算法；恢复监听及就绪检查随场景释放。验收方式与记录入口见[完整恢复](../validation/context-restoration.md)。本轮装配复测另执行恢复烟雾专项；性能调整仍须先测量。

## 工程维护范围

四套室内已接入[操作流畅性扩展](../validation/gameplay-motion.md)：走位和视角按经过时间推进，高分屏固定 DPR 1.5 上限，瞄准过渡 0.8 秒，挥杆准备为原时长的 65%，首次说明同步打开。原 60 Hz 稳态走位速度、触球速度、物理与判罚保留；相机时间和高密度渲染缓冲是明确允许的行为差异。原算法文件与冻结基准未改写；扩展和验证入口见专项说明。旧装配报告仍只证明它记录的源码，当前优化证据单独保存。

工程只维护当前src及冻结基准所需的构建、服务、测试、测量和文档。artifacts只保留testing；reports保留相关验证输入、摘要及本地原始测量。产物与提交分类见[说明](../development/artifacts.md)及[仓库维护](../development/repository-workflow.md)。冻结游戏及baseline.json保持原始字节，基础类与工厂 ABI 是有实际引用的兼容实现。

源码启动现在使用 userId / displayName 本地身份，已移除无用头像占位与未实现的远程用户查询方法。两个会话类的显式改名/删除边界由算法结构报告记录，领域物理与规则不变。ESM 导入和 loadModule 依赖统一执行架构边界，碰撞场景 JSON 引用进入构建闭包；维护审计检查模块、资产、文档和工程命令，并纳入整体检查。

后续目标已明确为[先同机双人，再联网房间](../development/rooms-and-two-player-plan.md)。当前不包含双人或网络服务实现；开发前的工程整理、保留边界和验收证据见[规范化记录](../validation/project-normalization.md)。

工具变化运行node scripts/check-project.mjs；运行代码、资源或构建规则变化运行整体浏览器检查，并按工作流增加专项。源码与冻结目录不得通过格式化、生成或测试改写。生成输出可重建，不手工维护。

## 当前限制

静态阴影减少绘制调用，但不保证每个场景GPU耗时降低或FPS提升。恢复证据限于专项明确的场景、相机与浏览器renderer，不代表跨设备逐字节像素相等。抗锯齿、微表面闪烁、主观拖影及双人对战尚未解决。有限连续运行不能证明完整比赛或数小时稳定性。
