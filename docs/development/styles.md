# 样式组织与维护

[game.css](../../src/presentation/styles/game.css)只作为有序导入入口。源码与构建交付保持相同顺序，新规则按职责进入对应文件，不在入口堆叠覆盖补丁。

| 顺序 | 文件                                                                               | 职责                                                         |
| ---- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1    | [game-base.css](../../src/presentation/styles/game-base.css)                       | 当前文档、画布、键帽、图标及目标球等共用基础                 |
| 2    | [typography.css](../../src/presentation/styles/typography.css)                     | 字体声明、字体栈、常规文字与标题/按钮字重                    |
| 2a   | [controls-guide.css](../../src/presentation/styles/controls-guide.css)             | 操作说明的示意图、键帽、动作/操作/条件列与响应式布局         |
| 3    | [interior-tokens.css](../../src/presentation/styles/interior-tokens.css)           | 室内公共颜色、字号、圆角、间距、操作按钮和焦点；集中窄屏变量 |
| 4    | [interior-menu.css](../../src/presentation/styles/interior-menu.css)               | 启动菜单及响应式布局                                         |
| 5    | [interior-drawer.css](../../src/presentation/styles/interior-drawer.css)           | 场馆卡片、滚动与关闭/返回布局                                |
| 5a   | [interior-more-things.css](../../src/presentation/styles/interior-more-things.css) | 双人宽面板、主次卡片、标题层次与响应式；设计预览共用此样式   |
| 5b   | [interior-about.css](../../src/presentation/styles/interior-about.css)             | About简介、作者、引擎链接及装饰球台，共用抽屉框架            |
| 6    | [interior-transition.css](../../src/presentation/styles/interior-transition.css)   | 加载/恢复、字体状态、光带动画及响应式布局                    |
| 7    | [game-ui.css](../../src/presentation/styles/game-ui.css)                           | PCOL紧凑比分、工具栏、回放、通知、居中面板及结果的独立作用域 |

## 修改约定

公共视觉值在tokens维护，组件自己的布局与响应式规则留在组件文件。新室内选择器限定.interior-作用域，不用全局覆盖修复局部问题。字体资源与字号唯一说明见 [页面字体](typography.md)。

游戏内组件共用interior-tokens中的颜色，布局限定`.game-ui-`。工具栏改为原生button，图标span不再重复data-action，外层按钮保留原动作值；暂停及难度选项的section/data-sid保留，内部按钮通过原事件委托触发。设计及生命周期见[游戏内界面](game-ui.md)。

菜单进退由PropertyTween与控制器循环驱动，CSS呈现颜色、悬停及状态，不叠加另一套位移动画。交互与减少动画约定见 [室内选择](interior-selection.md)。

新CSS和资产须形成有效引用闭包。构建从src读取导入文件，将交付样式归到styles目录，不拼入冻结CSS。改变导入顺序会改变级联，需要计算样式和浏览器回归证据。

## 验证与复用

[stylesheet-fixture.mjs](../../tests/helpers/stylesheet-fixture.mjs)按顺序展开源码及构建CSS，检查不支持的导入和循环。原版UI已获准替换，原CSS全文相等不再是验收标准。物理、规则、场景与回放继续对照冻结基准；当前视觉通过计算样式、实际布局和键盘流程验证。game-base只保留当前组件需要的基础规则。

室内专项 `node scripts/test-interior.mjs` 覆盖菜单、面板、加载/恢复、字体失败和切换；浏览器/服务夹具见 [runtime-fixture.mjs](../../tests/helpers/runtime-fixture.mjs)。计算样式和交互由室内专项验证，执行顺序见 [开发流程](workflow.md)。

About继承室内抽屉的边框、背景、标题、关闭和BACK布局，自己的卡片及文字限定在`.interior-about-`作用域。正文独立滚动，标题和操作区不随正文移动；相关布局、焦点与动画证据见[drawer-motion.test.mjs](../../tests/e2e/drawer-motion.test.mjs)。

## 矢量操作图标

操作用位图图集、难度圆点及计分球标已由同用途SVG替换，图集坐标、显示尺寸和事件选择器保持原约定。键帽继续用CSS绘制，灰白底色增加细腻边缘明暗；鼠标左键与滚轮保留绿色操作提示。通用说明图使用真实页面字体和HTML连线，由[basic-controls-guide.js](../../src/presentation/ui/basic-controls-guide.js)在两种说明对话框创建后填充，原对话框的事件与生命周期继承保留。未引用的五个旧PNG直接删除，不作为历史备份保留。

`node tests/e2e/ui-vector-artwork.test.mjs`核对Chrome与Edge的源码、开发及生产版本：SVG解码、2倍像素密度截图、页面文字边界、操作含义和暂停/说明/继续流程。结果见[ui-vector-artwork.json](../../reports/validation/ui-vector-artwork.json)，实景截图位于`artifacts/testing/ui-vector-artwork/`。
