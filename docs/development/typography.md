# 页面字体

页面常规文字统一使用Saira ExtraCondensed SemiBold（600）；原游戏标题、对话框标题、按钮及AI名称使用Saira ExtraCondensed Bold（700）。两种字重使用真实静态字体，禁止合成加粗。

## 当前室内界面字号

其他专题引用本表，不重复维护字号。窄屏断点为480px；游戏内布局与字号维护在game-ui.css，game-base只提供当前共用基础。

| 角色                 | 字重         | 桌面字号 | 窄屏字号 | 行高        |
| -------------------- | ------------ | -------- | -------- | ----------- |
| 左侧五项主标签       | Bold 700     | 24px     | 22px     | 32px / 28px |
| 抽屉标题             | Bold 700     | 32px     | 28px     | 1.2         |
| 双人宽面板标题       | Bold 700     | 40px     | 28px     | 1.2         |
| 双人玩法卡片标题     | Bold 700     | 28px     | 28px     | 1.2         |
| 场馆名称 / About作者 | Bold 700     | 22px     | 20px     | 1.2         |
| About品牌            | Bold 700     | 40px     | 36px     | 1.04        |
| About引导句          | SemiBold 600 | 18px     | 18px     | 1.4         |
| About引擎名称        | Bold 700     | 22px     | 20px     | 1.2         |
| 场馆编号             | SemiBold 600 | 12px     | 12px     | 1.4         |
| 面板说明与状态       | SemiBold 600 | 14px     | 14px     | 1.4         |
| BACK                 | Bold 700     | 20px     | 20px     | 1.4         |
| 加载/恢复标题        | Bold 700     | 40px     | 32px     | 1.2         |
| 加载/恢复说明        | SemiBold 600 | 16px     | 15px     | 1.6         |
| RETRY / BACK恢复按钮 | Bold 700     | 18px     | 18px     | 1.4         |

公共字号与窄屏值集中在 [interior-tokens.css](../../src/presentation/styles/interior-tokens.css)，组件负责应用和布局。标题为关闭按钮留空间，列表独立滚动；同时检查桌面、窄屏和矮屏，不缩放整块界面实现字体放大。

One more thing... 的宽面板字号例外限定在 [interior-more-things.css](../../src/presentation/styles/interior-more-things.css)；1000px 以下标题回到32px，480px以下回到28px。场馆与About字号保持原值，宽面板的层次与布局见[双人面板设计](rooms-panel-design.md)。

About眉题、模式标签和引擎辅助文字复用12px编号角色，正文复用14px说明角色；引导句与引擎名称的局部字号在About样式中应用。简介的行高为1.6，长正文可在面板内部滚动。

## 资源与服务

[typography.css](../../src/presentation/styles/typography.css)登记两套字体，以--page-font与--game-heading-font管理字体栈。微软雅黑和通用sans-serif用于缺失字符及失败回退。src/assets/fonts保留两种字重的woff2、woff、ttf、eot、svg；浏览器优先woff2，src/index.html预加载两个woff2。

[page-fonts.js](../../src/presentation/typography/page-fonts.js)在bootstrap登记，ready()缓存同一个Promise：分别加载600和700，均取得字体时返回ready；API不可用、空结果、请求失败或等待超过10秒返回fallback。成功与失败都缓存，各组件不重复发起请求。

启动入口在创建游戏前等待请求结束，加载/恢复视图复用此服务。加载层随HTML立即显示球台图形、光带和固定sans-serif状态文字；状态文字叠在固定标题槽位中，桌面标题一行、说明两行，窄屏标题两行、说明三行，不因字体就绪新增或移除布局行，也容纳较宽的回退字体。切换的旧页面也使用相同等待状态，只有新页面字体就绪后才显示完整标题与说明。脚本复用HTML节点，交接时暂停光带，进入正式内容时继续动画。

失败时该视图使用固定回退，即使字体仍在等待也显示RETRY/BACK，保留恢复焦点；字体服务只报告结果。源码早期启动失败沿用同一工厂创建恢复实例，不改变游戏时钟、循环或物理。卡片连续性证据见[加载连续性专项](../../tests/e2e/interior-loading-continuity.test.mjs)。

页面使用当前字体资源与稳定回退；冻结程序及第三方引擎已有字体不由页面字体维护改写。

## 验证

执行 [开发流程](workflow.md)中的整体浏览器检查与 `node scripts/test-interior.mjs`。单独调试可运行 `node tests/e2e/interior-transition.test.mjs`，需有效开发/生产构建。

CSS对照只允许已批准的字体族、字重、字体资源声明和独立室内样式；原游戏字号、间距、颜色、布局及旋转动画继续严格比较。[字体验收](../../reports/validation/interior-font-unification.json)记录双字体等待、尺寸稳定、各字重单独失败和窄屏恢复；单元测试见 [page-fonts.test.mjs](../../tests/unit/page-fonts.test.mjs)。
