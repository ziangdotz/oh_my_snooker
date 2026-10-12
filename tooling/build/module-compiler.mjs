import path from 'node:path';
import { parse } from 'espree';
import { assertDependencyBoundary } from './dependency-boundaries.mjs';

/** Small ESM compiler: default factories and default relative imports only. */
export function compileFactoryModules(sources, entryPaths) {
  const emitted = new Map();
  const active = new Set();
  const references = [];

  function visit(file) {
    if (emitted.has(file)) {
      return;
    }
    if (active.has(file)) {
      throw new Error(`Circular source import: ${file}`);
    }
    active.add(file);
    const source = sources.get(file);
    if (source === undefined) {
      throw new Error(`Missing module source: ${file}`);
    }
    const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
    const imports = [];
    let factory;
    for (const statement of ast.body) {
      if (statement.type === 'ImportDeclaration') {
        if (!statement.source.value.startsWith('./') && !statement.source.value.startsWith('../')) {
          throw new Error(`Source import must be relative: ${file}`);
        }
        if (
          statement.specifiers.length !== 1 ||
          statement.specifiers[0].type !== 'ImportDefaultSpecifier'
        ) {
          throw new Error(`Only default factory imports are supported: ${file}`);
        }
        const target = path.posix.normalize(
          path.posix.join(path.posix.dirname(file), statement.source.value),
        );
        if (!target.startsWith('src/')) {
          throw new Error(`Import outside runtime sources: ${file} -> ${target}`);
        }
        assertDependencyBoundary(file, target);
        visit(target);
        references.push({ from: file, to: target, kind: 'esm-import' });
        imports.push(
          `const ${statement.specifiers[0].local.name} = sourceFactories[${JSON.stringify(target)}];`,
        );
      } else if (statement.type === 'ExportDefaultDeclaration' && !factory) {
        if (!['FunctionDeclaration', 'FunctionExpression'].includes(statement.declaration.type)) {
          throw new Error(`Default export must be a factory function: ${file}`);
        }
        factory = source.slice(...statement.declaration.range);
      } else {
        throw new Error(`Unsupported top-level source declaration: ${file}`);
      }
    }
    if (!factory) {
      throw new Error(`Missing default factory export: ${file}`);
    }
    emitted.set(
      file,
      `// ${file}\nsourceFactories[${JSON.stringify(file)}] = (() => {\n${imports.join('\n')}\nreturn ${factory};\n})();\n`,
    );
    active.delete(file);
  }
  entryPaths.forEach(visit);
  return { code: [...emitted.values()].join('\n'), files: [...emitted.keys()], references };
}
