# 现代俱乐部墙面试做

当前src保留第一面墙的独立视觉模块，使用现有Node与锁定依赖进行维护。

## 设计方案

主题是安静的现代台球俱乐部。用抽象圆弧、细轨迹线和单颗红球表达斯诺克，避免把整墙堆满比赛照片。挂画与双行名称标识形成不对称布局，以大面积留白、深绿护墙和细铜色边线连接原有球桌。

| 用途       | 色值      |
| ---------- | --------- |
| 墙面       | `#4b5148` |
| 护墙       | `#18382f` |
| 踢脚与接缝 | `#202724` |
| 画框与横线 | `#a18c60` |
| 名称标识   | `#e9e1cc` |

试做位于原房间 z=-4 的墙面内侧，用独立视觉表面覆盖墙面。球桌、碰撞资产、球布局、相机默认值和规则均沿用当前游戏。视觉元素不可拾取，也不加入碰撞。当前材质使用稳定的无光照表面展示配色，房间灯光重做属于后续阶段。

## 使用方式

启动 `node scripts/dev-server.mjs`，打开 `http://127.0.0.1:5173/?wall-study=modern`。进入 PRACTICE 或 SINGLE PLAY 后绕桌查看试做墙面。普通 `/` 页面继续显示现有房间。

运行 `node tests/e2e/wall-study.test.mjs` 验证原页面不启用试做、试做装饰不参与交互/碰撞、两种外观下的开局球状态和规则上下文相同，并输出相同机位的截图。截图隐藏 UI 并临时设置相机，只用于展示；不会改写运行游戏的相机默认值。

截图与专项报告位于artifacts/testing/modern-wall-study。Chrome/Edge玩法对照由node scripts/check-project.mjs --browser执行，软件WebGL不代表真实GPU耗时。

## 维护入口

- `src/presentation/scenes/modern-wall-study.js`：独立墙面、挂画与名称标识的创建。
- `src/application/compose-game.js`：查询参数选择与场景组合接入。
- `src/assets/images/interior-design-001-art.png`：原创 1536×1024 挂画，约 2.5 MB。
- `src/runtime/runtime-catalog.json`：登记新增场景模块、资产和实际依赖。

默认页面不初始化新增墙面或加载挂画纹理；构建交付仍包含挂画资产。退出场景时，新网格、材质和纹理随 Babylon 场景释放。

## 原创挂画提示词

使用内置 imagegen，生成模式，无参考图片，非透明背景。最终提示词如下：

```text
Use case: stylized-concept.
Asset type: original flat wall artwork texture for the existing Oh My Snooker 3D game.
Primary request: create one professionally art-directed landscape snooker artwork, 3:2 aspect ratio, as a finished print ready to place in a slim gallery frame.
Style: sophisticated European sports-club editorial art, modernist printmaking with subtle matte paper grain, impeccably balanced abstract geometry, premium restraint.
Composition: generous warm ivory negative space; an oversized off-centre dark forest-green circular arc suggests a snooker pocket and table geometry; a single small deep red billiard-ball disc creates tension; two extremely fine warm brass lines show a precise rebound trajectory. Cropped charcoal geometric forms along one edge, deliberate asymmetry, quiet hierarchy. The white cue ball may be a clean ivory disc outlined very subtly in graphite. No clutter.
Palette: warm chalk ivory, deep pine green, graphite, one muted oxblood red accent, very restrained warm brass.
Constraints: FLAT front-facing artwork only, edge-to-edge printable image, no room, no frame, no mockup, no perspective, no cast shadows, no photoreal billiard balls. No words, letters, numbers, signatures, logos, or watermarks. Visually original, polished, timeless, not a generic clip-art pool poster.
```

后续可依据游戏内实际效果调整墙面色、挂画尺寸和文字比例，再扩展其他墙面。全房间结构、材质光照和联机功能不属于本轮试做。
