import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from '../../config/project.config.mjs';

export { ROOT };
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export async function filesIn(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      result.push(...(await filesIn(root, relative)));
    } else if (entry.isFile()) {
      result.push(relative);
    } else {
      throw new Error(`Non-regular baseline entry: ${relative}`);
    }
  }
  return result.sort();
}
/** 同时核对文件集合、字节数及哈希，拒绝缺失、多余或已修改的冻结文件。 */
export async function verifySnapshot(directory, manifestName, { root = ROOT } = {}) {
  const manifest = JSON.parse(await readFile(path.join(root, manifestName), 'utf8'));
  const actualFiles = await filesIn(path.join(root, directory));
  if (JSON.stringify(actualFiles) !== JSON.stringify(manifest.files.map((f) => f.path))) {
    throw new Error('Frozen file list differs from the manifest');
  }
  for (const file of manifest.files) {
    const bytes = await readFile(path.join(root, directory, file.path));
    if (bytes.length !== file.bytes || sha256(bytes) !== file.sha256) {
      throw new Error(`Frozen integrity failure: ${file.path}`);
    }
  }
  return manifest;
}
