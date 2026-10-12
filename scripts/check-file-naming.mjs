import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { auditFileNames } from '../tooling/lib/file-naming.mjs';
import { ROOT } from '../config/project.config.mjs';

const report = await auditFileNames();
await writeFile(
  path.join(ROOT, 'reports/validation/file-naming-audit.json'),
  JSON.stringify(report, null, 2) + '\n',
);
if (!report.passed) {
  console.error(report.violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `File naming verified: ${report.checkedFiles} maintained files; fixed ecosystem names and classified artifacts.`,
  );
}
