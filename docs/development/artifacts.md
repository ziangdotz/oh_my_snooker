# 当前验证产物

artifacts/testing只保存当前src与冻结基准的浏览器截图、状态和诊断，不作为运行或构建输入。

| 位置                                               | 内容                                 |
| -------------------------------------------------- | ------------------------------------ |
| testing/regression                                 | 当前玩法、物理、规则、回放与恢复对照 |
| testing/source-runtime                             | 源码独立运行与对照                   |
| testing/designs/interior-design-ID                 | 各方案场景和玩法验证                 |
| testing/interior-selection、startup-recovery       | 室内交互、字体与启动恢复             |
| testing/game-ui、pcol-ui-layout、ui-vector-artwork | 游戏界面、PCOL布局及矢量图验证       |
| testing/interior-shadow-cache                      | 静态阴影生成、复用和恢复             |
| testing/modern-wall-study                          | 当前单墙模块的非交互与玩法对照       |

其余专项按同一规则写入testing下具名目录。每个主题保留当前输出，重复执行覆盖对应结果；失败诊断用于定位当前问题。场景测试的固定机位截图同样写入测试目录。

reports/validation/architecture-migration-map.json是算法验证读取的当前源码与冻结基准映射，不能当作生成记录删除。其余reports中的结果由检查、专项或测量命令生成；结果须结合日期、源码哈希和测试范围解释。命令见[开发流程](workflow.md)，覆盖与限制见[验证说明](../validation/README.md)。

Git 保留 reports/validation 及 reports/measurement 下的 `*-summary.json`、相机时间刻画。逐帧原始数组与 artifacts/testing 默认忽略，文件仍可留在本地复现和诊断。室内性能原始报告可用 `scripts/summarize-measurement.mjs` 转为统计摘要，保留原始报告哈希与测量条件。详细分类见[仓库维护](repository-workflow.md)。
