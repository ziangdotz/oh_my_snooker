import path from 'node:path';
import { parse } from 'espree';
import { analyze } from 'eslint-scope';
import { compileFactoryModules } from './module-compiler.mjs';
import { assertDependencyBoundary } from './dependency-boundaries.mjs';

export { assertDependencyBoundary } from './dependency-boundaries.mjs';

function walk(node, callback) {
  if (!node || typeof node !== 'object') {
    return;
  }
  if (node.type) {
    callback(node);
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'range') {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((child) => walk(child, callback));
    } else if (value && typeof value === 'object') {
      walk(value, callback);
    }
  }
}

export function assertRuntimePath(file) {
  if (
    typeof file !== 'string' ||
    !/^[a-z0-9][a-z0-9/.-]*$/.test(file) ||
    file.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error(`Invalid runtime path: ${file}`);
  }
  if (
    file
      .split('/')
      .some(
        (part) =>
          !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)*$/.test(part) ||
          /^[a-f0-9]{32}\./.test(part),
      )
  ) {
    throw new Error(`Runtime path must use semantic kebab-case names: ${file}`);
  }
}

export function assembleRuntime(catalog, sources) {
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.modules)) {
    throw new Error('Invalid runtime catalog');
  }
  const modules = new Map();
  const moduleSources = new Set();
  const references = [];
  for (const entry of catalog.modules) {
    assertRuntimePath(entry.id);
    assertRuntimePath(entry.source);
    if (
      !['factory', 'asset', 'template'].includes(entry.kind ?? 'factory') ||
      !Array.isArray(entry.dependencies)
    ) {
      throw new Error(`Invalid runtime module descriptor: ${entry.id}`);
    }
    if (!entry.source.startsWith('src/')) {
      throw new Error(`Module source outside maintained runtime: ${entry.source}`);
    }
    if (
      modules.has(entry.id) ||
      moduleSources.has(entry.source) ||
      !Object.hasOwn(catalog.bundles, entry.bundle)
    ) {
      throw new Error(`Duplicate module or invalid bundle: ${entry.id}`);
    }
    if (!sources.has(entry.source)) {
      throw new Error(`Missing module source: ${entry.source}`);
    }
    modules.set(entry.id, entry);
    moduleSources.add(entry.source);
  }
  if (!modules.has(catalog.entry) || modules.get(catalog.entry).bundle !== 'bootstrap') {
    throw new Error('Missing bootstrap entry');
  }
  for (const entry of modules.values()) {
    const dependencies = new Set();
    const ast = parse(sources.get(entry.source), {
      ecmaVersion: 'latest',
      sourceType: 'module',
      range: true,
    });
    const factory = ast.body.find((node) => node.type === 'ExportDefaultDeclaration')?.declaration;
    const scope = analyze(ast, { ecmaVersion: 2022, sourceType: 'module' }).acquire(factory);
    const loaderParameter = factory?.params?.[2];
    const loaderReferences = new Set(
      scope?.set.get(loaderParameter?.name)?.references.map((reference) => reference.identifier) ??
        [],
    );
    walk(ast, (node) => {
      if (node.type === 'CallExpression' && loaderReferences.has(node.callee)) {
        if (typeof node.arguments[0]?.value === 'string') {
          dependencies.add(node.arguments[0].value);
        } else if (!entry.source.startsWith('src/third-party/')) {
          throw new Error(`Runtime dependencies must be static named IDs: ${entry.id}`);
        }
      }
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        loaderReferences.has(node.callee.object) &&
        node.callee.property.name === 'e'
      ) {
        if (!Object.hasOwn(catalog.bundles, node.arguments[0]?.value)) {
          throw new Error(`Unknown lazy runtime bundle: ${entry.id}`);
        }
      }
    });
    if (
      JSON.stringify([...dependencies].sort()) !== JSON.stringify([...entry.dependencies].sort())
    ) {
      throw new Error(`Dependency catalog differs from source: ${entry.id}`);
    }
    for (const id of dependencies) {
      const target = modules.get(id);
      if (!target) {
        throw new Error(`Missing runtime dependency: ${entry.id} -> ${id}`);
      }
      assertDependencyBoundary(entry.source, target.source);
      references.push({ from: entry.source, to: target.source, kind: 'runtime-module' });
    }
  }
  const outputs = new Map();
  const usedSources = new Set();
  for (const [bundle, output] of Object.entries(catalog.bundles)) {
    assertRuntimePath(output);
    if (!output.startsWith('scripts/') || !output.endsWith('.js') || outputs.has(output)) {
      throw new Error(`Invalid or duplicate bundle output: ${output}`);
    }
    const entries = catalog.modules.filter((entry) => entry.bundle === bundle);
    const files = entries.map((entry) => entry.source);
    if (bundle === 'bootstrap') {
      files.push('src/runtime/module-loader.js');
    }
    const compiled = compileFactoryModules(sources, files);
    compiled.files.forEach((file) => usedSources.add(file));
    for (const reference of compiled.references) {
      assertDependencyBoundary(reference.from, reference.to);
      references.push(reference);
    }
    const registrations = entries
      .map(
        (entry) => `${JSON.stringify(entry.id)}: sourceFactories[${JSON.stringify(entry.source)}]`,
      )
      .join(',\n');
    const header =
      '// Built from maintained ES modules. Edit src/, then rebuild.\n(function () {\nconst sourceFactories = Object.create(null);\n';
    let tail;
    if (bundle === 'bootstrap') {
      const paths = Object.fromEntries(
        Object.entries(catalog.bundles).map(([id, file]) => [id, './' + file]),
      );
      tail = `const moduleLoader = sourceFactories["src/runtime/module-loader.js"](${JSON.stringify(paths)});\nwindow.SnookerRuntime = Object.freeze({ register: moduleLoader.register });\nmoduleLoader.register("bootstrap", {${registrations}});\nmoduleLoader.require(${JSON.stringify(catalog.entry)});\n`;
    } else {
      tail = `window.SnookerRuntime.register(${JSON.stringify(bundle)}, {${registrations}});\n`;
    }
    outputs.set(output, Buffer.from(header + compiled.code + tail + '})();\n'));
  }
  for (const file of sources.keys()) {
    if (file.endsWith('.js') && !usedSources.has(file)) {
      throw new Error(`Unregistered runtime source: ${file}`);
    }
  }
  const preserved = catalog.preservedSources ?? [];
  if (
    new Set(preserved).size !== preserved.length ||
    preserved.some(
      (file) =>
        !usedSources.has(file) ||
        file.startsWith('src/runtime/') ||
        file.startsWith('src/compatibility/'),
    )
  ) {
    throw new Error('Invalid preserved algorithm source whitelist');
  }
  return { outputs, references, sourceFiles: [...usedSources].sort() };
}

