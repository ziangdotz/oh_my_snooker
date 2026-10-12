# 文件命名

维护文件、目录及模块ID使用英文小写kebab-case，名称表达职责或资源用途。浏览器模块使用.js，Node工具使用.mjs，测试使用.test.mjs，模板与样式使用.html/.css，着色器使用.vertex.fx/.fragment.fx，文档和报告使用.md/.json。

室内方案使用interior-design-original或三位编号，例如interior-design-001.js、interior-design-001-art.png。共享实现使用interior-design-builder和interior-design-registry等用途名称。共用素材只保存一份，不为不同方案重复复制。网格、材质和物理场景内部ID不属于文件改名范围。

README.md、AGENTS.md、CONTRIBUTING.md、package.json、package-lock.json及标准点文件保留生态名称。冻结game及baseline.json保留其原始名称、内容和哈希；依赖、包管理器及编辑器元数据由各自工具管理。build/development与dist由源码生成。

artifacts唯一产物分类是testing，按当前验证主题组织。node scripts/check-file-naming.mjs检查源码、脚本、工具、测试、配置、文档、报告和验证产物，并写入reports/validation/file-naming-audit.json；该检查已接入整体检查。
