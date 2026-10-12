# PCOL本地运行基准

game保存local-runtime-v1的完整离线程序，共90个文件；manifests/baseline.json登记逐文件大小与SHA-256。

冻结游戏及清单仅用于完整性和行为对照，不直接编辑、自动格式化或复制进当前交付。实际运行内容维护在src。工程路径由config/project.config.mjs管理；源码服务不读取此目录，构建服务通过/baseline/提供冻结程序。

游戏作者为Zhengxi Zhang，渲染引擎为Babylon.js；保留纯文字署名和第三方已有归属。校验入口为node scripts/verify.mjs，行为验证方法见[验证范围](../../docs/validation/README.md)。
