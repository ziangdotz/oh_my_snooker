# 启动页室内设计选择

启动页按SINGLE PLAY、One more thing...、PRACTICE、INTERIOR DESIGN、ABOUT排列五项入口，自然居中，没有品牌标题、横线或当前场馆小字。菜单、右侧面板与加载/恢复页使用统一的墨绿黑、香槟金及暖白视觉；字号唯一说明见 [页面字体](typography.md)，CSS职责见 [样式组织](styles.md)。

One more thing...打开与SELECT VENUE共用样式及生命周期的右侧面板，预留ROOMS（创建或加入房间）和TWO-PLAYER MATCH区域，标记COMING SOON；当前不提供房间创建或双人对局。关闭、BACK、Escape均返回首页并恢复入口焦点。五项菜单支持Enter/Space、上下方向键及Home/End，面板保留Tab焦点循环及减少动画。原单人、练习与About使用原动作标识，新增入口不改变其路由。

ABOUT沿用原菜单动作标识和aboutBox注册名，改用同一套右侧抽屉。内容分为游戏简介、纯文字ZIANG ZHANG署名与Babylon.js引擎信息，保持英文、墨绿、香槟金与暖白视觉。引擎链接保留官方网站，在新标签打开并使用noopener/noreferrer；不会在打开面板时发起外部请求。关闭、BACK和Escape恢复ABOUT入口焦点，Tab循环涵盖关闭按钮、可滚动正文、引擎链接和BACK。矮屏正文独立滚动，标题和底部操作固定。专项由interior-ui与drawer-motion覆盖。

## 展示与动画

右侧SELECT VENUE按original、001、002、003排列，显示实景图、英文名称、说明及当前标记，底部仅保留BACK。桌面面板宽480px、四周24px留白；窄屏适配可用宽度，列表独立滚动。名称与预览元数据由registry管理，运行资源来自src，不读取artifacts。

加载/恢复页保留球台图形、目标场馆、说明和不定进度光带，无眉题、阶段副标题或标语。加载标题与说明使用固定高度槽位，等待文字叠在标题槽位中，不增加额外一行；桌面标题一行、说明两行，窄屏标题两行、说明三行，兼顾较宽的回退字体。字体服务先等待两种真实字重，失败时加载/恢复视图使用稳定回退。错误页仍按内容自动扩展，保留恢复操作。

菜单整张按钮从下方8px浮入，位移360ms、透明度270ms，相邻错峰18ms，总计432ms；退出160ms同步淡出并上提3px。中途换向从当前姿态插值，完全隐藏后再次进入恢复下方起点。减少动画为16ms、无位移及错峰。轨迹通过实际Tween与菜单交互验证。

动画由既有PropertyTween和控制器循环驱动，保留原显示、悬停与选中状态更新，扩展接管整张按钮位移/透明度并清除文字独立位移；颜色由CSS状态类呈现。面板关闭事件在退出动画完成后发出，UI管理器随后解除阻挡，不替换RAF、输入或时钟。

SELECT VENUE、One more thing...与ABOUT继承同一套右侧面板动画：从自身宽度100%的右侧位置滑入并淡入，320ms、Power1.easeOut；退出播放倍率1.25，减少动画时16ms。聚焦使用preventScroll，选中项只滚动面板内列表，防止关闭按钮进入焦点时将隐藏溢出的游戏容器横向滚动，造成跳入或背景移动。逐帧轨迹、外层滚动与窄屏/减少动画证据见[drawer-motion.json](../../reports/validation/drawer-motion.json)。

ABOUT继承相同的抽屉动画和关闭完成事件，正文及链接的焦点只调整面板内部滚动；菜单控制器在退出完成、阻挡解除后恢复入口焦点。AboutDrawer直接参与当前UI注册，基础菜单算法继续用于结构对照。

## 交互与恢复

- 点击当前方案、BACK、关闭或Esc：关闭面板并恢复入口焦点。
- 点击不同方案：锁定重复输入，先显示LOADING VENUE交接界面，经过两次原生RAF回调给予首帧绘制机会，再更新interior参数并受控重载；场景及启动菜单实际就绪后结束加载。旧场景的完成回调不能结束交接。
- 支持Tab/Shift+Tab焦点限制、上下方向键及Enter/Space，窄屏与矮屏保留滚动。
- 保留部署路径、无关参数和hash，正式方案移除wall-study；无参数默认原始方案，无效参数按解析策略回退。
- 45秒未完成启动开放恢复，不自动循环重试；错误提供RETRY/BACK。
- 仅启动控制器开放切换，退出对局后可再次选择；原有移动设备启动限制保持。

完整页面重载避免网格、材质与灯光累积。上一方案恢复记录只在当前标签页sessionStorage保存5分钟，核对同源、部署路径、完整目标网址和方案参数；成功后删除，损坏/过期/无关记录不参与恢复。存储不可用时仍能切换，但无法保留跨重载的上一方案信息；源码早期失败也接入恢复界面。

## 实现与依赖

以下路径相对于src：

