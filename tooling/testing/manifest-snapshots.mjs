import { readFile } from 'node:fs/promises';
import { absolute, LAYOUT, BUILD_OUTPUTS } from '../../config/project.config.mjs';
import { sha256 } from '../lib/integrity.mjs';

/** Compact evidence makes a failed cross-run version guard diagnosable. */
export async function snapshotManifests() {
  const snapshots = {};
  for (const file of [
    LAYOUT.baselineManifest,
    ...Object.values(BUILD_OUTPUTS).map((output) => `${output}/build-manifest.json`),
  ]) {
    const bytes = await readFile(absolute(file));
    const manifest = JSON.parse(bytes.toString());
    snapshots[file] = {
      sha256: sha256(bytes),
      files: manifest.files,
      sources: manifest.sourceFiles ?? [],
      modulesSHA256: sha256(JSON.stringify(manifest.modules ?? [])),
      referencesSHA256: sha256(JSON.stringify(manifest.references ?? [])),
    };
  }
  return snapshots;
}

function changedFiles(before, after) {
  const oldFiles = new Map(before.map((file) => [file.path, file.sha256]));
  const newFiles = new Map(after.map((file) => [file.path, file.sha256]));
  return [...new Set([...oldFiles.keys(), ...newFiles.keys()])]
    .filter((file) => oldFiles.get(file) !== newFiles.get(file))
    .sort();
}

export function compareManifestSnapshots(before, after) {
  return Object.keys(before)
    .filter((file) => before[file].sha256 !== after[file]?.sha256)
    .map((file) => ({
      manifest: file,
      changedOutputs: changedFiles(before[file].files, after[file]?.files ?? []),
      changedSources: changedFiles(before[file].sources, after[file]?.sources ?? []),
      moduleCatalogChanged: before[file].modulesSHA256 !== after[file]?.modulesSHA256,
      referencesChanged: before[file].referencesSHA256 !== after[file]?.referencesSHA256,
    }));
}
