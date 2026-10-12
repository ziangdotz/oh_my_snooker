# 算法结构对照

运行node scripts/verify-algorithms.mjs，对照当前维护源码与冻结PCOL；结果写入reports/validation/algorithm-structure.json。

reports/validation/architecture-migration-map.json由tooling/validation/algorithm-structure.mjs读取，登记冻结模块、当前工厂和提取类的映射。它是当前验证输入，路径与源文件必须同步维护。冻结内容保持原字节。

137项检查比较解析后的运算树和词法绑定，允许具名依赖、构造器命名、登记的资源引用及已有声明形式差异，保留算术分组、字面量、控制结构和运算。组合根整体及重写工具另需功能验证，不能仅凭结构通过推断任意装配拆分等价。

本地会话另明确记录两项接口整理：LocalGameModel 的内部方法改为 `_createLocalSessionData`，输入字段改为 userId / displayName；BaseGameModel 删除没有维护调用者的 getUserInfoData 占位方法。对照仅在这两个具名类中应用登记的成员改名或占位删除，其余语句、值和调用次序继续比较。本地启动身份、默认场景与设置恢复由 game-session-composition 单元测试和源码/构建浏览器启动验证，不将接口改名解释为逐字符等价。

碰撞网格加载器已改写为具有异常收尾和一次完成保证的I/O实现，退出preservedSources及原版AST等价对照；物理、规则和AI算法的对照范围保持。tests/unit/collision-mesh-loader.test.mjs验证解析、请求、碰撞体创建、贴图解码及法线扩展失败、并发队列推进、重试、共享贴图和重复回调。startup-recovery浏览器专项在源码、开发及生产版实际请求错误JSON，再加载真实碰撞资源。

单元入口为tests/unit/algorithm-structure.test.mjs。运行代码改变还须按[工作流](../development/workflow.md)执行完整浏览器对照和受影响专项。现有边界及工厂ABI见[架构](../architecture/overview.md)。