/** Resolve static HTML, CSS, model texture and asset binding references before publication. */
export function verifyAssetReferences(outputs, sources) {
  const references = [];
  function verify(from, reference, base = path.posix.dirname(from)) {
    const file = reference.split(/[?#]/)[0];
    if (!file || /^(?:data:|blob:|https?:|\/\/|#)/.test(reference)) {
      if (/^(?:https?:|\/\/)/.test(reference)) {
        throw new Error(`External runtime asset: ${from} -> ${reference}`);
      }
      return;
    }
    const resolved = path.posix.normalize(path.posix.join(base, file));
    if (!outputs.has(resolved)) {
      throw new Error(`Missing asset reference: ${from} -> ${reference}`);
    }
    references.push({ from, to: resolved, kind: 'asset' });
  }
  for (const [file, bytes] of outputs) {
    const text = bytes.toString('utf8');
    if (file.endsWith('.html')) {
      for (const match of text.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)) {
        verify(file, match[1]);
      }
    } else if (file.endsWith('.css')) {
      for (const match of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/g)) {
        verify(file, match[1]);
      }
    } else if (file.endsWith('.babylon')) {
      const model = JSON.parse(text);
      for (const material of model.materials ?? []) {
        for (const [key, value] of Object.entries(material)) {
          if (key.endsWith('Texture') && value?.name) {
            verify(file, value.name);
          }
        }
      }
    } else if (file.startsWith('assets/collision/') && file.endsWith('.json')) {
      for (const group of Object.values(JSON.parse(text))) {
        if (group.nt) {
          verify(file, group.nt);
        }
      }
    }
  }
  for (const [file, source] of sources) {
    const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
    walk(ast, (node) => {
      if (
        node.type === 'NewExpression' &&
        node.callee.type === 'MemberExpression' &&
        node.callee.property.name === 'UiShaderMaterial' &&
        typeof node.arguments[2]?.value === 'string'
      ) {
        const program = node.arguments[2].value;
        verify(file, `assets/shaders/${program}.vertex.fx`, '.');
        verify(file, `assets/shaders/${program}.fragment.fx`, '.');
      }
      if (node.type === 'Literal' && typeof node.value === 'string') {
        if (/^(?:\.\/)?assets\/.+\.[a-z0-9]+$/.test(node.value)) {
          verify(file, node.value, '.');
        }
        for (const match of node.value.matchAll(
          /(?:src|href)=["']((?:\.\/)?assets\/[^"']+)["']/g,
        )) {
          verify(file, match[1], '.');
        }
      }
      if (
        file === 'src/domain/scene/scene-definitions.js' &&
        node.type === 'Property' &&
        (node.key.name ?? node.key.value) === 'rgb' &&
        typeof node.value.value === 'string'
      ) {
        verify(file, node.value.value, 'assets/collision');
      }
    });
  }
  return references;
}
