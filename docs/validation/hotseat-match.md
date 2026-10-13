# 同机双人开发与验证

2026-10-13接入第一阶段真实同机双人。入口为首页 PLAY TOGETHER → TWO-PLAYER MATCH → 两位姓名／四套室内 → START MATCH。ROOMS仍为后续功能。

## 实现与边界

- [同机模型](../../src/application/models/hotseat-game-model.js)建立两个USER身份，复用原裁判、计分、罚分、放球与清彩逻辑。首局玩家1开球，重开交替；不消耗Practice／AI的开球计数。
- [同机控制器](../../src/application/controllers/hotseat-match-controller.js)只持有一个键鼠／相机控制器。上一杆录制保存并完成判罚后，解绑旧输入、清除按键与拖动，将操作者绑定到裁判给出的席位。换人回到站姿，保留当前所在视角方位，重置惯性、击球偏移、角度及力度；得分续杆不交接。
- [设置抽屉](../../src/presentation/ui/more-things-dialog.js)使用原生表单、单选场馆和现有弹层生命周期。空姓名默认PLAYER 1／2，连续空白归并，超过20个Unicode码点或重名提示修改。计分栏和结果以文本呈现姓名，终局显示姓名WINS或DRAW。
- [同机草稿](../../src/infrastructure/navigation/hotseat-session.js)独立保存版本、模式、姓名、场馆与返回页面。刷新设置或准备场馆时恢复表单，始终不自动开始比赛；禁用存储时继续使用内存草稿。不保存分数、球位或网络凭据。
- 场馆准备复用同页缓存与原加载恢复界面。失败可RETRY，BACK取消开始并保留设置；准备成功且抽屉完全关闭后，才发出原有game控制器切换事件。两种模式共用真实Single Play开局过渡、球台、相机与资源。

原MatchController仅提取无参数的`_createPlayerControllers`方法。算法审计将方法原位内联后比较完整AST，不排除计分、判罚或输入方法。新增逻辑使用独立扩展类，冻结与第三方字节不变。

## 验证入口

`node --test tests/unit/hotseat-match.test.mjs`验证身份、模式隔离、交替开球、计分续杆／换人、重复击球拒绝、共享控制器交接、Unicode姓名和草稿恢复。

`node tests/e2e/hotseat-match.test.mjs`使用Chrome／Edge、源码／开发／生产入口和四套室内，共24个场景。验证两位玩家真实放球／瞄准／击球、长按Space／方向键与鼠标拖动后的清理、暂停、回放、重开、退出、原位准备失败／取消／重试、刷新不重复开局，以及与实际Single Play相机、视场、灯光、22球开局的对照。

专项调用现有受控裁判测试，覆盖红黑续杆、合法未进球换人、错误目标、罚分、母球入袋与重置、末红清彩。终局另用受控分数验证两位获胜者和平局，恶意姓名作为普通文本显示，保留最高单杆统计。这些受控输入不代表已通过真实击球打完一局。

`node tests/e2e/hotseat-match.test.mjs --lifecycle`另在两款浏览器核对玩家2退出、重新进入时由玩家1开球、受控终局的真实PLAY AGAIN按钮、保留姓名并交替开球，以及退出后重新进入Practice时恢复单人模型。结果写入[生命周期记录](../../reports/validation/hotseat-lifecycle.json)。

记录写入[同机专项JSON](../../reports/validation/hotseat-match.json)，截图与完整裁判结果位于[本地专项目录](../../artifacts/testing/hotseat-match/)。工程整体、室内、源码独立、原场景、连续运行及流畅性验证按[工作流](../development/workflow.md)执行；各报告以本次最终运行结果为准。

有限自动化验证不证明完整比赛、多小时运行或真实GPU延迟。公网房间、同步与断线恢复尚未实现。

2026-10-13最终运行通过：整体检查的141项单元／集成测试与Chrome／Edge游戏回归；双人24个场景及2个生命周期场景；室内六套专项、复制src独立启动、原场景五视角冻结对照；连续运行中每款浏览器的基准／当前版本分别完成18杆Practice及三档AI自主击球、回放和重开。连续运行原始记录见[报告](../../artifacts/testing/continuous-play/report.json)。终局仍为上述受控验证。
