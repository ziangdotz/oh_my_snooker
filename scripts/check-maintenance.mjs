import { mkdir, writeFile } from 'node:fs/promises';
import { absolute } from '../config/project.config.mjs';
import { auditProjectMaintenance } from '../tooling/validation/project-maintenance.mjs';

if (process.argv.length !== 2) {
  throw new Error('Usage: node scripts/check-maintenance.mjs');
}
const report = await auditProjectMaintenance();
await mkdir(absolute('reports/validation'), { recursive: true });
await writeFile(
  absolute('reports/validation/project-maintenance.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(
  `Maintenance: ${report.runtime.reached}/${report.runtime.modules} reachable modules; ${report.docs.documents} documents; ${report.unreferencedAssets.length} unreferenced assets`,
);
if (!report.passed) {
  console.error(
    JSON.stringify(
      {
        links: report.docs.issues,
        unreachable: report.runtime.unreachable,
        assets: report.unreferencedAssets,
        markers: report.ownSourceMarkers,
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
