import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { ROOT, sha256 } from '../tooling/lib/integrity.mjs';

const args = process.argv.slice(2);
const directory = path.resolve(ROOT, 'reports/measurement');
const input = args.length === 1 ? path.resolve(ROOT, args[0]) : '';
if (
  !input ||
  path.dirname(input) !== directory ||
  !/^interior-performance-[a-z0-9-]+\.json$/.test(path.basename(input)) ||
  input.endsWith('-summary.json')
) {
  throw new Error(
    'Usage: node scripts/summarize-measurement.mjs reports/measurement/interior-performance-LABEL.json',
  );
}
const bytes = await readFile(input);
const report = JSON.parse(bytes);
if (!Array.isArray(report.samples)) {
  throw new Error('Expected an interior performance report with samples');
}
const summary = {
  ...report,
  schemaVersion: 1,
  sourceReport: path.relative(ROOT, input).split(path.sep).join('/'),
  sourceReportSHA256: sha256(bytes),
  samples: report.samples.map(({ frames, gpuMs, ...sample }) => ({
    ...sample,
    rawFrameCount: frames?.length ?? 0,
    rawGpuSampleCount: gpuMs?.length ?? 0,
  })),
};
const output = input.replace(/\.json$/, '-summary.json');
await writeFile(output, JSON.stringify(summary, null, 2) + '\n');
console.log('Measurement summary: ' + path.relative(ROOT, output).split(path.sep).join('/'));
