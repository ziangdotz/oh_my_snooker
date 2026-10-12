# 开发约定

新增功能或修复先明确触发步骤和预期结果，按 [架构](docs/architecture/overview.md) 选择维护位置。

1. 自主运行代码写入 src/，工程实现写入 tooling/，命令入口写入 scripts/。
2. 遵循 [代码规范](docs/development/coding-standards.md)，不手工编辑生成输出或冻结基准。
3. 安装依赖使用 npm ci，新增依赖固定版本并更新锁文件。
4. 按 [开发流程的验证矩阵](docs/development/workflow.md#按修改选择验证) 执行检查；运行代码、资源、兼容或构建规则变化执行npm run check:browser及对应专项，纯文档核对格式、命名和链接。
5. 记录问题、用户行为、结果和限制；优化实验使用 docs/templates/experiment.md。

完整命令见 [开发流程](docs/development/workflow.md)。当前工程只保留本地运行及维护所需内容。

模块可达性、资产闭包、文档链接、命令入口及 npm 锁文件一致性由 `npm run check:maintenance` 检查，并已接入整体检查。ESM 导入与具名工厂依赖遵守相同分层约束。

Git 提交范围、资源字节保护和首次提交步骤见[仓库维护约定](docs/development/repository-workflow.md)。提交描述应说明具体触发问题、最终行为、执行的验证和实际限制；保持一项变更可单独审查。
