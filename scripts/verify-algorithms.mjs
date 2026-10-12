import { writeFile } from 'node:fs/promises';
import { absolute } from '../config/project.config.mjs';
import { auditAlgorithmStructure } from '../tooling/validation/algorithm-structure.mjs';

const report = await auditAlgorithmStructure();
await writeFile(
  absolute('reports/validation/algorithm-structure.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(`Algorithm structures: ${report.passed} match; ${report.failed} differ`);
if (report.failed) {
  process.exitCode = 1;
}
