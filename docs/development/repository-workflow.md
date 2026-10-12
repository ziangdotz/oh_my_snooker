# 仓库维护与提交

当前工程可以在没有 Git 的目录中运行和验证。本说明用于首次建立仓库及后续提交；工程检查不会初始化真实仓库、配置远程地址或自动提交。

## 提交内容

维护源码 src、冻结对照 baselines、配置、命令、tooling、测试、文档、pnpm-lock.yaml 和 reports/validation 一起提交。架构映射 `reports/validation/architecture-migration-map.json` 是算法检查输入，必须保留。验证报告记录对应日期和源码，不把旧报告当成当前版本复测。

node_modules、包管理器缓存、build、dist、.cache、浏览器截图和逐帧测量数组不提交。reports/measurement 中的 `*-summary.json` 与相机时间刻画例外保留：它们提供可审查的统计及测量条件。原始测量数据可以留在本地，用专题命令重新生成；室内性能摘要使用 `node scripts/summarize-measurement.mjs reports/measurement/interior-performance-LABEL.json` 生成。

`.env`、`.env.*` 和 `*.local` 是本地覆盖文件，不进入提交；去掉敏感值的示例文件可以提交。现有运行代码不需要环境凭据。

## 字节与换行

自主 JavaScript、Node 脚本、文档、JSON、CSS、HTML 与着色器使用 LF；Windows `.cmd` 使用 CRLF。.editorconfig、Prettier 与 .gitattributes 分别约束编辑、格式检查和 Git 检出。

冻结目录、src/third-party 与 src/assets 使用 `-text` 保持原始字节，避免自动换行转换导致基准、引擎或模型数据哈希漂移。`tests/integration/repository-hygiene.test.mjs` 在独立临时仓库中暂存并实际重新检出这些文件，即使 `core.autocrlf=true` 也必须逐文件保持哈希；测试不操作项目真实 Git 状态。

## 首次提交

1. 阅读 [架构](../architecture/overview.md)、[维护边界](../architecture/composition-root-assessment.md)和[开发流程](workflow.md)。
2. 安装 package.json 指定版本的 pnpm，运行 `pnpm install --frozen-lockfile`；运行 `pnpm check:browser` 及修改涉及的专项。
3. 明确本次提交包含的源码与有效证据，检查 src 独立复制启动、冻结基准完整性和新增行为。
4. 确定需要建立仓库时再执行 `git init -b main`。运行 `git status --short --ignored` 检查目录分类，暂存维护文件后检查 `git diff --cached --stat` 和 `git diff --cached --check`。
5. 人工核对暂存内容、署名及验证结果后创建本地提交。提交信息描述实际问题和结果；远程地址、发布范围和推送另行确定。

## 署名与维护范围

现有作者和组件署名保存在 [third-party/notices.txt](../../src/third-party/notices.txt)、游戏 About 及独立冻结基准中。该署名文件明确只记录已有归属，没有新增许可授权。当前工程没有指定统一项目许可证；本次工程整理不代填许可证、不改写现有署名。

保留工厂 ABI、冻结对照和当前仍被继承的基础控制器是现有运行契约。无调用且被替代的实现应删除；有实际引用的基础类不按文件年龄删除。第三方升级、物理数学重写和网络服务属于独立行为变更，需对应证据。

## 持续检查

`pnpm check:maintenance` 校验模块可达性、资产引用、文档本地链接与命令入口，报告写入 reports/validation/project-maintenance.json，已加入整体检查。该检查区分维护输入与可缺省的生成证据；它不证明保留算法中的每个成员都被调用。

开发者按照[验证矩阵](workflow.md#按修改选择验证)选择专项。浏览器、硬件条件及完整比赛覆盖仍需结合[验证限制](../validation/README.md#限制)解释。
