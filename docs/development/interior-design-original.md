# 室内设计·原始

`interior-design-original` 是 PCOL 原始 Tiger Club 房间的具名维护方案。默认 `/` 与 `?interior=interior-design-original` 均加载这一版；原先组合根中内联的房间初始化已由此方案接管。001、002、003仍通过各自参数选择。

## 1:1 的实现

直接复用 `src/assets/models/interior-design-original-room.babylon` 的几何、墙面、家具、地面、天花、UV、材质与烘焙光照贴图，不重新生成视觉素材，也不添加或隐藏房间网格。

- `src/presentation/scenes/interior-design-original-config.js`：方案名称、模型引用、原始房间网格清单与地面、袋口、台呢、球台灯、球框的精确初始化参数。
- `src/presentation/scenes/interior-design-original.js`：按原执行顺序应用配置，复用原生 PCOL 材质、反射环境图与纹理。
- `src/application/compose-game.js`：加载原模型及资源清单后委托该方案初始化，随后应用选中的室内装饰。001–003共享的球台初始化数值与顺序保持原样。
- `interior-design-registry.js`：独立注册“室内设计·原始”；视觉名称与物理场景 `tigerClubSno` 分离。

原始材质大多由模型内的烘焙贴图决定，配置文件没有将它们重新解释为统一的现代色板。球体材质、反射光照探针、相机、碰撞和规则继续沿用原逻辑。配置中的球台灯强度60、175°照射角、3.6米灯位、台呢30倍纹理平铺及球框4倍平铺均来自已有原版数值。

## 运行

运行node src/start.mjs后打开http://127.0.0.1:5173/，默认加载原始方案。也可通过INTERIOR DESIGN或?interior=interior-design-original选择。运行参数以源码配置模块为准。

## 验证

`node scripts/check-project.mjs --browser` 验证维护规范、完整性、构建、单元/集成，以及Chrome、Edge的原版对照玩法回归。

`node tests/e2e/interior-design-original.test.mjs` 分别在Chrome和Edge中对照冻结PCOL、默认入口与原始方案具名入口：

- 全部导入模型的顶点、法线、UV、索引、变换、材质绑定、可见性与交互标记。
- 材质序列化参数、纹理采样、纹理文件内容哈希、两盏原始灯光及网格作用范围。
- 主空间、墙面、天花、左侧、右侧五个固定相机视角的原始RGBA像素。测试仅隐藏动态球、球杆及游戏辅助网格以隔离房间，正式运行没有此操作。
- 两个浏览器内部各自比较PCOL与本方案；不要求不同浏览器或不同显卡间的像素相同。
- 资源路径按实际文件SHA-256归一化，已有 `planebatch`/`powerview` 着色器语义重命名显式对应，数值和几何不放宽比较。
- 专项前后验证冻结游戏完整集合及大小/哈希，并确认baseline.json未变化。

专项输出：`artifacts/testing/designs/interior-design-original/scene/report.json` 与 `reports/validation/interior-design-original.json`。固定视角截图是房间对照图；真实击球、计分、犯规、Replay、恢复和重开另由完整玩法回归验证。这里的1:1是已有本地PCOL基准在相同测试浏览器与软件WebGL条件下的对照结论，不承诺不同显卡之间像素完全相同。
