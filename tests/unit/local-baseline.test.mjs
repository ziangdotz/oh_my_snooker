import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { absolute, LAYOUT } from '../../config/project.config.mjs';
import { verifySnapshot } from '../../tooling/lib/integrity.mjs';

test('local baseline is complete and includes offline startup, assets and plain-text credits', async () => {
  const manifest = await verifySnapshot(LAYOUT.baseline, LAYOUT.baselineManifest);
  assert.equal(manifest.baselineId, 'local-runtime-v1');
  const files = new Set(manifest.files.map((file) => file.path));
  for (const file of [
    'index.html',
    'res/index.js',
    'res/0.chunk.js',
    'res/1.chunk.js',
    'res/index.css',
    'compatibility/browser.js',
    ...['chrome', 'edge', 'firefox', 'safari'].map((name) => `res/browser-logos/${name}.png`),
  ]) {
    assert.ok(files.has(file), `Missing local runtime dependency: ${file}`);
  }
  const html = await readFile(absolute(`${LAYOUT.baseline}/index.html`), 'utf8');
  assert.match(html, /src="\.\/compatibility\/browser\.js"/);
  assert.match(html, /Created by Zhengxi Zhang/);
  assert.doesNotMatch(html, /window\.dataLayer|<a\b|(?:href|src)="https?:\/\//);
  const chunk = await readFile(absolute(`${LAYOUT.baseline}/res/1.chunk.js`), 'utf8');
  assert.match(chunk, /<span class="name">ZHENGXI ZHANG<\/span>/);
  assert.doesNotMatch(chunk, /<a class="name"|FOR MORE INFORMATIONS AND BUG REPORT/);
  assert.deepEqual(
    Object.keys(manifest).sort(),
    ['schemaVersion', 'baselineId', 'createdDate', 'purpose', 'files'].sort(),
  );
  assert.ok(
    manifest.files.every((file) => Object.keys(file).sort().join(',') === 'bytes,path,sha256'),
  );
});