| 文件                                                              | 职责                                                             |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- |
| presentation/scenes/interior-design-registry.js                   | 唯一方案目录及展示元数据；list()返回独立展示记录，不暴露应用函数 |
| presentation/ui/interior-side-menu.js                             | 菜单外观、无障碍名称、独立进退动画，保留既有菜单索引             |
| presentation/ui/interior-dialog.js                                | 面板DOM、Tween、焦点、视觉状态及事件                             |
| presentation/ui/about-drawer.js                                   | About内容、链接及正文焦点，继承公共抽屉生命周期                  |
| presentation/templates/about-game.html、styles/interior-about.css | About内容模板及局部排版                                          |
| application/controllers/interior-menu-controller.js               | 生命周期、面板更新、选择编排与完成判定                           |
| application/interior-selection.js                                 | 无DOM/I/O的方案校验与网址策略                                    |
| application/interior-transition.js                                | bootstrap可用的加载、失败及恢复编排                              |
| infrastructure/navigation/interior-navigation.js                  | 浏览器导航与一次性存储I/O                                        |
| presentation/ui/interior-transition.js                            | 不依赖WebGL的加载/恢复界面                                       |
| presentation/typography/page-fonts.js                             | bootstrap缓存字体就绪服务                                        |

compose-game统一注入UiComponent、PropertyTween、Easing、DialogEvents、registry与转换协调器。原side-menu和menu-controller算法保留，新扩展参与现有UI管理器注册、阻挡及关闭流程。转换模块与字体服务在runtime-catalog的bootstrap登记；默认工厂导入的来源和依赖由构建记录。

四张640×360 JPEG预览保存在src/assets/images，使用interior-design-<标识>-preview.jpg命名。运行页面不读取验证产物。

## 首次启动与加载恢复

加载卡片与恢复按钮随HTML提供，脚本仅绑定和更新已有节点，不清空、重新插入或暂时隐藏卡片。旧页面交接与新页面等待字体使用相同的LOADING VENUE界面和居中静止光带；新页面字体就绪后显示场馆标题与说明，并继续同一光带动画。字体等待超过10秒使用稳定回退。首次启动与场馆切换复用此视图，只有场景就绪、主菜单进入可交互状态后才撤下加载层；旧提示层仍在游戏初始化成功后移除。

冷启动异常和模型失败显示RETRY/BACK，原始场馆作为没有前一场馆时的返回目标。保留完整重载、45秒超时与原有恢复记录校验，不使用固定等待时间代替游戏就绪判断。交接RAF不替换游戏循环，不保证操作系统合成器在每种负载下实际呈现该帧。专项证据见[加载连续性](../../tests/e2e/interior-loading-continuity.test.mjs)与[启动恢复](../../reports/validation/startup-loading-recovery.json)。

## 验证与证据

执行顺序见 [开发流程](workflow.md)。统一专项 `node scripts/test-interior.mjs` 校验现有开发/生产构建后，顺序运行以下套件；共用tests/helpers/runtime-fixture.mjs的浏览器、服务、源码响应检查和就绪等待。

| 套件                        | 覆盖                                                                                | JSON证据                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| interior-loading-continuity | 实际点击后逐帧检查交接、字体等待、卡片位置、遮罩覆盖、节点及动画连续性              | artifacts/testing/interior-loading-continuity/report.json                                 |
| interior-ui                 | 菜单及三种抽屉的桌面/窄屏/矮屏排版、反复返回、焦点、正文滚动、减少动画              | [interior-ui.json](../../reports/validation/interior-ui.json)                             |
| interior-transition         | 字体等待与稳定、单字体失败、加载/恢复及重试返回                                     | [interior-font-unification.json](../../reports/validation/interior-font-unification.json) |
| interior-selection          | 四方案12种有向切换、重复输入、当前点击、键盘焦点、Practice返回、参数及资源/模块失败 | [interior-selection.json](../../reports/validation/interior-selection.json)               |
| startup-recovery            | 延迟启动脚本、冷启动异常、模型失败、重试/返回及恢复后切换                           | [startup-loading-recovery.json](../../reports/validation/startup-loading-recovery.json)   |

五个套件覆盖Chrome/Edge的源码、开发及生产六个运行目标。加载连续性专项每个目标分别检查正常字体加载、延迟字体、320×400窄屏/减少动画和窄屏字体全部失败，共24例；使用原生页面和实际点击，不注入游戏状态或改写游戏响应，字体延迟/失败仅拦截字体请求。逐帧检查卡片及交接光带位置，正式内容检查文字位于预留槽位且没有重叠。服务使用no-store，因此正常字体场景不宣称验证HTTP缓存命中。截图各按专题放artifacts/testing；src独立复制启动和原始场景五视角继续使用既有专项，不以室内UI测试替代玩法回归。

面板动效专项执行`node tests/e2e/drawer-motion.test.mjs`，观察真实Tween样本并校验三种面板的位移、透明度、进退时长及外层滚动；覆盖上述六个目标的桌面、窄屏与减少动画模式，不替换RAF或游戏时钟。

浏览器与服务夹具由tests/helpers/runtime-fixture.mjs统一维护，专题结果只对应其实际运行版本。
