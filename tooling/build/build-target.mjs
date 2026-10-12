import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from '../../config/project.config.mjs';
import { readBuildInputs } from './build-inputs.mjs';
import { BuildOutputError, verifyBuildDirectory } from './verify-build.mjs';
import {
  buildPaths,
  withBuildLock,
  recoverBuildOutput,
  publishBuildOutput,
  removeBuildPath,
} from './build-transaction.mjs';

async function generateBuild(targetName, paths, inputs) {
  const staging = await mkdtemp(path.join(paths.cache, `build-${targetName}-`));
  try {
    for (const [file, bytes] of inputs.outputs) {
      const output = path.join(staging, file);
      await mkdir(path.dirname(output), { recursive: true });
      await writeFile(output, bytes);
    }
    await writeFile(
      path.join(staging, 'build-manifest.json'),
      JSON.stringify(inputs.manifest, null, 2) + '\n',
    );
    await verifyBuildDirectory(staging, inputs);
    await publishBuildOutput(paths, staging);
    console.log(
      `Built ${targetName}: ${inputs.manifest.files.length} files from maintained runtime sources`,
    );
    return inputs.manifest;
  } finally {
    await removeBuildPath(paths.root, staging);
  }
}

/** 构建异常保留旧输出；root 参数让测试在独立目录使用同一实现。 */
export async function buildTarget(targetName = 'development', { root = ROOT } = {}) {
  const paths = buildPaths(targetName, root);
  return withBuildLock(paths, async () => {
    await recoverBuildOutput(paths);
    return generateBuild(targetName, paths, await readBuildInputs({ root: paths.root }));
  });
}

/** 启动前完整校验；仅输出过期/损坏可重建，输入失败和未知 I/O 错误停止。 */
export async function ensureBuild(targetName = 'development', { root = ROOT } = {}) {
  const paths = buildPaths(targetName, root);
  return withBuildLock(paths, async () => {
    await recoverBuildOutput(paths);
    const inputs = await readBuildInputs({ root: paths.root });
    try {
      await verifyBuildDirectory(paths.target, inputs);
      return { rebuilt: false };
    } catch (error) {
      if (!(error instanceof BuildOutputError)) {
        throw error;
      }
      console.log(`Rebuilding ${targetName}: ${error.message}`);
      await generateBuild(targetName, paths, inputs);
      return { rebuilt: true, reason: error.message };
    }
  });
}
