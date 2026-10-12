import fs from 'node:fs';
import assert from 'node:assert/strict';
import { parse } from 'espree';
import { analyze } from 'eslint-scope';
import { absolute, LAYOUT } from '../../config/project.config.mjs';
import { sha256, verifySnapshot } from '../lib/integrity.mjs';
export async function auditAlgorithmStructure() {
  await verifySnapshot(LAYOUT.baseline, LAYOUT.baselineManifest);
  const options = { ecmaVersion: 'latest', range: true, sourceType: 'module' };
  const metadata = JSON.parse(
    fs.readFileSync(absolute('reports/validation/architecture-migration-map.json')),
  );
  assert.equal(
    metadata.baselineManifestSHA256,
    sha256(fs.readFileSync(absolute(LAYOUT.baselineManifest))),
    'Migration ledger does not describe this baseline',
  );
  const catalog = JSON.parse(fs.readFileSync(absolute(LAYOUT.runtimeCatalog)));
  const classes = new Map(
    metadata.classModules.map((entry) => [
      entry.previousSymbol,
      [entry.source.slice(4, -3), entry.className],
    ]),
  );
  const aliases = new Map(Object.entries(metadata.aliases));
  for (const [old, [, name]] of classes) {
    aliases.set(old, name);
  }
  const ids = new Map(metadata.modules.map((m) => [m.previousId, m.id]));
  ids.set(88, 'presentation/diagnostics/metric-chart');
  ids.set(89, 'presentation/diagnostics/monitor-view');
  const originalFactories = new Map();
  for (const file of ['res/index.js', 'res/0.chunk.js', 'res/1.chunk.js']) {
    const source = fs.readFileSync(absolute(LAYOUT.baseline + '/' + file), 'utf8');
    const ast = parse(source, { ...options, sourceType: 'script' });
    let call = ast.body.at(-1).expression;
    if (call.type === 'UnaryExpression') {
      call = call.argument;
    }
    const group = file === 'res/index.js' ? call.arguments[0] : call.arguments[0].elements[1];
    const entries =
      group.elements?.map((node, id) => ({ node, id })) ??
      group.properties.map((p) => ({ node: p.value, id: p.key.value }));
    for (const { node, id } of entries) {
      if (node) {
        const text = '(' + source.slice(...node.range) + ')';
        const parsed = parse(text, { ...options, sourceType: 'script' });
        originalFactories.set(id, { ast: parsed, root: parsed.body[0].expression });
      }
    }
  }
  function normalizer(ast, root, original, classMode = false, memberRenames = {}) {
    const manager = analyze(ast, { ecmaVersion: 2022, sourceType: ast.sourceType });
    const resolutions = new Map();
    const within = (n) => n?.range && n.range[0] >= root.range[0] && n.range[1] <= root.range[1];
    const variables = manager.scopes.flatMap((s) => s.variables);
    const namedClassIds = new Set();
    const factoryId = !classMode && root.id?.range[0];
    function scan(n) {
      if (!n || typeof n !== 'object') {
        return;
      }
      if (n.type === 'ClassExpression' && n.id) {
        namedClassIds.add(n.id.range[0]);
      }
      for (const [k, v] of Object.entries(n)) {
        if (k !== 'range') {
          if (Array.isArray(v)) {
            v.forEach(scan);
          } else if (v && typeof v === 'object') {
            scan(v);
          }
        }
      }
    }
    scan(root);
    const offsets = [
      ...new Set(
        variables.flatMap((v) =>
          v.identifiers
            .filter(
              (id) =>
                within(id) &&
                id.range[0] !== factoryId &&
                !(classMode && id === root.id) &&
                !(namedClassIds.has(id.range[0]) && !v.references.length),
            )
            .map((id) => id.range[0]),
        ),
      ),
    ].sort((a, b) => a - b);
    const tags = new Map(offsets.map((offset, index) => [offset, 'local:' + index]));
    for (const variable of variables) {
      let tag;
      const definition = variable.identifiers.find(within);
      if (classMode && variable.identifiers.includes(root.id)) {
        tag = 'self';
      } else if (definition && tags.has(definition.range[0])) {
        tag = tags.get(definition.range[0]);
      } else if (
        classMode &&
        variable.identifiers.length &&
        variable.identifiers.every((id) => !within(id))
      ) {
        tag =
          'external:' + (original ? (aliases.get(variable.name) ?? variable.name) : variable.name);
      } else if (variable.name === 'arguments') {
        tag = 'arguments';
      }
      for (const id of [...variable.identifiers, ...variable.references.map((r) => r.identifier)]) {
        if (within(id)) {
          resolutions.set(id, tag ?? 'global:' + variable.name);
        }
      }
    }
    for (const scope of manager.scopes) {
      for (const reference of scope.references) {
        if (within(reference.identifier) && !reference.resolved) {
          resolutions.set(reference.identifier, 'global:' + reference.identifier.name);
        }
      }
    }
    const normalize = (node, parent, key) => {
      if (Array.isArray(node)) {
        return node.map((n) => normalize(n, parent, key));
      }
      if (!node || typeof node !== 'object') {
        return node;
      }
      if (
        classMode &&
        !original &&
        node.type === 'MemberExpression' &&
        node.object.name === 'dependencies' &&
        !node.computed
      ) {
        return { type: 'Identifier', symbol: 'external:' + node.property.name };
      }
      if (node.type === 'Identifier') {
        const property =
          (key === 'property' && parent.type === 'MemberExpression' && !parent.computed) ||
          (key === 'key' &&
            ['Property', 'MethodDefinition'].includes(parent.type) &&
            !parent.computed);
        return {
          type: 'Identifier',
          symbol: property
            ? 'property:' +
              (original && Object.hasOwn(memberRenames, node.name)
                ? memberRenames[node.name]
                : node.name)
            : (resolutions.get(node) ?? 'global:' + node.name),
        };
      }
      if (node.type === 'Literal') {
        let value = node.value;
        if (
          original &&
          parent?.type === 'CallExpression' &&
          parent.arguments[0] === node &&
          root.params?.[2] &&
          resolutions.get(parent.callee) === resolutions.get(root.params[2]) &&
          typeof value === 'number'
        ) {
          value = ids.get(value);
        }
        if (original && value === 'powerview') {
          value = 'power-view';
        }
        if (original && value === 'planebatch') {
          value = 'plane-batch';
        }
        if (original && value === 'tiger-club-sno-rgb.json') {
          value = 'tiger-club-collision.json';
        }
        if (original && value === './res/') {
          value =
            parent?.left?.property?.name === 'rgb' ? './assets/collision/' : './assets/shaders/';
        }
        return { type: 'Literal', value, regex: node.regex };
      }
      if (node.type === 'SequenceExpression' || node.type === 'LogicalExpression') {
        const operands = [];
        const flatten = (value) => {
          if (
            value.type === node.type &&
            (node.type === 'SequenceExpression' || value.operator === node.operator)
          ) {
            (value.expressions ?? [value.left, value.right]).forEach(flatten);
          } else {
            operands.push(normalize(value, node, 'operand'));
          }
        };
        flatten(node);
        return { type: node.type, operator: node.operator, operands };
      }
      const result = {};
      for (const [field, value] of Object.entries(node)) {
        if (['range', 'loc', 'raw', 'start', 'end'].includes(field)) {
          continue;
        }
        if (field === 'id' && (node === root || node.type === 'ClassExpression')) {
          continue;
        }
        if (field === 'kind' && node.type === 'VariableDeclaration') {
          continue;
        }
        result[field] =
          field === 'type' && node === root
            ? classMode
              ? 'Class'
              : 'Function'
            : normalize(value, node, field);
      }
      return result;
    };
    return normalize(root);
  }
  const results = [];
  const presentationChanges = {
    'presentation/ui/content-panel': {
      methods: ['_createLoadingIcon', 'loading'],
      fields: ['_loadingIcon'],
      reason: 'Unused content spinner removed; active message/template behavior remains compared.',
    },
    'application/snooker-application': {
      methods: ['showLoading', 'hideLoading'],
      fields: ['_loadingView'],
      reason:
        'Internal wait display uses the current loading surface; other application behavior remains compared.',
    },
  };
  const sessionChanges = {
    'application/models/base-game-model': {
      methods: ['getUserInfoData'],
      fields: [],
      reason:
        'Unused local/remote user lookup stub removed; no maintained caller used this method.',
    },
    'application/models/local-game-model': {
      methods: [],
      fields: [],
      memberRenames: {
        _gameLaunchResponseWithFBLoginData: '_createLocalSessionData',
        first_name: 'displayName',
        id: 'userId',
      },
      reason:
        'Local launch uses named local identity fields; restored values and timing are unchanged.',
    },
  };
  function omitRetiredParts(root, change) {
    root.body.body = root.body.body.filter((method) => !change.methods.includes(method.key.name));
    function visit(node) {
      if (!node || typeof node !== 'object') {
        return;
      }
      if (node.type === 'SequenceExpression') {
        node.expressions = node.expressions.filter(
          (expression) =>
            !(
              expression.type === 'AssignmentExpression' &&
              expression.left.type === 'MemberExpression' &&
              expression.left.object.type === 'ThisExpression' &&
              change.fields.includes(expression.left.property.name)
            ),
        );
      }
      for (const value of Object.values(node)) {
        if (Array.isArray(value)) {
          value.forEach(visit);
        } else if (value && typeof value === 'object') {
          visit(value);
        }
      }
    }
    visit(root);
  }
  const originalMain = originalFactories.get(10);
  for (const [symbol, [file]] of classes) {
    if (file === 'presentation/ui/about-dialog') {
      assert.equal(fs.existsSync(absolute('src/' + file + '.js')), false);
      assert.equal(catalog.preservedSources.includes('src/' + file + '.js'), false);
      results.push({
        source: 'src/' + file + '.js',
        kind: 'retired-presentation',
        passed: true,
        reason:
          'Unused original About dialog deleted; the active About drawer has browser coverage.',
      });
      continue;
    }
    const before = originalMain.root.body.body.find(
      (n) => n.type === 'ClassDeclaration' && n.id.name === symbol,
    );
    const afterAst = parse(fs.readFileSync(absolute('src/' + file + '.js'), 'utf8'), options);
    const after = afterAst.body
      .find((n) => n.type === 'ExportDefaultDeclaration')
      .declaration.body.body.find((n) => n.type === 'ReturnStatement').argument;
    const presentationChange = presentationChanges[file];
    const sessionChange = sessionChanges[file];
    const change = presentationChange ?? sessionChange;
    if (change) {
      omitRetiredParts(before, change);
      omitRetiredParts(after, change);
    }
    try {
      assert.deepEqual(
        normalizer(afterAst, after, false, true),
        normalizer(originalMain.ast, before, true, true, sessionChange?.memberRenames),
      );
      results.push({
        source: 'src/' + file + '.js',
        kind: 'class',
        passed: true,
        normalizedSHA256: sha256(JSON.stringify(normalizer(afterAst, after, false, true))),
        ...(presentationChange ? { presentationChange } : {}),
        ...(sessionChange ? { sessionChange } : {}),
      });
    } catch (error) {
      results.push({ source: 'src/' + file + '.js', kind: 'class', passed: false });
    }
  }
  for (const entry of catalog.modules) {
    if (
      !catalog.preservedSources.includes(entry.source) ||
      entry.id === 'application/compose-game'
    ) {
      continue;
    }
    const previous = metadata.modules.find((m) => ids.get(m.previousId) === entry.id);
    if (!previous) {
      throw new Error(entry.id);
    }
    const before = originalFactories.get(previous.previousId);
    const afterAst = parse(fs.readFileSync(absolute(entry.source), 'utf8'), options);
    const after = afterAst.body.find((n) => n.type === 'ExportDefaultDeclaration').declaration;
    try {
      assert.deepEqual(
        normalizer(afterAst, after, false),
        normalizer(before.ast, before.root, true),
      );
      results.push({
        source: entry.source,
        kind: 'factory',
        passed: true,
        normalizedSHA256: sha256(JSON.stringify(normalizer(afterAst, after, false))),
      });
    } catch (error) {
      results.push({ source: entry.source, kind: 'factory', passed: false });
    }
  }
  const report = {
    baselineManifestSHA256: metadata.baselineManifestSHA256,
    schemaVersion: 1,
    date: new Date().toISOString(),
    method:
      'Compare operation ASTs after normalizing lexical symbol identity, explicit dependency transport, constructor/factory names and enumerated resource paths. Ignore formatting, retained declaration-kind changes, and associative logical/sequence grouping; arithmetic grouping is preserved.',
    results,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    limitations: [
      'Composition and rewritten utilities require independent functional tests. This structural check does not prove arbitrary runtime behavior or reflection equality.',
      'The rewritten collision-mesh loader is excluded from baseline AST equivalence; its loading, failure, queue, normal-map and retry contracts are covered by tests/unit/collision-mesh-loader.test.mjs.',
      'Local-session member renames and the retired unused user lookup are scoped to the two named session classes and reported separately; functional startup is verified independently.',
    ],
  };
  return report;
}
