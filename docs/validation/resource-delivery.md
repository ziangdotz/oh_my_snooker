# 当前本地资源交付

源码服务src/start.mjs只读取src并依赖Node内置模块。构建服务tooling/server/static-server.mjs提供当前开发输出及冻结基准路由，先验证路径范围和资源元信息，保留MIME、CSP和no-store策略。

构建服务HEAD只查询元信息，不读取正文；GET从同一个句柄获取大小并流式传输，单次源读取最多64KiB，传输范围限制为查询到的文件大小。发送200前读取首块，首读失败保留404/500语义；后续pipeline处理背压、错误与字节校验。读取失败、提前EOF或客户端断开时释放句柄并关闭不完整响应。

tests/integration/static-server.test.mjs核对真实资源GET哈希及HEAD响应；static-streaming.test.mjs以隔离大文件验证并发、块大小、空文件、打开/读取错误、提前EOF及不同阶段断开。测试注入不进入运行游戏。

node scripts/measure-loading.mjs --label current --runs 5测量现有构建从导航到菜单/Practice就绪的耗时，记录写入reports/measurement/loading-current.json。该值含浏览器调度和缓存条件，不包含构建或Node启动，也不直接证明跨设备提速或GPU性能。
