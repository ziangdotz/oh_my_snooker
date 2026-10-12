import path from 'node:path';
import { mkdir, open, readFile, rename, rm, realpath, lstat } from 'node:fs/promises';
import { ROOT, BUILD_TARGETS, BUILD_OUTPUTS, LAYOUT } from '../../config/project.config.mjs';
import { setTimeout as delay } from 'node:timers/promises';

export function buildPaths(targetName, root = ROOT) {
  if (!BUILD_TARGETS.includes(targetName)) {
    throw new Error('Unsupported build target');
  }
  const workspace = path.resolve(root);
  const cache = path.join(workspace, LAYOUT.cache);
  return {
    root: workspace,
    cache,
    target: path.join(workspace, BUILD_OUTPUTS[targetName]),
    backup: path.join(cache, `${targetName}.previous`),
    lock: path.join(cache, `${targetName}.lock`),
  };
}

/** 所有移动/递归删除前核对工作区范围，并拒绝经由目录链接写入。 */
export async function assertWorkspacePath(root, destination) {
  const workspace = path.resolve(root);
  const absolute = path.resolve(destination);
  const relative = path.relative(workspace, absolute);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Build path outside workspace: ${absolute}`);
  }
  const resolvedRoot = await realpath(workspace);
  let current = absolute;
  while (current !== workspace) {
    try {
      if ((await lstat(current)).isSymbolicLink()) {
        throw new Error(`Build path resolves through a link: ${current}`);
      }
      const resolved = await realpath(current);
      const expected = path.join(resolvedRoot, path.relative(workspace, current));
      if (resolved !== expected) {
        throw new Error(`Build path resolves through a link: ${current}`);
      }
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      current = path.dirname(current);
    }
  }
}

export async function pathExists(file) {
  try {
    await lstat(file);
    return true;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    return false;
  }
}

export async function removeBuildPath(root, directory) {
  await assertWorkspacePath(root, directory);
  await rm(directory, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

/** Bounded retries for short Windows file locks; other failures remain immediate. */
export async function moveBuildDirectory(
  root,
  from,
  to,
  { renameDirectory = rename, wait = delay } = {},
) {
  await assertWorkspacePath(root, from);
  await assertWorkspacePath(root, to);
  for (let attempt = 0; ; attempt++) {
    try {
      await renameDirectory(from, to);
      return;
    } catch (error) {
      if (attempt >= 3 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) {
        throw error;
      }
      await wait(50 * 2 ** attempt);
    }
  }
}

/** 同一目标互斥；异常退出留下的锁明确报错，避免误抢仍在运行的构建。 */
export async function withBuildLock(paths, work) {
  await assertWorkspacePath(paths.root, paths.cache);
  await mkdir(paths.cache, { recursive: true });
  await assertWorkspacePath(paths.root, paths.lock);
  let handle;
  try {
    handle = await open(paths.lock, 'wx');
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
    const owner = await readFile(paths.lock, 'utf8').catch(() => 'owner unavailable');
    const locked = new Error(
      `Build is locked (${owner.trim()}): ${paths.lock}. If the process has stopped, remove this lock and retry.`,
      { cause: error },
    );
    locked.code = 'EBUILDLOCK';
    throw locked;
  }
  try {
    await handle.writeFile(`pid=${process.pid}\n`);
    return await work();
  } finally {
    await handle.close();
    await rm(paths.lock);
  }
}

/** 前次恢复失败时保留备份；下一次构建先恢复，再生成新输出。 */
export async function recoverBuildOutput(paths) {
  await assertWorkspacePath(paths.root, paths.target);
  await assertWorkspacePath(paths.root, paths.backup);
  if (!(await pathExists(paths.backup))) {
    return;
  }
  if (await pathExists(paths.target)) {
    throw new Error(
      `Unfinished build backup requires inspection: ${paths.backup}; current output retained`,
    );
  }
  await mkdir(path.dirname(paths.target), { recursive: true });
  await moveBuildDirectory(paths.root, paths.backup, paths.target);
}

/** 发布失败即还原旧目录；恢复也失败时保留备份并报告其路径。 */
export async function publishBuildOutput(
  paths,
  staging,
  { renameDirectory = (from, to) => moveBuildDirectory(paths.root, from, to) } = {},
) {
  await assertWorkspacePath(paths.root, staging);
  await assertWorkspacePath(paths.root, paths.target);
  await assertWorkspacePath(paths.root, paths.backup);
  if (await pathExists(paths.backup)) {
    throw new Error(`Build backup already exists: ${paths.backup}`);
  }
  await mkdir(path.dirname(paths.target), { recursive: true });
  const hadOutput = await pathExists(paths.target);
  if (hadOutput) {
    await renameDirectory(paths.target, paths.backup);
  }
  try {
    await renameDirectory(staging, paths.target);
  } catch (error) {
    if (hadOutput) {
      try {
        await renameDirectory(paths.backup, paths.target);
      } catch (recoveryError) {
        throw new AggregateError(
          [error, recoveryError],
          `Build publish and recovery failed; previous output saved at ${paths.backup}`,
          { cause: recoveryError },
        );
      }
    }
    throw error;
  }
  if (hadOutput) {
    await removeBuildPath(paths.root, paths.backup);
  }
}
