# 室内移动性能与静态阴影

001、002、003的装饰灯和家具、窗门构件、球台投影构件均为静态对象。两张2048/1024阴影图改为首次完整生成后复用；球和球杆不在这两张图的投影列表中，继续使用原游戏阴影路径。分辨率、投影对象、模糊方式、材质、灯光强度、相机、输入与游戏时钟保持原设置。

`interior-lighting.js`使用当前Babylon 3.2的render-once刷新策略。投影材质尚未就绪时，引擎会重置刷新计数并重试，避免把首次不完整投影永久缓存。窗口变化后重新生成；WebGL恢复时取得引擎重建后的新阴影图，重新应用缓存策略。场景销毁时移除引擎事件监听，不保留旧场景引用。

## 硬件测量

```powershell
node scripts/measure-interior-performance.mjs --label shadow-cache-chrome --browser chrome --runs 3 --seconds 6 --dpr 2
node scripts/measure-interior-performance.mjs --label shadow-cache-edge --browser edge --runs 3 --seconds 6 --dpr 2
```

默认使用`src/start.mjs`真实源码服务，viewport为1440×900，DPR可设1或2。`--design interior-design-001`可限定方案；`--target development`使用通过verify的开发输出。`PCOL_BROWSER_PATH`可指定浏览器。结果写入`reports/measurement/interior-performance-LABEL.json`。

测量使用实际D键绕台移动，每次新建页面，在游戏就绪后预热1.5秒。每轮交替顺序比较`redrawn`与`current`：前者仅在已预热的测试页面恢复旧的逐帧阴影策略，后者使用当前维护源码策略。这样比较的是稳定移动阶段，不包含加载时间，也不把恢复页停滞当作帧时间。测试响应只注入既有游戏观察句柄，不写入运行源码或交付文件。

记录实际GPU renderer、WebGL版本、抗锯齿/采样数、画布像素尺寸、渲染帧间隔、CPU提交耗时、逐帧绘制调用和阴影生成次数；可用时记录独立异步GPU timer query样本。拒绝未知renderer及SwiftShader/WARP等软件渲染器，不通过软件截图宣称真实显卡性能改善。

`cached-no-relief`与`cached-four-lights`为单次页内诊断，分别临时关闭微表面和四盏局部补光。它们改变测试画面，不代表采用这些生产设置，也不能凭一轮噪声决定灯光取舍。灯光是否调整，应结合多轮硬件数据、视觉影响与帧预算判断。

GPU计时与CPU提交耗时不同；帧间隔还受浏览器调度和刷新率影响。原相机部分按帧推进，因此真实输入轨迹并非跨帧率逐点一致。报告只说明当前设备、浏览器、viewport和DPR；60帧封顶下，GPU余量增加不一定使平均FPS继续提高。高光/纹理闪烁和显示设备拖影不由本次缓存改动直接解决。

## 2026-10-08测量结论

实际renderer为Intel Arc 140V的ANGLE/D3D11，WebGL 2、4倍MSAA，画布2880×1800。Chrome和Edge各完成30次测量；逐帧重绘与缓存策略各比较3轮，以下GPU耗时为每轮中位数的均值（毫秒）。

| 设计 | 每帧绘制调用：重绘→缓存 | Chrome GPU：重绘→缓存 | Edge GPU：重绘→缓存 |
| ---- | ----------------------- | --------------------- | ------------------- |
| 001  | 84→52                   | 8.31→6.71             | 8.29→7.01           |
| 002  | 94→54                   | 8.35→8.13             | 8.42→8.01           |
| 003  | 109→57                  | 8.97→7.41             | 8.11→8.36           |

绘制调用降低约38%、43%、48%，但GPU收益并不在所有组合中一致，尤其Edge的003未观察到改善。各组合帧间隔中位数约16.7毫秒，P95约17.3–17.8毫秒；此次不宣称FPS提高或已消除主观拖影。单轮四灯诊断不足以支持修改生产灯光，现有八灯保留。微表面与抗锯齿调整不在本次执行范围。

原始场景保持35次绘制调用，未使用这两张室内阴影图。各轮统计与环境见[Chrome测量摘要](../../reports/measurement/interior-performance-shadow-cache-chrome-summary.json)和[Edge测量摘要](../../reports/measurement/interior-performance-shadow-cache-edge-summary.json)。摘要保留原始报告的日期、源码哈希、各轮统计及诊断条件，省略逐帧数组并记录原始报告哈希；不是重新测量。上述数据仅比较预热后的稳定移动阶段。

逐帧原始报告保留在本地 reports/measurement，默认不提交 Git。测量后运行 `node scripts/summarize-measurement.mjs reports/measurement/interior-performance-LABEL.json` 生成可提交的摘要。

## 行为与画面对照

```powershell
node scripts/check-project.mjs --browser
node tests/e2e/interior-shadow-cache.test.mjs
node scripts/test-interior.mjs
node tests/e2e/source-standalone.test.mjs
node tests/e2e/interior-design-original.test.mjs
```

阴影专项覆盖Chrome/Edge、源码/开发/生产及三套设计。使用实际阴影图事件检查初次生成、移动复用、窗口刷新和真实WebGL上下文丢失/恢复；固定相机下排除动态球及瞄准覆盖物，以原始RGBA像素对比缓存与逐帧重绘，并核对恢复后缓存与恢复后完整重绘的像素。采样在同步渲染后完成，避免非保留帧缓冲在异步截图时已清空。NullEngine单元测试额外检查图重建与事件监听释放。

上下文恢复前后的完整静态房间相等记录为`fullScenePreRestoreEqual`，当前要求该字段为true。窗口变化必须等待实际画布与drawing buffer尺寸更新后采样，避免把resize事件尚未处理的旧尺寸画面与新尺寸画面相比较。测试额外等待纹理重新加载及实际着色器编译，避免冻结材质提前报告场景就绪。此前球台及地面变黑的缺口已通过独立兼容层处理，原因、连续恢复、全部游戏网格及闲置首页自动刷新验证见[WebGL完整恢复](context-restoration.md)。此恢复修复不改变上述历史GPU测量的条件或结论。

受影响场景还需分别执行`interior-design.test.mjs`及`game.test.mjs`，覆盖布局、八灯隔离、家具支撑、真实重开、物理、计分、Replay与恢复。原始场景继续与冻结基准精确对照。专项结果位于`artifacts/testing/interior-shadow-cache/report.json`。
