import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { ROOT } from '../../config/project.config.mjs';
import { filesIn, sha256 } from '../lib/integrity.mjs';
import { readBuildInputs } from '../build/build-inputs.mjs';

const generatedLinkRoots = ['artifacts/testing/', 'reports/measurement/', 'build/', 'dist/'];

/** Check maintained links; generated test evidence may be absent on a fresh checkout. */
export async function auditDocumentLinks(root = ROOT, documents) {
  const files = documents ?? [
    'README.md',
    'AGENTS.md',
    'CONTRIBUTING.md',
    'baselines/pcol/README.md',
    ...(await filesIn(path.join(root, 'docs')))
      .filter((file) => file.endsWith('.md'))
      .map((file) => 'docs/' + file),
  ];
  const links = [];
  const issues = [];
  for (const file of files) {
    const source = (await readFile(path.join(root, file), 'utf8')).replace(/```[\s\S]*?```/g, '');
    for (const match of source.matchAll(/\]\((<[^>]+>|[^\s)]+)(?:\s+"[^"]*")?\)/g)) {
      const reference = match[1].replace(/^<|>$/g, '');
      if (/^(?:[a-z]+:|\/\/)/i.test(reference)) {
        continue;
      }
      let target;
      try {
        const relative = decodeURIComponent(reference.split(/[?#]/)[0]);
        target = relative
          ? path
              .relative(root, path.resolve(root, path.dirname(file), relative))
              .split(path.sep)
              .join('/')
          : file;
        if (target === '..' || target.startsWith('../') || path.isAbsolute(target)) {
          throw new Error('Link leaves the project');
        }
      } catch (error) {
        issues.push({ file, reference, reason: error.message });
        continue;
      }
      const versionedMeasurement =
        target.startsWith('reports/measurement/') &&
        (target.endsWith('-summary.json') ||
          /^camera-rate-characterization.*\.json$/.test(path.posix.basename(target)));
      const generated =
        !versionedMeasurement && generatedLinkRoots.some((prefix) => target.startsWith(prefix));
      links.push({ from: file, to: target, generated });
      if (!generated) {
        try {
          await stat(path.join(root, target));
          const anchor = reference.includes('#')
            ? decodeURIComponent(reference.split('#').slice(1).join('#'))
            : '';
          if (anchor && target.endsWith('.md')) {
            const text = (await readFile(path.join(root, target), 'utf8')).replace(
              /```[\s\S]*?```/g,
              '',
            );
            const anchors = new Set();
            const counts = new Map();
            for (const heading of text.matchAll(/^ {0,3}#{1,6}\s+(.+)$/gm)) {
              const base = heading[1]
                .replace(/\s+#+\s*$/, '')
                .trim()
                .toLowerCase()
                .replace(/[^\p{L}\p{N}\p{M}_\s-]/gu, '')
                .replace(/\s/g, '-');
              const count = counts.get(base) ?? 0;
              anchors.add(base + (count ? '-' + count : ''));
              counts.set(base, count + 1);
            }
            for (const explicit of text.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) {
              anchors.add(explicit[1]);
            }
            if (!anchors.has(anchor)) {
              issues.push({ file, reference, reason: 'Missing document anchor' });
            }
          }
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
          issues.push({ file, reference, reason: 'Missing maintained link target' });
        }
      }
    }
  }
  return { documents: files.length, links, issues, passed: issues.length === 0 };
}

export function auditRuntimeReachability(catalog) {
  const modules = new Map(catalog.modules.map((entry) => [entry.id, entry]));
  const reached = new Set();
  function visit(id) {
    if (reached.has(id)) {
      return;
    }
    const entry = modules.get(id);
    if (!entry) {
      throw new Error('Unknown runtime dependency: ' + id);
    }
    reached.add(id);
    entry.dependencies.forEach(visit);
  }
  visit(catalog.entry);
  const unreachable = [...modules.keys()].filter((id) => !reached.has(id)).sort();
  return {
    modules: modules.size,
    reached: reached.size,
    unreachable,
    passed: unreachable.length === 0,
  };
}

export function auditPackageLock(packageInfo, lock) {
  const issues = [];
  const root = lock.packages?.[''];
  if (!/^npm@\d+\.\d+\.\d+$/.test(packageInfo.packageManager ?? '')) {
    issues.push('packageManager must record an exact npm version');
  }
  if (lock.lockfileVersion !== 3 || !root) {
    issues.push('Expected a version 3 package-lock.json with a root package');
  }
  if (lock.name !== packageInfo.name || lock.version !== packageInfo.version) {
    issues.push('Lockfile package identity differs from package.json');
  }
  const directDependencies = new Set();
  for (const type of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    const declared = packageInfo[type] ?? {};
    const locked = root?.[type] ?? {};
    for (const name of new Set([...Object.keys(declared), ...Object.keys(locked)])) {
      directDependencies.add(name);
      if (declared[name] !== locked[name]) {
        issues.push('Lockfile dependency declaration differs: ' + name);
      } else if (lock.packages?.['node_modules/' + name]?.version !== declared[name]) {
        issues.push('Locked direct dependency version differs: ' + name);
      }
    }
  }
  return {
    file: 'package-lock.json',
    packageManager: packageInfo.packageManager,
    directDependencies: directDependencies.size,
    lockedPackages: Object.keys(lock.packages ?? {}).filter(Boolean).length,
    issues,
    passed: issues.length === 0,
  };
}

/** Complement build validation with repository-facing maintenance checks. */
export async function auditProjectMaintenance(root = ROOT) {
  const input = await readBuildInputs({ root });
  const catalog = JSON.parse(
    await readFile(path.join(root, 'src/runtime/runtime-catalog.json'), 'utf8'),
  );
  const packageInfo = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const packageLock = auditPackageLock(
    packageInfo,
    JSON.parse(await readFile(path.join(root, 'package-lock.json'), 'utf8')),
  );
  const docs = await auditDocumentLinks(root);
  const runtime = auditRuntimeReachability(catalog);
  const references = new Set(input.manifest.references.map((reference) => reference.to));
  const unreferencedAssets = [...input.outputs.keys()]
    .filter((file) => file.startsWith('assets/') && !references.has(file))
    .sort();
  const commands = [];
  for (const [name, command] of Object.entries(packageInfo.scripts)) {
    const match = command.match(/^node ([a-z0-9/.-]+\.mjs)(?:\s|$)/);
    if (!match) {
      throw new Error('Unclassified package command: ' + name);
    }
    await stat(path.join(root, match[1]));
    commands.push({ name, entry: match[1] });
  }
  const retainedKernelDiagnostics = [];
  const ownSourceMarkers = [];
  for (const file of input.manifest.sourceFiles.map((file) => file.path)) {
    if (!file.endsWith('.js') || file.startsWith('src/third-party/')) {
      continue;
    }
    const source = await readFile(path.join(root, file), 'utf8');
    if (/(?:\b(?:TODO|FIXME)\b|FBLogin|first_name)/.test(source)) {
      (catalog.preservedSources.includes(file) ? retainedKernelDiagnostics : ownSourceMarkers).push(
        file,
      );
    }
  }
  return {
    schemaVersion: 1,
    date: new Date().toISOString(),
    passed:
      packageLock.passed &&
      docs.passed &&
      runtime.passed &&
      unreferencedAssets.length === 0 &&
      ownSourceMarkers.length === 0,
    sourceManifestSHA256: sha256(JSON.stringify(input.manifest.sourceFiles)),
    baselineManifestSHA256: input.manifest.baselineManifestSHA256,
    runtime,
    runtimeSourceFiles: input.manifest.sourceFiles.length,
    assetReferences: input.manifest.references.filter((reference) => reference.kind === 'asset')
      .length,
    unreferencedAssets,
    docs,
    commands,
    packageLock,
    retainedKernelDiagnostics,
    ownSourceMarkers,
    limitations: [
      'Reachability checks file and module references, not every branch or member inside retained algorithms.',
      'Generated evidence links may be absent on a fresh checkout and are not treated as maintained documentation inputs.',
      'Retained kernel diagnostics are reported explicitly; this audit does not change frozen physics behavior.',
    ],
  };
}
