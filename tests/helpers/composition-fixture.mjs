import path from 'node:path';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parse } from 'espree';
import { ROOT } from '../../config/project.config.mjs';
import { compileFactoryModules } from '../../tooling/build/module-compiler.mjs';

/** Execute actual factory imports in an isolated DOM/engine test context. */
export function factoryContext(entry, globals = {}) {
  const sources = new Map();
  function visit(file) {
    if (sources.has(file)) {
      return;
    }
    const source = readFileSync(path.join(ROOT, file), 'utf8');
    sources.set(file, source);
    const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
    for (const statement of ast.body) {
      if (statement.type === 'ImportDeclaration') {
        visit(
          path.posix.normalize(path.posix.join(path.posix.dirname(file), statement.source.value)),
        );
      }
    }
  }
  visit(entry);
  const compiled = compileFactoryModules(sources, [entry]);
  return runInNewContext(
    `(() => { const sourceFactories = {}; ${compiled.code}\nreturn sourceFactories[${JSON.stringify(entry)}]; })()`,
    globals,
  );
}

/** Read scoped declarations, without evaluating unrelated game/engine initialization. */
export function compositionDeclarations(firstName, endName) {
  const source = readFileSync(path.join(ROOT, 'src/application/compose-game.js'), 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const body = ast.body.find((statement) => statement.type === 'ExportDefaultDeclaration')
    .declaration.body.body;
  const declares = (statement, name) =>
    statement.type === 'VariableDeclaration' &&
    statement.declarations.some((declaration) => declaration.id.name === name);
  const start = body.findIndex((statement) => declares(statement, firstName));
  const end = body.findIndex((statement, index) => index > start && declares(statement, endName));
  if (start < 0 || end < 0) {
    throw new Error(`Composition fixture boundary missing: ${firstName}..${endName}`);
  }
  return source.slice(body[start].range[0], body[end].range[0]);
}
