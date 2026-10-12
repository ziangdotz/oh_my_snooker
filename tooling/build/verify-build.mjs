import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { ROOT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import { filesIn, sha256 } from '../lib/integrity.mjs';
import { readBuildInputs } from './build-inputs.mjs';
import { buildPaths } from './build-transaction.mjs';

export class BuildOutputError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'BuildOutputError';
    this.code = 'EBUILDOUTPUT';
  }
}

/** 从已校验输入推导预期字节，拒绝过期清单、缺失/多余文件和输出损坏。 */
export async function verifyBuildDirectory(directory, inputs) {
  try {
    const manifest = JSON.parse(
      await readFile(path.join(directory, 'build-manifest.json'), 'utf8'),
    );
    if (!isDeepStrictEqual(manifest, inputs.manifest)) {
      throw new BuildOutputError('Build manifest differs from current maintained runtime sources');
    }
    const files = (await filesIn(directory)).filter((file) => file !== 'build-manifest.json');
    if (
      !isDeepStrictEqual(
        files,
        inputs.manifest.files.map((file) => file.path),
      )
    ) {
      throw new BuildOutputError('Build output has missing or unexpected files');
    }
    for (const file of manifest.files) {
      const bytes = await readFile(path.join(directory, file.path));
      if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
        throw new BuildOutputError(`Build output integrity failure: ${file.path}`);
      }
    }
    return manifest;
  } catch (error) {
    if (error instanceof SyntaxError || ['ENOENT', 'ENOTDIR'].includes(error.code)) {
      throw new BuildOutputError('Build output or manifest is missing or invalid', {
        cause: error,
      });
    }
    throw error;
  }
}

export async function verifyBuild(targetName, { root = ROOT } = {}) {
  buildPaths(targetName, root);
  const inputs = await readBuildInputs({ root });
  return verifyBuildDirectory(path.join(root, BUILD_OUTPUTS[targetName]), inputs);
}
