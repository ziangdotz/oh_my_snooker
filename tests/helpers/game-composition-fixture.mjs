import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { parse } from 'espree';
import { ROOT } from '../../config/project.config.mjs';
import { factoryContext } from './composition-fixture.mjs';

/** Exercise the root's real wiring and real factories, with observable external services. */
export function gameComposition({ name, entry, inputs = {}, globals = {} }) {
  const source = readFileSync(path.join(ROOT, 'src/application/compose-game.js'), 'utf8');
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });
  const calls = [];
  function walk(node) {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (node.type === 'CallExpression' && node.callee.name === name) {
      calls.push(node);
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === 'range') {
        continue;
      }
      if (Array.isArray(value)) {
        value.forEach(walk);
      } else if (value && typeof value === 'object') {
        walk(value);
      }
    }
  }
  walk(ast);
  if (calls.length !== 1) {
    throw new Error('Expected one composition call: ' + name + '; found ' + calls.length);
  }
  const [call] = calls;
  const imported = ast.body.find(
    (node) => node.type === 'ImportDeclaration' && node.specifiers[0]?.local.name === name,
  );
  const actualEntry =
    imported && path.posix.normalize(path.posix.join('src/application', imported.source.value));
  if (actualEntry !== entry) {
    throw new Error('Composition import differs: ' + name + '; found ' + actualEntry);
  }
  const dependencies = runInNewContext('(' + source.slice(...call.arguments[0].range) + ')', {
    ...globals,
    ...inputs,
  });
  return factoryContext(actualEntry, globals)(dependencies);
}
